
import { Html, OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree, ThreeElements } from '@react-three/fiber';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { soundManager } from '../../services/SoundManager';
import { useStore } from '../../store';
import { Agent, AgentState, Chunk, LandParcel, Monster, ResourceNode, StructureType } from '../../types';
import { axiomFragmentShader, axiomVertexShader } from './AxiomShader';

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {
        group: any;
        mesh: any;
        boxGeometry: any;
        meshStandardMaterial: any;
        coneGeometry: any;
        pointLight: any;
        dodecahedronGeometry: any;
        octahedronGeometry: any;
        ringGeometry: any;
        sphereGeometry: any;
        meshBasicMaterial: any;
        planeGeometry: any;
        shaderMaterial: any;
        ambientLight: any;
        directionalLight: any;
        color: any;
        fog: any;
        [elemName: string]: any;
      }
    }
  }
}

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
                setDisplayMessage(String(latest.message || ""));
                setOpacity(1);
                setTimeout(() => setOpacity(0), 4000);
                setTimeout(() => setDisplayMessage(null), 6000);
            }
        }
    }, [messages, agentId]);

    if (!displayMessage) return null;

    return (
        <group position={[0, 3.2, 0]}>
            <Html center distanceFactor={15} zIndexRange={[100, 0]}>
                <div className="bg-axiom-dark/90 border border-axiom-cyan/40 text-white px-4 py-2 rounded-xl text-[10px] md:text-xs font-medium shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md relative text-center transition-opacity duration-1000" style={{ opacity }}>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-axiom-dark/90 border-r border-b border-axiom-cyan/40 rotate-45"></div>
                    {String(displayMessage)}
                </div>
            </Html>
        </group>
    );
};

