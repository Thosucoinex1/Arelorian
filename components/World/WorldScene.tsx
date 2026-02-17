
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Cloud, Instance, Instances, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, Chunk } from '../../store';
import { axiomVertexShader, axiomFragmentShader } from './AxiomShader';
import { Agent, AgentState, LandParcel, Structure, Item, ResourceNode, ResourceType } from '../../types';
import { generateAgentLore, generateWeaponTexture } from '../../services/geminiService';
import { soundManager } from '../../services/SoundManager';
import { Biome } from '../../utils';

const MobileCameraController = () => {
    const { camera } = useThree();
    const { leftStick, rightStick } = useStore(state => ({
        leftStick: state.leftStick,
        rightStick: state.rightStick,
    }));
    
    const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
    const moveSpeed = 5;
    const lookSpeed = 2;

    useFrame((_, delta) => {
        // Only update if there is input to avoid unnecessary calculations
        if (rightStick.x !== 0 || rightStick.y !== 0) {
            euler.setFromQuaternion(camera.quaternion);
            euler.y -= rightStick.x * lookSpeed * delta;
            euler.x -= rightStick.y * lookSpeed * delta;
            // Clamp vertical rotation to prevent camera flipping
            euler.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, euler.x));
            camera.quaternion.setFromEuler(euler);
        }

        if (leftStick.x !== 0 || leftStick.y !== 0) {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

            const moveDirection = right.multiplyScalar(leftStick.x).add(
                forward.multiplyScalar(-leftStick.y) // Y is inverted from screen coords
            );
            moveDirection.y = 0; // Prevent flying
            moveDirection.normalize();

            camera.position.add(moveDirection.multiplyScalar(moveSpeed * delta));
        }
    });

    return null;
};


// --- Structure Models ---
const HouseModel: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <group position={position}>
        <mesh castShadow position={[0, 0.5, 0]}>
            <boxGeometry args={[1.5, 1, 2]} />
            <meshStandardMaterial color="#374151" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0, 1.25, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.2, 0.5, 4]} />
            <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </mesh>
    </group>
);

const BankModel: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <group position={position}>
        <mesh castShadow position={[0, 0.75, 0]}>
            <boxGeometry args={[2.5, 1.5, 2.5]} />
            <meshStandardMaterial color="#78716c" metalness={0.2} roughness={0.5} />
        </mesh>
         <mesh castShadow position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 1, 4]} />
            <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} emissive="#d97706" emissiveIntensity={0.5} />
        </mesh>
    </group>
);

const Structures: React.FC = () => {
    const landParcels = useStore(state => state.landParcels);
    
    return (
        <group>
            {landParcels.map(parcel => (
                parcel.structures?.map(structure => {
                    const position: [number, number, number] = [parcel.coordinates[0], 0, parcel.coordinates[1]];
                    if (structure.type === 'HOUSE') {
                        return <HouseModel key={structure.id} position={position} />;
                    }
                    if (structure.type === 'BANK') {
                        return <BankModel key={structure.id} position={position} />;
                    }
                    return null;
                })
            ))}
        </group>
    );
};

const BIOME_MAP: Record<Biome, number> = {
    'CITY': 0.0,
    'FOREST': 1.0,
    'MOUNTAIN': 2.0,
    'PLAINS': 3.0,
};

