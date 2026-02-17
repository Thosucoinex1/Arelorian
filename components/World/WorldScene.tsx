
import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, Chunk } from '../../store';
import { axiomVertexShader, axiomFragmentShader } from './AxiomShader';
import { Agent, StructureType } from '../../types';
import { soundManager } from '../../services/SoundManager';

const SpeechBubble = ({ agentId }: { agentId: string }) => {
    const messages = useStore(state => state.chatMessages);
    const [displayMessage, setDisplayMessage] = useState<string | null>(null);
    const [opacity, setOpacity] = useState(0);
    const lastProcessedId = useRef<string | null>(null);

    useEffect(() => {
        const agentMessages = messages.filter(m => m.senderId === agentId);
        if (agentMessages.length > 0) {
            const latest = agentMessages[agentMessages.length - 1];
            
            if (latest.id !== lastProcessedId.current) {
                lastProcessedId.current = latest.id;
                const age = Date.now() - latest.timestamp;
                
                if (age < 6000) {
                    setDisplayMessage(latest.message);
                    setOpacity(1);
                    
                    // Start fading after 4 seconds
                    const fadeStartTimer = setTimeout(() => {
                        setOpacity(0);
                    }, 4000);
                    
                    // Clean up message after 6 seconds
                    const cleanupTimer = setTimeout(() => {
                        setDisplayMessage(null);
                    }, 6000);
                    
                    return () => {
                        clearTimeout(fadeStartTimer);
                        clearTimeout(cleanupTimer);
                    };
                }
            }
        }
    }, [messages, agentId]);

    if (!displayMessage) return null;

    return (
        <Html position={[0, 3.2, 0]} center distanceFactor={15} zIndexRange={[10, 0]}>
            <div 
                className="flex flex-col items-center pointer-events-none select-none transition-opacity duration-1000 ease-in-out"
                style={{ opacity }}
            >
                <div className="bg-axiom-dark/90 border border-axiom-cyan/40 text-white px-4 py-2 rounded-xl text-[10px] md:text-xs font-medium shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md relative min-w-[80px] max-w-[200px] text-center">
                    {/* Holographic scanning line effect */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl opacity-20 pointer-events-none">
                        <div className="w-full h-1 bg-axiom-cyan animate-[scan_2s_linear_infinite]"></div>
                    </div>
                    
                    {/* Tail */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-axiom-dark/90 border-r border-b border-axiom-cyan/40 rotate-45"></div>
                    
                    <span className="relative z-10 leading-snug">
                        <span className="text-axiom-cyan/60 mr-1 opacity-50">✦</span>
                        {displayMessage}
                    </span>
                </div>
            </div>
        </Html>
    );
};

const DemeterCave: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <group position={position}>
        <mesh position={[0, 1.5, 0]}>
            <coneGeometry args={[4, 5, 4]} />
            <meshStandardMaterial color="#222" roughness={1} />
        </mesh>
        <pointLight color="#0f0" intensity={5} distance={10} position={[0, 0, 3]} />
        <Html position={[0, 5, 0]} center>
            <div className="text-green-500 font-serif text-[10px] font-bold tracking-[0.2em] uppercase bg-black/80 px-2 py-1 border border-green-500/30">Demeter Cave</div>
        </Html>
    </group>
);

const DarkChurch: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <group position={position}>
        <mesh position={[0, 6, 0]}>
            <boxGeometry args={[8, 12, 8]} />
            <meshStandardMaterial color="#111" metalness={0.5} />
        </mesh>
        <mesh position={[0, 13, 0]}>
            <octahedronGeometry args={[2, 0]} />
            <meshStandardMaterial color="black" emissive="red" emissiveIntensity={2} />
        </mesh>
        <pointLight color="red" intensity={10} distance={20} position={[0, 15, 0]} />
        <Html position={[0, 16, 0]} center>
            <div className="text-red-500 font-serif text-[10px] font-bold tracking-[0.2em] uppercase bg-black/80 px-2 py-1 border border-red-500/30">The Dark Church</div>
        </Html>
    </group>
);

const CityStructure: React.FC<{ type: StructureType, position: [number, number, number] }> = ({ type, position }) => (
    <group position={position}>
        <mesh castShadow position={[0, 4, 0]}>
            <boxGeometry args={[6, 8, 6]} />
            <meshStandardMaterial color={type === 'SMITH' ? '#333' : '#1a365d'} metalness={0.8} />
        </mesh>
        <pointLight intensity={3} color={type === 'SMITH' ? '#fb923c' : '#22d3ee'} position={[0, 2, 4]} />
        <Html position={[0, 9, 0]} center>
            <div className="bg-black/90 px-3 py-1 rounded-full border border-white/10 text-[9px] font-serif font-bold text-white whitespace-nowrap uppercase tracking-[0.2em] shadow-lg">
                {type}
            </div>
        </Html>
    </group>
);