const ResourceNodeMesh: React.FC<{ node: ResourceNode }> = ({ node }) => {
    const agents = useStore(state => state.agents);
    const [isNear, setIsNear] = useState(false);

    useFrame(() => {
        let near = false;
        for (const agent of agents) {
            const dist = Math.hypot(agent.position[0] - node.position[0], agent.position[2] - node.position[2]);
            if (dist < 10) {
                near = true;
                break;
            }
        }
        if (near !== isNear) setIsNear(near);
    });

    const getColor = () => {
        switch(node.type) {
            case 'WOOD': return '#5d4037';
            case 'STONE': return '#757575';
            case 'IRON_ORE': return '#455a64';
            case 'GOLD_ORE': return '#ffd700';
            case 'DIAMOND': return '#00bcd4';
            default: return '#8bc34a';
        }
    };

    const getGeometry = () => {
        if (node.type === 'WOOD') return <boxGeometry args={[1, 4, 1]} />;
        if (node.type === 'DIAMOND') return <octahedronGeometry args={[1, 0]} />;
        return <dodecahedronGeometry args={[1.5, 0]} />;
    };

    if (node.amount <= 0) return null;

    return (
        <group position={node.position}>
            <mesh castShadow position={[0, node.type === 'WOOD' ? 2 : 1, 0]}>
                {getGeometry()}
                <meshStandardMaterial color={getColor()} roughness={0.7} emissive={getColor()} emissiveIntensity={node.type === 'DIAMOND' ? 0.5 : 0.1} />
            </mesh>
            {isNear && (
                <Html position={[0, 4, 0]} center distanceFactor={15}>
                    <div className="bg-axiom-dark/80 border border-axiom-gold/40 text-white px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest shadow-lg backdrop-blur-sm flex flex-col items-center gap-1">
                        <span className="text-axiom-gold">{String(node.type)} Source</span>
                        <div className="flex items-center gap-1">
                            <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-axiom-cyan transition-all" style={{ width: `${(node.amount / 50) * 100}%` }} />
                            </div>
                            <span className="text-gray-400 font-mono">{String(node.amount)}u</span>
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
};

const DemeterCave: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <group position={position}>
        <mesh position={[0, 2, 0]} castShadow>
            <coneGeometry args={[5, 8, 6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
        <pointLight color="#10b981" intensity={5} distance={15} position={[0, 2, 3]} />
        <mesh position={[2, 0, 2]} rotation={[0, 0.5, 0]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#059669" emissive="#059669" emissiveIntensity={0.5} />
        </mesh>
        <Html position={[0, 7, 0]} center distanceFactor={30}>
            <div className="text-green-500 font-serif text-[10px] font-bold tracking-[0.2em] uppercase bg-black/80 px-2 py-1 border border-green-500/30 whitespace-nowrap">
                {String("Demeter Cave (Lvl 20)")}
            </div>
        </Html>
    </group>
);

const DarkChurch: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <group position={position}>
        <mesh position={[0, 5, 0]} castShadow>
            <boxGeometry args={[10, 10, 10]} />
            <meshStandardMaterial color="#0f0f10" metalness={0.6} roughness={0.2} />
        </mesh>
        <mesh position={[0, 14, 0]} castShadow>
            <octahedronGeometry args={[3, 0]} />
            <meshStandardMaterial color="#000" emissive="#7f1d1d" emissiveIntensity={2} />
        </mesh>
        <pointLight color="#ef4444" intensity={8} distance={25} position={[0, 12, 0]} />
        <Html position={[0, 18, 0]} center distanceFactor={40}>
            <div className="text-red-500 font-serif text-[10px] font-bold tracking-[0.2em] uppercase bg-black/80 px-2 py-1 border border-red-500/30 whitespace-nowrap">
                {String("Dark Church (Hellgate)")}
            </div>
        </Html>
    </group>
);

const CityStructure: React.FC<{ type: StructureType, position: [number, number, number], name?: string }> = ({ type, position, name }) => {
    const color = type === 'SMITH' ? '#d97706' : type === 'BANK' ? '#06b6d4' : type === 'HOUSE' ? '#8b5cf6' : '#6366f1';
    
    if (type === 'HOUSE') {
        return (
            <group position={position}>
                 <mesh castShadow position={[0, 1.5, 0]}>
                    <boxGeometry args={[3, 3, 3]} />
                    <meshStandardMaterial color="#444" />
                 </mesh>
                 <mesh position={[0, 4, 0]} rotation={[0, Math.PI/4, 0]}>
                     <coneGeometry args={[2.5, 2, 4]} />
                     <meshStandardMaterial color={color} />
                 </mesh>
                 {name && (
                    <Html position={[0, 6, 0]} center distanceFactor={25}>
                        <div className="bg-black/80 px-2 py-0.5 rounded border border-purple-500/30 text-[8px] font-sans text-purple-200 whitespace-nowrap">
                            {String(name)}
                        </div>
                    </Html>
                 )}
            </group>
        )
    }

    return (
        <group position={position}>
            <mesh castShadow position={[0, 3, 0]}>
                <boxGeometry args={[5, 6, 5]} />
                <meshStandardMaterial color="#222" metalness={0.5} />
            </mesh>
            <mesh position={[0, 7, 0]}>
                <coneGeometry args={[3.5, 3, 4]} />
                <meshStandardMaterial color={color} />
            </mesh>
            <Html position={[0, 9, 0]} center distanceFactor={25}>
                <div className="bg-black/90 px-2 py-1 rounded border border-white/10 text-[8px] font-serif font-bold text-white whitespace-nowrap uppercase tracking-widest shadow-lg">
                    {String(type)}
                </div>
            </Html>
        </group>
    );
};

const ParcelMarker: React.FC<{ parcel: LandParcel }> = ({ parcel }) => {
    if (!parcel.ownerId) {
        return (
             <group position={parcel.position}>
                <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.1, 0]}>
                    <ringGeometry args={[1.5, 1.8, 4]} />
                    <meshBasicMaterial color="#333" />
                </mesh>
             </group>
        );
    }
    
    const hasStructure = parcel.structures.length > 0;
    
    return (
        <group>
            {hasStructure ? (
                <CityStructure type="HOUSE" position={parcel.position} name={String(parcel.name)} />
            ) : (
                <group position={parcel.position}>
                    <mesh position={[0, 0.5, 0]}>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial color="#8b5cf6" wireframe />
                    </mesh>
                    <Html position={[0, 2, 0]} center distanceFactor={20}>
                        <div className="text-[8px] text-purple-400 bg-black/50 px-1 rounded">{String("CLAIMED")}</div>
                    </Html>
                </group>
            )}
        </group>
    );
};

const TerrainChunk: React.FC<{ chunk: Chunk, stability: number }> = ({ chunk, stability }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAwakeningDensity: { value: 1.0 - stability },
    uBiome: { value: chunk.biome === 'CITY' ? 0.0 : chunk.biome === 'FOREST' ? 1.0 : chunk.biome === 'MOUNTAIN' ? 2.0 : 3.0 },
    uFogColor: { value: new THREE.Color('#050505') },
    uFogNear: { value: 80 },
    uFogNearValue: 80,
    uFogFar: { value: 350 },
    uFogFarValue: 350
  }), [chunk.id, stability]);

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[chunk.x * 80, -0.5, chunk.z * 80]}>
      <planeGeometry args={[80, 80, 128, 128]} />
      <shaderMaterial vertexShader={axiomVertexShader} fragmentShader={axiomFragmentShader} uniforms={uniforms} />
    </mesh>
  );
};

