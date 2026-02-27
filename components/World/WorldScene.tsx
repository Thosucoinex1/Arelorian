
// @ts-nocheck
/// <reference types="@react-three/fiber" />
import { Html, OrbitControls, Sky } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { soundManager } from '../../services/SoundManager';
import { useStore } from '../../store';
import { Agent, AgentState, Chunk, Monster, POI } from '../../types';
import { axiomFragmentShader, axiomVertexShader } from './AxiomShader';
import { createHumanoidModel, type HumanoidAppearance } from './HumanoidModel';
import { AnimationController, createAnimationClips } from './AnimationSystem';
import { attachEquipment } from './EquipmentRenderer';

import { skinHashToColors as skinHashToColorsLocal } from '../../store';

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
    const dayCycle = (uptime % 300) / 300;
    const sunPos = new THREE.Vector3().setFromSphericalCoords(
        1,
        Math.PI * (0.1 + dayCycle * 0.8),
        Math.PI * 0.5
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
    const selectPoi = useStore(state => state.selectPoi);
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
            if (isPosInSanctuary(poi.position, chunks)) { setIsVisible(true); return; }
            let visible = false;
            for (const a of agents) {
                const dist = Math.hypot(a.position[0] - poi.position[0], a.position[2] - poi.position[2]);
                if (dist < a.visionRange) { visible = true; break; }
            }
            if (visible !== isVisible) setIsVisible(visible);
        }
    });

    const discovered = poi.isDiscovered;
    if (!isVisible && !discovered) return null;

    const getPOIColor = () => {
        switch (poi.type) {
            case 'SHRINE': return '#06b6d4';
            case 'RUIN': return '#d1d5db';
            case 'NEST': return '#ef4444';
            case 'DUNGEON': return '#4b5563';
            case 'MARKET_STALL': return '#f59e0b';
            case 'TREE': return '#166534';
            case 'BUILDING': return '#374151';
            default: return '#f59e0b';
        }
    };

    return (
        <group position={[poi.position[0], poi.position[1], poi.position[2]]} ref={meshRef} onClick={(e) => { e.stopPropagation(); selectPoi(poi.id); }}>
            <mesh scale={[isVisible ? 1 : 0.8, isVisible ? 1 : 0.8, isVisible ? 1 : 0.8]}>
                {poi.type === 'MARKET_STALL' && (
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[3, 1, 3]} />
                        <meshStandardMaterial color={getPOIColor()} roughness={0.7} metalness={0.1} />
                    </mesh>
                )}
                {poi.type === 'TREE' && (
                    <group>
                        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                            <cylinderGeometry args={[0.2, 0.4, 3]} />
                            <meshStandardMaterial color="#422006" roughness={0.9} metalness={0} />
                        </mesh>
                        <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
                            <coneGeometry args={[1.5, 3, 8]} />
                            <meshStandardMaterial color={getPOIColor()} roughness={0.8} metalness={0} />
                        </mesh>
                    </group>
                )}
                {poi.type === 'BUILDING' && (
                    <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
                        <boxGeometry args={[4, 5, 4]} />
                        <meshStandardMaterial color={getPOIColor()} roughness={0.6} metalness={0.2} />
                    </mesh>
                )}
                {poi.type === 'RUIN' && (
                    <mesh position={[0, 1, 0]} castShadow>
                        <boxGeometry args={[0.5, 2, 0.5]} />
                        <meshStandardMaterial color={getPOIColor()} transparent opacity={isVisible ? 1 : 0.3} roughness={0.9} metalness={0.05} />
                    </mesh>
                )}
                {poi.type === 'SHRINE' && (
                    <mesh castShadow>
                        <octahedronGeometry args={[1.2, 0]} />
                        <meshStandardMaterial color={getPOIColor()} emissive={getPOIColor()} emissiveIntensity={isVisible ? 1.5 : 0.5} wireframe metalness={0.8} roughness={0.2} />
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
    const selectMonster = useStore(state => state.selectMonster);
    const agents = useStore(state => state.agents);
    const chunks = useStore(state => state.loadedChunks);
    const [isVisible, setIsVisible] = useState(false);

    useFrame(() => {
        if (monster.state === 'DEAD') return;
        if (isPosInSanctuary(monster.position, chunks)) { setIsVisible(true); return; }
        let visible = false;
        for (const a of agents) {
            const dist = Math.hypot(a.position[0] - monster.position[0], a.position[2] - monster.position[2]);
            if (dist < a.visionRange) { visible = true; break; }
        }
        if (visible !== isVisible) setIsVisible(visible);
    });

    if (!isVisible || monster.state === 'DEAD') return null;

    return (
        <group position={[monster.position[0], monster.position[1], monster.position[2]]} onClick={(e) => { e.stopPropagation(); selectMonster(monster.id); }}>
            <mesh castShadow receiveShadow scale={[monster.scale, monster.scale, monster.scale]} position={[0, monster.scale, 0]}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial color={monster.color} emissive={monster.color} emissiveIntensity={0.4} roughness={0.3} metalness={0.6} />
            </mesh>
            <pointLight position={[0, monster.scale + 0.5, 0]} color={monster.color} intensity={0.5} distance={5} />
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
    const debugBiomeEnabled = useStore(state => state.debugBiomeEnabled);
    const debugBiome = useStore(state => state.debugBiome);
    const hoveredChunkId = useStore(state => state.hoveredChunkId);
    const selectedChunkId = useStore(state => state.selectedChunkId);
    const setHoveredChunk = useStore(state => state.setHoveredChunk);
    const setSelectedChunk = useStore(state => state.setSelectedChunk);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uAwakeningDensity: { value: 1.0 - chunk.stabilityIndex },
        uBiome: { value: debugBiomeEnabled ? debugBiome : chunk.biome === 'CITY' ? 0.0 : chunk.biome === 'FOREST' ? 1.0 : chunk.biome === 'MOUNTAIN' ? 2.0 : 3.0 },
        uFogColor: { value: new THREE.Color('#0a0f1a') },
        uFogNear: { value: 100 },
        uFogFar: { value: 500 },
        uAgentPositions: { value: new Array(10).fill(new THREE.Vector3()) },
        uAgentVisionRanges: { value: new Float32Array(10) },
        uExplorationLevel: { value: chunk.explorationLevel || 0.0 },
        uAxiomaticIntensity: { value: chunk.axiomaticData ? 1.0 : 0.0 },
        uStability: { value: chunk.stabilityIndex || 0.0 },
        uCorruption: { value: chunk.corruptionLevel || 0.0 },
        uIsHovered: { value: false },
        uIsSelected: { value: false },
        uCameraPosition: { value: new THREE.Vector3() },
    }), [chunk.id, chunk.biome, chunk.stabilityIndex, chunk.corruptionLevel, chunk.axiomaticData, debugBiomeEnabled, debugBiome]);

    useFrame((state) => {
        if (meshRef.current) {
            const mat = meshRef.current.material as THREE.ShaderMaterial;
            mat.uniforms.uTime.value = state.clock.getElapsedTime();
            mat.uniforms.uExplorationLevel.value = chunk.explorationLevel;
            mat.uniforms.uIsHovered.value = hoveredChunkId === chunk.id;
            mat.uniforms.uIsSelected.value = selectedChunkId === chunk.id;
            mat.uniforms.uCameraPosition.value.copy(state.camera.position);
            const positions = mat.uniforms.uAgentPositions.value;
            const ranges = mat.uniforms.uAgentVisionRanges.value;
            for (let i = 0; i < 10; i++) {
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
        <mesh
            ref={meshRef}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[chunk.x * 80, -0.5, chunk.z * 80]}
            receiveShadow
            onPointerEnter={() => setHoveredChunk(chunk.id)}
            onPointerLeave={() => setHoveredChunk(null)}
            onClick={() => setSelectedChunk(chunk.id)}
        >
            <planeGeometry args={[80, 80, 64, 64]} />
            <shaderMaterial vertexShader={axiomVertexShader} fragmentShader={axiomFragmentShader} uniforms={uniforms} />
        </mesh>
    );
};

const AxiomaticDataField: React.FC<{ chunk: Chunk }> = ({ chunk }) => {
    const showOverlay = useStore(state => state.emergenceSettings.showAxiomaticOverlay);
    if (!showOverlay) return null;

    return (
        <group position={[chunk.x * 80, 2, chunk.z * 80]}>
            {chunk.axiomaticData?.map((row, i) =>
                row.map((val, j) => val > 0.7 ? (
                    <mesh key={`${i}-${j}`} position={[i * 10 - 35, val * 2, j * 10 - 35]}>
                        <boxGeometry args={[0.2, 0.2, 0.2]} />
                        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} transparent opacity={0.6} />
                    </mesh>
                ) : null)
            )}
            {chunk.logicField?.map((row, i) =>
                row.map((force, j) => (
                    <group key={`force-${i}-${j}`} position={[i * 10 - 35, 0.1, j * 10 - 35]} rotation={[0, Math.atan2(force.vx, force.vz), 0]}>
                        <mesh>
                            <boxGeometry args={[0.05, 0.05, 1.5]} />
                            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} transparent opacity={0.2} />
                        </mesh>
                        <mesh position={[0, 0, 0.75]}>
                            <coneGeometry args={[0.15, 0.3, 4]} rotation={[Math.PI / 2, 0, 0]} />
                            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={1} transparent opacity={0.4} />
                        </mesh>
                    </group>
                ))
            )}
            {chunk.logicString && (
                <Html position={[0, 10, 0]} center>
                    <div className="text-[6px] font-mono text-axiom-cyan bg-black/80 px-2 py-1 rounded border border-axiom-cyan/30 whitespace-nowrap">
                        LOGIC_FIELD: {chunk.logicString}
                    </div>
                </Html>
            )}
        </group>
    );
};