// --- Chunked Terrain ---
const TerrainChunk: React.FC<{ chunk: Chunk, awakeningDensity: number }> = ({ chunk, awakeningDensity }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAwakeningDensity: { value: awakeningDensity },
    uBiome: { value: BIOME_MAP[chunk.biome as Biome] || 3.0 }
  }), [awakeningDensity, chunk.biome]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      material.uniforms.uAwakeningDensity.value = awakeningDensity;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[chunk.x * 80, -0.5, chunk.z * 80]}>
      <planeGeometry args={[80, 80, 128, 128]} />
      <shaderMaterial
        key={chunk.id} // Force re-creation on chunk change
        vertexShader={axiomVertexShader}
        fragmentShader={axiomFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

const InfiniteTerrain = () => {
    const { loadedChunks, agents } = useStore();
    const awakenedAgents = agents.filter(a => a.isAwakened);

    return (
        <group>
            {loadedChunks.map(chunk => {
                const agentsInChunk = awakenedAgents.filter(a => {
                    const dx = a.position[0] - chunk.x * 80;
                    const dz = a.position[2] - chunk.z * 80;
                    return dx >= -40 && dx < 40 && dz >= -40 && dz < 40;
                });
                const density = Math.min(agentsInChunk.length / 5, 1.0); 

                return <TerrainChunk key={chunk.id} chunk={chunk} awakeningDensity={density} />
            })}
        </group>
    );
}

const RESOURCE_COLORS: Record<ResourceType, string> = {
    WOOD: '#855E42',
    STONE: '#808080',
    IRON_ORE: '#A19D94',
    SILVER_ORE: '#D7D7D7',
    GOLD_ORE: '#FFD700',
    SUNLEAF_HERB: '#FACC15',
};

const ResourceNodes: React.FC = () => {
    const nodes = useStore(state => state.resourceNodes);
    
    const woodNodes = useMemo(() => nodes.filter(n => n.type === 'WOOD'), [nodes]);
    const stoneNodes = useMemo(() => nodes.filter(n => n.type === 'STONE'), [nodes]);
    const ironNodes = useMemo(() => nodes.filter(n => n.type === 'IRON_ORE'), [nodes]);
    const silverNodes = useMemo(() => nodes.filter(n => n.type === 'SILVER_ORE'), [nodes]);
    const goldNodes = useMemo(() => nodes.filter(n => n.type === 'GOLD_ORE'), [nodes]);
    const herbNodes = useMemo(() => nodes.filter(n => n.type === 'SUNLEAF_HERB'), [nodes]);

    return (
        <group>
            <Instances>
                <cylinderGeometry args={[0.5, 0.5, 3, 5]} />
                <meshStandardMaterial color={RESOURCE_COLORS.WOOD} />
                {woodNodes.map(node => <Instance key={node.id} position={node.position} />)}
            </Instances>
            <Instances>
                <icosahedronGeometry args={[0.8, 0]} />
                <meshStandardMaterial color={RESOURCE_COLORS.STONE} roughness={0.8} />
                {stoneNodes.map(node => <Instance key={node.id} position={node.position} />)}
            </Instances>
            <Instances>
                <icosahedronGeometry args={[0.6, 0]} />
                <meshStandardMaterial color={RESOURCE_COLORS.IRON_ORE} metalness={0.6} roughness={0.5} />
                {ironNodes.map(node => <Instance key={node.id} position={node.position} />)}
            </Instances>
             <Instances>
                <icosahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial color={RESOURCE_COLORS.SILVER_ORE} metalness={0.9} roughness={0.2} />
                {silverNodes.map(node => <Instance key={node.id} position={node.position} />)}
            </Instances>
            <Instances>
                <coneGeometry args={[0.3, 0.8, 4]} />
                <meshStandardMaterial color={RESOURCE_COLORS.SUNLEAF_HERB} emissive={RESOURCE_COLORS.SUNLEAF_HERB} emissiveIntensity={0.5} />
                {herbNodes.map(node => <Instance key={node.id} position={node.position} />)}
            </Instances>
        </group>
    );
};


// --- Dynamic Weapon Model ---
const WeaponModel: React.FC<{ item: Item }> = ({ item }) => {
    const [textureUrl, setTextureUrl] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;
        const generate = async () => {
            setTextureUrl(null); // Reset texture on item change
            const url = await generateWeaponTexture(item);
            if (!isCancelled) {
                setTextureUrl(url);
            }
        };
        generate();
        return () => { isCancelled = true; };
    }, [item.id]); // Re-generate only when item ID changes

    const texture = useTexture(textureUrl || ''); // useTexture can handle null/empty strings gracefully

    const getWeaponGeometry = () => {
        switch (item.subtype.toLowerCase()) {
            case 'axe':
                return <boxGeometry args={[0.1, 0.8, 0.1]} />;
            case 'sword':
                return <boxGeometry args={[0.05, 1, 0.2]} />;
            case 'staff':
                 return <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />;
            default:
                return <boxGeometry args={[0.1, 0.7, 0.1]} />;
        }
    }
    
    return (
        <mesh position={[0.4, 0.8, 0.2]} rotation={[0, 0, -Math.PI / 4]}>
            {getWeaponGeometry()}
            <meshStandardMaterial
                key={textureUrl} // Force material refresh when texture URL changes
                map={textureUrl ? texture : null} 
                color={!textureUrl ? '#555' : '#fff'}
                metalness={0.6}
                roughness={0.3}
            />
        </mesh>
    );
};