const MonsterMesh: React.FC<{ monster: Monster }> = ({ monster }) => {
    if (monster.state === 'DEAD') return null;

    return (
        <group position={monster.position} rotation={[0, monster.rotationY, 0]}>
            <mesh castShadow position={[0, monster.scale / 2, 0]}>
                <sphereGeometry args={[monster.scale, 16, 16]} />
                <meshStandardMaterial color={monster.color} roughness={0.8} />
            </mesh>
            <mesh position={[monster.scale * 0.4, monster.scale * 0.5, monster.scale * 0.8]}>
                <sphereGeometry args={[monster.scale * 0.2, 8, 8]} />
                <meshStandardMaterial color="red" emissive="red" emissiveIntensity={1} />
            </mesh>
            <mesh position={[-monster.scale * 0.4, monster.scale * 0.5, monster.scale * 0.8]}>
                <sphereGeometry args={[monster.scale * 0.2, 8, 8]} />
                <meshStandardMaterial color="red" emissive="red" emissiveIntensity={1} />
            </mesh>
            <Html position={[0, monster.scale * 2, 0]} center distanceFactor={15}>
                 <div className="w-12 h-1 bg-gray-800 border border-black">
                     <div 
                        className="h-full bg-red-600 transition-all duration-200" 
                        style={{ width: `${String(((monster.stats.hp / (monster.stats.maxHp || 1)) * 100).toFixed(0))}%` }}
                     />
                 </div>
            </Html>
        </group>
    );
};

const AgentMesh: React.FC<{ agent: Agent; onSelect: (id: string) => void }> = ({ agent, onSelect }) => {
    const isPlayer = agent.faction === 'PLAYER';
    const hasAlliance = !!agent.alliedId;

    return (
        <group position={agent.position} rotation={[0, agent.rotationY, 0]} onClick={(e) => { e.stopPropagation(); onSelect(agent.id); soundManager.playUI('CLICK'); }}>
            <SpeechBubble agentId={agent.id} />
            <mesh castShadow position={[0, agent.state === AgentState.MOUNTED ? 1.5 : 0.9, 0]}>
                <boxGeometry args={[0.8, 1.8, 0.8]} />
                <meshStandardMaterial color={isPlayer ? '#06b6d4' : '#ef4444'} roughness={0.7} emissive={isPlayer ? '#06b6d4' : '#000'} emissiveIntensity={0.2} />
            </mesh>
            {hasAlliance && (
                <mesh position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[1, 1.2, 32]} />
                    <meshBasicMaterial color="#d97706" transparent opacity={0.3} side={THREE.DoubleSide} />
                </mesh>
            )}
            {agent.state === AgentState.MOUNTED && (
                <mesh position={[0, 0.5, 0.2]} castShadow>
                    <boxGeometry args={[1, 1, 2]} />
                    <meshStandardMaterial color="#5d4037" />
                </mesh>
            )}
            <Html position={[0, agent.state === AgentState.MOUNTED ? 3.5 : 2.5, 0]} center distanceFactor={20}>
                 <div className={`${isPlayer ? 'text-axiom-cyan' : 'text-red-500'} text-[8px] font-bold uppercase tracking-wider bg-black/50 px-1 rounded backdrop-blur-sm whitespace-nowrap`}>
                    {String(agent.name)} {hasAlliance ? String('🤝') : ''}
                 </div>
            </Html>
        </group>
    );
};

