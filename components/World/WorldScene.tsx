
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Cloud, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, Chunk } from '../../store';
import { axiomVertexShader, axiomFragmentShader } from './AxiomShader';
import { Agent, AgentState, LandParcel, Structure } from '../../types';
import { generateAgentLore, generateWeaponTexture } from '../../services/geminiService';
import { soundManager } from '../../services/SoundManager';

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


// --- Chunked Terrain ---
const TerrainChunk: React.FC<{ chunk: Chunk, awakeningDensity: number }> = ({ chunk, awakeningDensity }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAwakeningDensity: { value: awakeningDensity }
  }), [awakeningDensity]); // Dependency added to recreate material if density changes drastically (good practice)

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uAwakeningDensity.value = awakeningDensity;
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
        
        if (agent.classType === 'Glitch') {
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

    if (agent.classType === 'Glitch') {
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
        <HumanoidModel agent={agent} isSelected={selectedAgentId === agent.id} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <circleGeometry args={[0.6, 16]} />
            <meshBasicMaterial color={agent.classType === 'Glitch' ? 'red' : 'black'} opacity={0.5} transparent />
        </mesh>
    </group>
  );
};

const GameLoop = () => {
  const updateAgents = useStore((state) => state.updateAgents);
  useFrame((state, delta) => updateAgents(delta));
  return null;
}

const CameraController = ({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) => {
    const selectedAgentId = useStore(state => state.selectedAgentId);
    const agents = useStore(state => state.agents);

    useFrame(() => {
        if (selectedAgentId && controlsRef.current) {
            const target = agents.find(a => a.id === selectedAgentId);
            if (target) {
                controlsRef.current.target.lerp(new THREE.Vector3(target.position[0], target.position[1], target.position[2]), 0.1);
                controlsRef.current.update();
            }
        }
    });
    return null;
};

const WorldScene = () => {
  const agents = useStore((state) => state.agents);
  const selectAgent = useStore((state) => state.selectAgent);
  const updateAgentLore = useStore((state) => state.updateAgentLore);
  const controlsRef = useRef<any>(null);

  const handleAgentClick = async (agent: Agent) => {
    selectAgent(agent.id);
    if (!agent.loreSnippet && agent.classType !== 'Glitch') {
        const lore = await generateAgentLore(agent);
        updateAgentLore(agent.id, lore);
    }
  };

  return (
    <Canvas shadows camera={{ position: [20, 30, 40], fov: 45 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#050505']} /> 
      <fog attach="fog" args={['#050505', 40, 180]} />
      <GameLoop />
      <CameraController controlsRef={controlsRef} />
      <OrbitControls ref={controlsRef} maxPolarAngle={Math.PI / 2 - 0.1} enabled={true} autoRotate={false} maxDistance={120} minDistance={5} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[50, 80, 50]} intensity={1.0} castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.0001}>
         <orthographicCamera attach="shadow-camera" args={[-100, 100, 100, -100]} />
      </directionalLight>
      <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade />
      <Cloud opacity={0.2} speed={0.1} width={200} depth={5} segments={20} position={[0, 40, 0]} color="#a5b4fc" />
      <InfiniteTerrain />
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
