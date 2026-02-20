
import { Html, OrbitControls, Sky } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { soundManager } from '../../services/SoundManager';
import { useStore } from '../../store';
import { Agent, AgentState, Chunk, Monster, POI } from '../../types';
import { axiomFragmentShader, axiomVertexShader } from './AxiomShader';

const isPosInSanctuary = (pos: [number, number, number], chunks: Chunk[]) => {
    const chunkX = Math.floor((pos[0] + 40) / 80);
    const chunkZ = Math.floor((pos[2] + 40) / 80);
    const chunk = chunks.find(c => c.x === chunkX && c.z === chunkZ);
    return chunk?.biome === 'CITY';
};

const DynamicSky = () => {
    const serverStats = useStore(state => state.serverStats);
    const threat = serverStats.threatLevel || 0.05;
    const uptime = serverStats.uptime || 0;
    
    // Time of day cycle: 0 to 1
    const dayCycle = (uptime % 300) / 300; 
    const sunPos = new THREE.Vector3().setFromSphericalCoords(
        1,
        Math.PI * (0.1 + dayCycle * 0.8), // Elevation
        Math.PI * 0.5 // Azimuth
    );

    return (
        <Sky 
            distance={450000} 
            sunPosition={sunPos} 
            turbidity={8 + threat * 20} 
            rayleigh={3 + threat * 10} 
            mieCoefficient={0.005 + threat * 0.05} 
            mieDirectionalG={0.8} 
        />
    );
};

const POIMesh: React.FC<{ poi: POI }> = ({ poi }) => {
    const agents = useStore(state => state.agents);
    const chunks = useStore(state => state.loadedChunks);
    const meshRef = useRef<THREE.Group>(null);
    const [isVisible, setIsVisible] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            const time = state.clock.getElapsedTime();
            if (poi.type === 'SHRINE') {
                meshRef.current.position.y = Math.sin(time) * 0.5;
                meshRef.current.rotation.y += 0.01;
            }

            if (isPosInSanctuary(poi.position, chunks)) {
                setIsVisible(true);
                return;
            }

            let visible = false;
            for (const a of agents) {
                const dist = Math.hypot(a.position[0] - poi.position[0], a.position[2] - poi.position[2]);
                if (dist < a.visionRange) {
                    visible = true;
                    break;
                }
            }
            if (visible !== isVisible) setIsVisible(visible);
        }
    });

    const discovered = poi.isDiscovered;
    if (!isVisible && !discovered) return null;

    const getPOIColor = () => {
        switch(poi.type) {
            case 'SHRINE': return '#06b6d4';
            case 'RUIN': return '#d1d5db';
            case 'NEST': return '#ef4444';
            case 'DUNGEON': return '#4b5563';
            case 'MARKET_STALL': return '#f59e0b';
            default: return '#f59e0b';
        }
    };

    return (
        <group position={[poi.position[0], poi.position[1], poi.position[2]]} ref={meshRef}>
            <mesh scale={[isVisible ? 1 : 0.8, isVisible ? 1 : 0.8, isVisible ? 1 : 0.8]}>
                {poi.type === 'MARKET_STALL' && (
                    <mesh castShadow>
                        <boxGeometry args={[3, 1, 3]} />
                        <meshStandardMaterial color={getPOIColor()} />
                    </mesh>
                )}
                {poi.type === 'RUIN' && (
                    <mesh position={[0, 1, 0]} castShadow>
                        <boxGeometry args={[0.5, 2, 0.5]} />
                        <meshStandardMaterial color={getPOIColor()} transparent opacity={isVisible ? 1 : 0.3} />
                    </mesh>
                )}
                {poi.type === 'SHRINE' && (
                    <mesh castShadow>
                        <octahedronGeometry args={[1.2, 0]} />
                        <meshStandardMaterial color={getPOIColor()} emissive={getPOIColor()} emissiveIntensity={isVisible ? 1.5 : 0.5} wireframe />
                    </mesh>
                )}
                <Html position={[0, 3, 0]} center distanceFactor={20}>
                    <div className={`px-2 py-0.5 rounded border ${discovered ? 'bg-axiom-dark/60 border-white/20 text-gray-400' : 'bg-axiom-gold border-axiom-gold text-black animate-pulse'} text-[8px] font-black uppercase tracking-widest ${isVisible ? 'opacity-100' : 'opacity-40'}`}>
                        {discovered ? String(poi.type) : 'SIGNAL DETECTED'}
                    </div>
                </Html>
            </mesh>
        </group>
    );
};