const CreatureModel: React.FC<{ agent: Agent }> = ({ agent }) => {
    const groupRef = useRef<THREE.Group>(null);
    const color = agent.classType === 'Goblin' ? '#22c55e' : '#6b7280';
    
    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.getElapsedTime();
        groupRef.current.position.y = 0.5 + Math.sin(time * 2) * 0.05;
    });

    return (
        <group ref={groupRef} rotation={[0, agent.rotationY, 0]}>
            <mesh castShadow>
                {agent.classType === 'Goblin' ? 
                    <boxGeometry args={[0.6, 1.2, 0.6]} /> :
                    <capsuleGeometry args={[0.4, 0.8, 4, 8]} />
                }
                <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            <Html position={[0, 1.5, 0]} center distanceFactor={25}>
                <div className="text-white bg-red-900/50 px-2 rounded text-xs font-bold">{agent.name}</div>
            </Html>
        </group>
    );
};


// --- Procedural Skin Helper ---
const getProceduralMaterials = (id: string, classType: string) => {
    if (classType === 'Glitch') {
        return { 
            skinTone: new THREE.Color('red'), 
            armorColor: new THREE.Color('black'), 
            metalness: 0.1 
        };
    }
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = (hash % 360) / 360;
    const skinTone = new THREE.Color().setHSL(0.08 + (hash % 10)/100, 0.6, 0.4 + (hash % 20)/100);
    const armorColor = new THREE.Color().setHSL(hue, 0.5, 0.4);
    const metalness = (hash % 100) / 100;
    return { skinTone, armorColor, metalness };
};

const HumanoidModel: React.FC<{ agent: Agent; isSelected: boolean }> = ({ agent, isSelected }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { skinTone, armorColor, metalness } = useMemo(() => getProceduralMaterials(agent.id, agent.classType), [agent.id, agent.classType]);
    
    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.getElapsedTime();
        const isMoving = agent.state !== AgentState.IDLE;
        
        if (agent.faction === 'ANOMALY') {
             groupRef.current.position.y = 1 + Math.sin(time * 50) * 0.2; 
        } else {
             groupRef.current.position.y = 1 + Math.sin(time * 2) * 0.05; 
             const limbAngle = isMoving ? Math.sin(time * 10) * 0.6 : 0;
             groupRef.current.children.forEach((child) => {
                 if (child.name === 'LeftLeg') child.rotation.x = limbAngle;
                 if (child.name === 'RightLeg') child.rotation.x = -limbAngle;
                 if (child.name === 'LeftArm') child.rotation.x = -limbAngle;
                 if (child.name === 'RightArm') child.rotation.x = limbAngle;
            });
        }
    });

    if (agent.faction === 'ANOMALY') {
        return (
            <group ref={groupRef} rotation={[0, agent.rotationY, 0]}>
                <mesh castShadow>
                    <boxGeometry args={[0.8, 1.8, 0.8]} />
                    <meshStandardMaterial color="red" emissive="red" emissiveIntensity={2} roughness={0.9} />
                </mesh>
                <Html position={[0, 2.2, 0]} center distanceFactor={25}>
                    <div className="text-red-500 bg-black/50 px-2 rounded text-xs font-bold">{agent.name}</div>
                </Html>
            </group>
        );
    }

    return (
        <group ref={groupRef} rotation={[0, agent.rotationY, 0]}>
            <mesh position={[0, 0.75, 0]} castShadow receiveShadow><boxGeometry args={[0.5, 0.7, 0.3]} /><meshStandardMaterial color={armorColor} metalness={metalness} roughness={0.4} /></mesh>
            <mesh position={[0, 1.3, 0]} castShadow><boxGeometry args={[0.35, 0.35, 0.35]} /><meshStandardMaterial color={skinTone} /></mesh>
            <mesh name="LeftArm" position={[-0.4, 0.9, 0]} castShadow><boxGeometry args={[0.2, 0.7, 0.2]} /><meshStandardMaterial color={armorColor} metalness={metalness} roughness={0.4} /></mesh>
            <mesh name="RightArm" position={[0.4, 0.9, 0]} castShadow><boxGeometry args={[0.2, 0.7, 0.2]} /><meshStandardMaterial color={armorColor} metalness={metalness} roughness={0.4} /></mesh>
            <mesh name="LeftLeg" position={[-0.15, 0.3, 0]} castShadow><boxGeometry args={[0.22, 0.7, 0.22]} /><meshStandardMaterial color="#1f2937" /></mesh>
            <mesh name="RightLeg" position={[0.15, 0.3, 0]} castShadow><boxGeometry args={[0.22, 0.7, 0.22]} /><meshStandardMaterial color="#1f2937" /></mesh>
            {isSelected && agent.equipment.mainHand && <WeaponModel item={agent.equipment.mainHand} />}
            <Html position={[0, 2.2, 0]} center distanceFactor={25}>
                <div className="flex flex-col items-center">
                    <div className="text-[10px] font-serif font-bold text-white bg-black/60 px-2 rounded backdrop-blur-md border border-white/20 shadow-lg">{agent.name}</div>
                    <div className="text-[8px] text-axiom-gold font-sans font-bold drop-shadow-md">&lt;{agent.classType}&gt;</div>
                </div>
            </Html>
        </group>
    );
}