const VikingModel: React.FC<{ agent: Agent }> = ({ agent }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (groupRef.current) groupRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.15;
    });
    return (
        <group ref={groupRef}>
            <mesh castShadow>
                <capsuleGeometry args={[0.5, 1, 4, 8]} />
                <meshStandardMaterial color="#050505" roughness={1} />
            </mesh>
            <mesh position={[0.2, 0.7, 0.4]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshBasicMaterial color="#ff0000" />
            </mesh>
            <mesh position={[-0.2, 0.7, 0.4]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshBasicMaterial color="#ff0000" />
            </mesh>
            <Html position={[0, 2.2, 0]} center distanceFactor={25}>
                <div className="text-red-600 bg-black/90 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border border-red-900/50">Dark Viking</div>
            </Html>
        </group>
    );
};

const NPCModel: React.FC<{ agent: Agent }> = ({ agent }) => (
    <group>
        <mesh castShadow>
            <boxGeometry args={[0.9, 2.0, 0.9]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.4} />
        </mesh>
        <Html position={[0, 2.8, 0]} center>
            <div className="text-axiom-gold bg-black/90 px-3 py-1 rounded-lg text-[10px] font-bold border border-axiom-gold/40 tracking-[0.15em] uppercase shadow-md">
                {agent.name}
            </div>
        </Html>
    </group>
);

const TerrainChunk: React.FC<{ chunk: Chunk, threatLevel: number }> = ({ chunk, threatLevel }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAwakeningDensity: { value: threatLevel },
    uBiome: { value: chunk.biome === 'CITY' ? 0.0 : chunk.biome === 'FOREST' ? 1.0 : chunk.biome === 'MOUNTAIN' ? 2.0 : 3.0 }
  }), [chunk.id, chunk.biome, threatLevel]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      material.uniforms.uAwakeningDensity.value = threatLevel;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[chunk.x * 80, -0.5, chunk.z * 80]}>
      <planeGeometry args={[80, 80, 128, 128]} />
      <shaderMaterial vertexShader={axiomVertexShader} fragmentShader={axiomFragmentShader} uniforms={uniforms} transparent={false} />
    </mesh>
  );
};

const AgentMesh: React.FC<{ agent: Agent; onSelect: (id: string) => void }> = ({ agent, onSelect }) => (
    <group 
        position={agent.position} 
        rotation={[0, agent.rotationY, 0]} 
        onClick={(e) => { e.stopPropagation(); onSelect(agent.id); soundManager.playUI('CLICK'); }}
    >
        <SpeechBubble agentId={agent.id} />
        {agent.faction === 'VIKING' ? <VikingModel agent={agent} /> :
         agent.faction === 'NPC' ? <NPCModel agent={agent} /> :
         <mesh castShadow>
             <boxGeometry args={[0.8, 1.8, 0.8]} />
             <meshStandardMaterial color={agent.faction === 'PLAYER' ? '#06b6d4' : '#ef4444'} roughness={0.7} />
         </mesh>
        }
    </group>
);

const GameLoop = () => {
  const updateAgents = useStore(state => state.updateAgents);
  useFrame((state) => {
    updateAgents(state.delta);
  });
  return null;
};

const WorldScene = () => {
  const { agents, selectAgent, serverStats, activeEvents, loadedChunks } = useStore();
  const isRaid = activeEvents.some(e => e.type === 'RAID' && e.active);

  return (
    <Canvas shadows camera={{ position: [50, 60, 70], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
      <Suspense fallback={null}>
        <GameLoop />
        <color attach="background" args={[isRaid ? '#150505' : '#050505']} /> 
        <fog attach="fog" args={[isRaid ? '#200505' : '#050505', 80, 350]} />
        
        <OrbitControls maxDistance={300} minDistance={10} enableDamping dampingFactor={0.05} />
        <ambientLight intensity={isRaid ? 0.6 : 0.2} />
        <directionalLight 
            position={[100, 150, 100]} 
            intensity={isRaid ? 2.5 : 1.2} 
            castShadow 
            shadow-mapSize={[1024, 1024]}
        />
        
        <Stars radius={250} count={6000} factor={4} saturation={0} />
        
        <group>
            {loadedChunks.map(chunk => (
                <TerrainChunk key={chunk.id} chunk={chunk} threatLevel={serverStats.threatLevel} />
            ))}
        </group>

        {/* Start City Sanctuary Structures */}
        <CityStructure type="SMITH" position={[12, 0, -12]} />
        <CityStructure type="MARKET" position={[-12, 0, -12]} />
        <CityStructure type="BANK" position={[0, 0, -18]} />

        {/* Landmarks */}
        <DemeterCave position={[-45, 0, 45]} />
        <DarkChurch position={[60, 0, -60]} />

        {agents.map((agent) => (
          <AgentMesh key={agent.id} agent={agent} onSelect={selectAgent} />
        ))}
      </Suspense>
    </Canvas>
  );
};

export default WorldScene;