const MonsterMesh: React.FC<{ monster: Monster }> = ({ monster }) => {
    const agents = useStore(state => state.agents);
    const chunks = useStore(state => state.loadedChunks);
    const [isVisible, setIsVisible] = useState(false);

    useFrame(() => {
        if (monster.state === 'DEAD') return;
        if (isPosInSanctuary(monster.position, chunks)) {
            setIsVisible(true);
            return;
        }

        let visible = false;
        for (const a of agents) {
            const dist = Math.hypot(a.position[0] - monster.position[0], a.position[2] - monster.position[2]);
            if (dist < a.visionRange) {
                visible = true;
                break;
            }
        }
        if (visible !== isVisible) setIsVisible(visible);
    });

    if (!isVisible || monster.state === 'DEAD') return null;

    return (
        <group position={[monster.position[0], monster.position[1], monster.position[2]]}>
            <mesh castShadow scale={[monster.scale, monster.scale, monster.scale]} position={[0, monster.scale, 0]}>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color={monster.color} emissive={monster.color} emissiveIntensity={0.5} />
            </mesh>
            <Html position={[0, monster.scale * 2 + 1, 0]} center distanceFactor={15}>
                <div className="flex flex-col items-center gap-1 pointer-events-none">
                    <div className="w-10 h-1 bg-gray-900 rounded overflow-hidden">
                        <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(monster.stats.hp / monster.stats.maxHp * 100).toFixed(0)}%` }} />
                    </div>
                    <div className="text-[8px] bg-red-900/90 text-white px-2 py-0.5 rounded uppercase font-black tracking-widest border border-red-500/50 shadow-lg">
                        {String(monster.name)}
                    </div>
                </div>
            </Html>
        </group>
    );
};

const TerrainChunk: React.FC<{ chunk: Chunk, stability: number }> = ({ chunk, stability }) => {
  const agents = useStore(state => state.agents);
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAwakeningDensity: { value: 1.0 - stability },
    uBiome: { value: chunk.biome === 'CITY' ? 0.0 : chunk.biome === 'FOREST' ? 1.0 : chunk.biome === 'MOUNTAIN' ? 2.0 : 3.0 },
    uFogColor: { value: new THREE.Color('#050505') },
    uFogNear: { value: 80 },
    uFogFar: { value: 350 },
    uAgentPositions: { value: new Array(10).fill(new THREE.Vector3()) },
    uAgentVisionRanges: { value: new Float32Array(10) },
    uExplorationLevel: { value: chunk.explorationLevel || 0.0 }
  }), [chunk.id, chunk.biome, stability]);

  useFrame((state) => { 
    if (meshRef.current) {
        const mat = meshRef.current.material as THREE.ShaderMaterial;
        mat.uniforms.uTime.value = state.clock.getElapsedTime();
        mat.uniforms.uExplorationLevel.value = chunk.explorationLevel;
        const positions = mat.uniforms.uAgentPositions.value;
        const ranges = mat.uniforms.uAgentVisionRanges.value;
        for(let i = 0; i < 10; i++) {
            if (agents[i]) {
                positions[i].set(agents[i].position[0], 0, agents[i].position[2]);
                ranges[i] = agents[i].visionRange;
            } else {
                positions[i].set(0, -999, 0);
                ranges[i] = 0;
            }
        }
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[chunk.x * 80, -0.5, chunk.z * 80]}>
      <planeGeometry args={[80, 80, 64, 64]} />
      <shaderMaterial vertexShader={axiomVertexShader} fragmentShader={axiomFragmentShader} uniforms={uniforms} />
    </mesh>
  );
};

const AgentMesh: React.FC<{ agent: Agent; onSelect: (id: string) => void }> = ({ agent, onSelect }) => {
    const agents = useStore(state => state.agents);
    const chunks = useStore(state => state.loadedChunks);
    const [isVisible, setIsVisible] = useState(false);

    useFrame(() => {
        if (agent.faction === 'PLAYER') {
            setIsVisible(true);
            return;
        }
        if (isPosInSanctuary(agent.position, chunks)) {
            setIsVisible(true);
            return;
        }
        let visible = false;
        for (const a of agents) {
            if (a.id === agent.id) continue;
            const dist = Math.hypot(a.position[0] - agent.position[0], a.position[2] - agent.position[2]);
            if (dist < a.visionRange) {
                visible = true;
                break;
            }
        }
        if (visible !== isVisible) setIsVisible(visible);
    });

    if (!isVisible) return null;

    return (
        <group position={[agent.position[0], agent.position[1], agent.position[2]]} rotation={[0, agent.rotationY, 0]} onClick={(e) => { e.stopPropagation(); onSelect(agent.id); soundManager.playUI('CLICK'); }}>
            <mesh castShadow position={[0, 0.9, 0]}>
                <boxGeometry args={[0.7, 1.8, 0.7]} />
                <meshStandardMaterial color={agent.faction === 'PLAYER' ? '#06b6d4' : '#ef4444'} roughness={0.7} />
            </mesh>
            <Html position={[0, 2.5, 0]} center distanceFactor={20}>
                 <div className="flex flex-col items-center pointer-events-none">
                    <div className="text-white text-[8px] bg-black/60 px-1.5 py-0.5 rounded uppercase font-black tracking-widest border border-white/10 shadow-lg">
                        {String(agent.name)}
                    </div>
                    {agent.state === AgentState.COMBAT && (
                        <div className="text-[6px] text-red-500 font-black animate-pulse mt-0.5 uppercase tracking-tighter bg-black/40 px-1 rounded">COMBAT</div>
                    )}
                 </div>
            </Html>
        </group>
    );
};

const SceneManager = () => {
    const updatePhysics = useStore(state => state.updatePhysics);
    const runCognition = useStore(state => state.runCognition);
    const runSocialInteractions = useStore(state => state.runSocialInteractions);

    useFrame((_state, delta) => updatePhysics(delta));

    useEffect(() => { 
        const i = setInterval(() => {
            runCognition();
            runSocialInteractions();
        }, 8000); 
        return () => clearInterval(i); 
    }, [runCognition, runSocialInteractions]);

    return null;
};

const WorldScene = () => {
    const agents = useStore(state => state.agents);
    const monsters = useStore(state => state.monsters);
    const pois = useStore(state => state.pois);
    const chunks = useStore(state => state.loadedChunks);
    const selectAgent = useStore(state => state.selectAgent);

    return (
        <Canvas shadows camera={{ position: [60, 80, 60], fov: 45 }} dpr={[1, 1.5]}>
            <Suspense fallback={null}>
                <SceneManager />
                <color attach="background" args={['#050505']} /> 
                <OrbitControls maxDistance={300} minDistance={10} enableDamping />
                <ambientLight intensity={0.4} />
                <directionalLight position={[100, 150, 100]} intensity={1.5} castShadow />
                <DynamicSky />
                <group>
                    {chunks.map(c => <TerrainChunk key={c.id} chunk={c} stability={1} />)}
                    {pois.map(p => <POIMesh key={p.id} poi={p} />)}
                    {monsters.map(m => <MonsterMesh key={m.id} monster={m} />)}
                    {agents.map(a => <AgentMesh key={a.id} agent={a} onSelect={selectAgent} />)}
                </group>
            </Suspense>
        </Canvas>
    );
};

export default React.memo(WorldScene);