const AgentMesh: React.FC<{ agent: Agent; onClick: () => void }> = ({ agent, onClick }) => {
  const selectedAgentId = useStore(state => state.selectedAgentId);
  return (
    <group position={agent.position} onClick={(e) => { e.stopPropagation(); onClick(); soundManager.playUI('CLICK'); }}>
        {agent.faction === 'PLAYER' || agent.faction === 'ANOMALY' ?
          <HumanoidModel agent={agent} isSelected={selectedAgentId === agent.id} /> :
          <CreatureModel agent={agent} />
        }
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <circleGeometry args={[0.6, 16]} />
            <meshBasicMaterial color={agent.faction === 'ANOMALY' ? 'red' : agent.faction === 'CREATURE' ? '#dc2626' : 'black'} opacity={0.5} transparent />
        </mesh>
    </group>
  );
};

const GameLoop = () => {
  const updateAgents = useStore((state) => state.updateAgents);
  useFrame((state, delta) => updateAgents(delta));
  return null;
}

const WorldScene = () => {
  const { agents, selectAgent, updateAgentLore, device } = useStore(state => ({
      agents: state.agents,
      selectAgent: state.selectAgent,
      updateAgentLore: state.updateAgentLore,
      device: state.device,
  }));
  const controlsRef = useRef<any>(null);

  const handleAgentClick = async (agent: Agent) => {
    selectAgent(agent.id);
    if (agent.faction === 'PLAYER' && !agent.loreSnippet) {
        const lore = await generateAgentLore(agent);
        updateAgentLore(agent.id, lore);
    }
  };

  return (
    <Canvas shadows camera={{ position: [20, 30, 40], fov: 45 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#050505']} /> 
      <fog attach="fog" args={['#050505', 60, 250]} />
      <GameLoop />
      {device.isMobile ? <MobileCameraController /> : null}
      <OrbitControls ref={controlsRef} enabled={!device.isMobile} autoRotate={false} maxDistance={150} minDistance={5} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[50, 80, 50]} intensity={1.0} castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.0001}>
         <orthographicCamera attach="shadow-camera" args={[-120, 120, 120, -120]} />
      </directionalLight>
      <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade />
      <Cloud opacity={0.2} speed={0.1} width={300} depth={10} segments={20} position={[0, 60, 0]} color="#a5b4fc" />
      <InfiniteTerrain />
      <ResourceNodes />
      <Structures />
      <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[2, 2, 20]} />
          <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={2} />
      </mesh>
      {agents.map((agent) => (
        <AgentMesh key={agent.id} agent={agent} onClick={() => handleAgentClick(agent)} />
      ))}
    </Canvas>
  );
};

export default WorldScene;