const HumanoidAgentMesh: React.FC<{ agent: Agent; onSelect: (id: string) => void }> = ({ agent, onSelect }) => {
    const agents = useStore(state => state.agents);
    const chunks = useStore(state => state.loadedChunks);
    const [isVisible, setIsVisible] = useState(false);
    const groupRef = useRef<THREE.Group>(null);
    const modelRef = useRef<{ group: THREE.Group; controller: AnimationController | null; lastState: AgentState | null }>({ group: null as any, controller: null, lastState: null });
    const [modelReady, setModelReady] = useState(false);

    const skinColors = useMemo(() => {
        if (agent.id.startsWith('imported_') && agent.dna?.hash) {
            return skinHashToColorsLocal(agent.dna.hash);
        }
        return null;
    }, [agent.id, agent.dna?.hash]);

    const appearance: HumanoidAppearance = useMemo(() => {
        if (agent.appearance_json) {
            return {
                skinTone: agent.appearance_json.skinTone || '#d1a37c',
                hairStyle: agent.appearance_json.hairStyle || 'short',
                bodyScale: agent.appearance_json.bodyScale || 1.0
            };
        }
        const skinTone = skinColors ? skinColors.primary : (agent.faction === 'PLAYER' ? '#c9a26b' : '#b87a5e');
        return { skinTone, hairStyle: 'short' as const, bodyScale: 1.0 };
    }, [agent.appearance_json, skinColors, agent.faction]);

    useEffect(() => {
        if (!groupRef.current) return;

        try {
            const model = createHumanoidModel(appearance);
            groupRef.current.add(model.group);
            modelRef.current.group = model.group;

            const clips = createAnimationClips(model.bones);
            const controller = new AnimationController(model.mesh, clips);
            modelRef.current.controller = controller;

            if (agent.equipment) {
                try {
                    attachEquipment(model.group, agent.equipment);
                } catch (e) {}
            }

            setModelReady(true);

            return () => {
                controller.dispose();
                if (groupRef.current && model.group.parent === groupRef.current) {
                    groupRef.current.remove(model.group);
                }
                model.group.traverse((child: any) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                        else child.material.dispose();
                    }
                });
            };
        } catch (e) {
            console.warn('Failed to create humanoid model for', agent.name, e);
        }
    }, [agent.id, appearance.skinTone, appearance.hairStyle, appearance.bodyScale]);

    useFrame((_state, delta) => {
        if (agent.faction === 'PLAYER') { setIsVisible(true); }
        else if (isPosInSanctuary(agent.position, chunks)) { setIsVisible(true); }
        else {
            let visible = false;
            for (const a of agents) {
                if (a.id === agent.id) continue;
                const dist = Math.hypot(a.position[0] - agent.position[0], a.position[2] - agent.position[2]);
                if (dist < a.visionRange) { visible = true; break; }
            }
            if (visible !== isVisible) setIsVisible(visible);
        }

        if (modelRef.current.controller) {
            modelRef.current.controller.update(delta);

            if (modelRef.current.lastState !== agent.state) {
                modelRef.current.controller.playForState(agent.state);
                modelRef.current.lastState = agent.state;
            }
        }
    });

    if (!isVisible) return null;

    const isImported = agent.id.startsWith('imported_');

    return (
        <group
            ref={groupRef}
            position={[agent.position[0], agent.position[1], agent.position[2]]}
            rotation={[0, agent.rotationY, 0]}
            onClick={(e) => { e.stopPropagation(); onSelect(agent.id); soundManager.playUI('CLICK'); }}
            castShadow
        >
            <Html position={[0, 2.4, 0]} center distanceFactor={20}>
                <div className="flex flex-col items-center pointer-events-none">
                    <div className={`text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest border shadow-lg ${isImported ? 'bg-purple-900/70 border-purple-500/30' : 'bg-black/60 border-white/10'}`}>
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

const ThirdPersonCamera = () => {
    const controlledAgentId = useStore(state => state.controlledAgentId);
    const agents = useStore(state => state.agents);
    const controlsRef = useRef<any>(null);

    useFrame((state) => {
        if (!controlledAgentId) return;
        const agent = agents.find(a => a.id === controlledAgentId);
        if (!agent) return;

        const targetPos = new THREE.Vector3(agent.position[0], agent.position[1] + 2, agent.position[2]);
        const camOffset = new THREE.Vector3(0, 12, 20);
        const desiredCamPos = targetPos.clone().add(camOffset);

        state.camera.position.lerp(desiredCamPos, 0.05);
        state.camera.lookAt(targetPos);

        if (controlsRef.current) {
            controlsRef.current.target.lerp(targetPos, 0.1);
        }
    });

    return (
        <OrbitControls
            ref={controlsRef}
            maxDistance={controlledAgentId ? 30 : 120}
            minDistance={controlledAgentId ? 5 : 10}
            maxPolarAngle={Math.PI / 2.1}
            enableDamping
            enablePan={!controlledAgentId}
        />
    );
};

const SceneLighting = () => {
    const directionalRef = useRef<THREE.DirectionalLight>(null);

    useEffect(() => {
        if (directionalRef.current) {
            const light = directionalRef.current;
            light.shadow.mapSize.width = 2048;
            light.shadow.mapSize.height = 2048;
            light.shadow.camera.near = 0.5;
            light.shadow.camera.far = 500;
            light.shadow.camera.left = -100;
            light.shadow.camera.right = 100;
            light.shadow.camera.top = 100;
            light.shadow.camera.bottom = -100;
            light.shadow.bias = -0.001;
            light.shadow.normalBias = 0.02;
        }
    }, []);

    return (
        <>
            <ambientLight intensity={0.3} color="#b0c4de" />
            <hemisphereLight args={['#87CEEB', '#362312', 0.4]} />
            <directionalLight
                ref={directionalRef}
                position={[100, 150, 100]}
                intensity={1.8}
                castShadow
                color="#fff5e6"
            />
            <fog attach="fog" args={['#0a0f1a', 100, 500]} />
        </>
    );
};

const WorldScene = () => {
    const agents = useStore(state => state.agents);
    const monsters = useStore(state => state.monsters);
    const pois = useStore(state => state.pois);
    const chunks = useStore(state => state.loadedChunks);
    const selectAgent = useStore(state => state.selectAgent);
    const emergenceSettings = useStore(state => state.emergenceSettings);
    const generateAxiomaticChunk = useStore(state => state.generateAxiomaticChunk);

    useEffect(() => {
        if (!emergenceSettings.physicsBasedActivation || !emergenceSettings.axiomaticWorldGeneration) return;

        const interval = setInterval(() => {
            for (const agent of agents) {
                const currentChunkX = Math.floor((agent.position[0] + 40) / 80);
                const currentChunkZ = Math.floor((agent.position[2] + 40) / 80);

                for (let dx = -1; dx <= 1; dx++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        const tx = currentChunkX + dx;
                        const tz = currentChunkZ + dz;
                        const exists = chunks.some(c => c.x === tx && c.z === tz);
                        if (!exists) {
                            generateAxiomaticChunk(tx, tz);
                        }
                    }
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [agents, chunks, emergenceSettings, generateAxiomaticChunk]);

    return (
        <Canvas
            shadows
            camera={{ position: [60, 80, 60], fov: 45 }}
            dpr={[1, 1.5]}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.2,
                outputColorSpace: THREE.SRGBColorSpace,
            }}
        >
            <Suspense fallback={null}>
                <SceneManager />
                <color attach="background" args={['#0a0f1a']} />
                <ThirdPersonCamera />
                <SceneLighting />
                <DynamicSky />
                <group>
                    {chunks.map(c => (
                        <React.Fragment key={c.id}>
                            <TerrainChunk chunk={c} stability={c.stabilityIndex} />
                            <AxiomaticDataField chunk={c} />
                        </React.Fragment>
                    ))}
                    {pois.map(p => <POIMesh key={p.id} poi={p} />)}
                    {monsters.map(m => <MonsterMesh key={m.id} monster={m} />)}
                    {agents.map(a => <HumanoidAgentMesh key={a.id} agent={a} onSelect={selectAgent} />)}
                </group>
            </Suspense>
        </Canvas>
    );
};

export default React.memo(WorldScene);