const CameraController = () => {
    const controlsRef = useRef<any>(null);
    const cameraTarget = useStore(state => state.cameraTarget);
    const setCameraTarget = useStore(state => state.setCameraTarget);
    const camera = useThree(state => state.camera);

    useFrame((_state, delta) => {
        if (cameraTarget && controlsRef.current) {
            const targetVec = new THREE.Vector3(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
            controlsRef.current.target.lerp(targetVec, 5 * delta);
            const dist = camera.position.distanceTo(targetVec);
            if (dist > 100) {
               const dir = new THREE.Vector3(0, 0, 0).subVectors(camera.position, targetVec).normalize();
               const idealPos = new THREE.Vector3().copy(targetVec).add(dir.multiplyScalar(60));
               camera.position.lerp(idealPos, 2 * delta);
            }
            if (controlsRef.current.target.distanceTo(targetVec) < 0.1) {
                setCameraTarget(null);
            }
        }
    });

    return (
        <OrbitControls 
            ref={controlsRef}
            maxDistance={300} 
            minDistance={10} 
            enableDamping 
            dampingFactor={0.05} 
        />
    );
}

const GameLoop = () => {
    const updatePhysics = useStore(state => state.updatePhysics);
    const runCognition = useStore(state => state.runCognition);
    
    useFrame((_state, delta) => {
        updatePhysics(delta);
    });

    useEffect(() => {
        const interval = setInterval(() => {
            runCognition();
        }, 5000);
        return () => clearInterval(interval);
    }, [runCognition]);

    return null;
};

const SceneContent = () => {
    const agents = useStore(state => state.agents);
    const monsters = useStore(state => state.monsters);
    const resourceNodes = useStore(state => state.resourceNodes);
    const loadedChunks = useStore(state => state.loadedChunks);
    const stability = useStore(state => state.stability);
    const landParcels = useStore(state => state.landParcels);
    const selectAgent = useStore(state => state.selectAgent);

    return (
        <Suspense fallback={null}>
            <GameLoop />
            <color attach="background" args={['#050505']} /> 
            <fog attach="fog" args={['#050505', 80, 350]} />
            <CameraController />
            <ambientLight intensity={0.4} />
            <directionalLight position={[100, 150, 100]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
            <Stars radius={300} count={6000} factor={4} fade speed={1} />
            <group>
                {loadedChunks.map(chunk => (
                    <TerrainChunk key={chunk.id} chunk={chunk} stability={stability} />
                ))}
                <group>
                    <CityStructure type="SMITH" position={[12, 0, -12]} />
                    <CityStructure type="MARKET" position={[-12, 0, -12]} />
                    <CityStructure type="BANK" position={[0, 0, -18]} />
                    <DemeterCave position={[-45, 0, 45]} />
                    <DarkChurch position={[60, 0, -60]} />
                </group>
                <group>
                    {landParcels.map(parcel => (
                        <ParcelMarker key={parcel.id} parcel={parcel} />
                    ))}
                </group>
                <group>
                    {resourceNodes.map(node => (
                        <ResourceNodeMesh key={node.id} node={node} />
                    ))}
                </group>
            </group>
            {monsters.map((monster) => (
                <MonsterMesh key={monster.id} monster={monster} />
            ))}
            {agents.map((agent) => (
              <AgentMesh key={agent.id} agent={agent} onSelect={selectAgent} />
            ))}
        </Suspense>
    );
};

const WorldScene = () => {
  return (
    <Canvas 
      shadows 
      camera={{ position: [60, 80, 60], fov: 45 }} 
      dpr={[1, 1.5]}
    >
        <SceneContent />
    </Canvas>
  );
};

export default React.memo(WorldScene);
