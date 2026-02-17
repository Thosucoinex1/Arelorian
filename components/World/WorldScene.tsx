
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Cloud, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, Chunk } from '../../store';
import { axiomVertexShader, axiomFragmentShader } from './AxiomShader';
import { Agent, AgentState } from '../../types';
import { generateAgentLore, generateWeaponTexture } from '../../services/geminiService';
import { soundManager } from '../../services/SoundManager';

// Cache to prevent re-generation of the same item texture
const weaponTextureCache: Record<string, THREE.Texture> = {};

// --- Chunked Terrain ---
const TerrainChunk: React.FC<{ chunk: Chunk }> = ({ chunk }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#1a1a1a') }, // Darker base for high contrast
      uColorB: { value: new THREE.Color('#38423b') }, // Mossy High
      uGridColor: { value: new THREE.Color('#4f46e5') },
      uGridSize: { value: 0.02 } // Higher frequency grid
    }),
    []
  );

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[chunk.x * 80, -0.5, chunk.z * 80]}>
      {/* High Resolution Geometry for better displacement */}
      <planeGeometry args={[80, 80, 128, 128]} />
      <shaderMaterial
        vertexShader={axiomVertexShader}
        fragmentShader={axiomFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide} // Fix for backface culling glitch
      />
    </mesh>
  );
};

const InfiniteTerrain = () => {
    const loadedChunks = useStore(state => state.loadedChunks);
    return (
        <group>
            {loadedChunks.map(chunk => (
                <TerrainChunk key={chunk.id} chunk={chunk} />
            ))}
        </group>
    );
}

// --- High-Fidelity Vegetation ---
const VegetationRenderer = () => {
    const vegetation = useStore(state => state.vegetation);
    
    // Performance optimization: Only render if within range (simplified here)
    const trees = useMemo(() => vegetation.filter(v => v.type === 'TREE'), [vegetation]);
    const rocks = useMemo(() => vegetation.filter(v => v.type === 'ROCK'), [vegetation]);

    return (
        <group>
            <Instances range={trees.length}>
                <cylinderGeometry args={[0.2, 0.5, 3]} />
                <meshStandardMaterial color="#3e2723" roughness={0.9} />
                {trees.map((data) => (
                    <group key={data.id} position={new THREE.Vector3(...data.position)} scale={data.scale}>
                         <Instance position={[0, 1.5, 0]} />
                    </group>
                ))}
            </Instances>
            <Instances range={trees.length}>
                <coneGeometry args={[2, 6, 8]} />
                <meshStandardMaterial color="#14532d" roughness={0.7} />
                {trees.map((data) => (
                    <group key={data.id} position={new THREE.Vector3(...data.position)} scale={data.scale}>
                        <Instance position={[0, 4, 0]} />
                    </group>
                ))}
            </Instances>
            <Instances range={rocks.length}>
                <dodecahedronGeometry args={[1, 1]} />
                <meshStandardMaterial color="#57534e" roughness={0.6} flatShading />
                {rocks.map((data) => (
                    <Instance 
                        key={data.id} 
                        position={new THREE.Vector3(...data.position)} 
                        scale={data.scale} 
                        rotation={[data.rotation, data.rotation, data.rotation]} 
                    />
                ))}
            </Instances>
        </group>
    );
};

// --- Procedural Skin Helper ---
const getProceduralMaterials = (id: string) => {
    // Deterministic random based on ID hash
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = (hash % 360) / 360;
    
    // Skin Tone (Humanoid variance)
    const skinTone = new THREE.Color().setHSL(0.08 + (hash % 10)/100, 0.6, 0.4 + (hash % 20)/100);
    
    // Armor Material
    const armorColor = new THREE.Color().setHSL(hue, 0.5, 0.4);
    const metalness = (hash % 100) / 100;
    
    return { skinTone, armorColor, metalness };
};

const HumanoidModel: React.FC<{ agent: Agent; isSelected: boolean }> = ({ agent, isSelected }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { skinTone, armorColor, metalness } = useMemo(() => getProceduralMaterials(agent.id), [agent.id]);
    const textureLoader = useMemo(() => new THREE.TextureLoader(), []);
    
    // Weapon Handling
    const weapon = agent.equipment.mainHand;
    const [weaponTexture, setWeaponTexture] = useState<THREE.Texture | null>(null);
    
    useEffect(() => {
        if (weapon && isSelected) {
            // Check Cache
            if (weaponTextureCache[weapon.id]) {
                setWeaponTexture(weaponTextureCache[weapon.id]);
                return;
            }

            // Generate
            // We use a small timeout to avoid blocking render if this was a heavy op, 
            // though generateWeaponTexture is async.
            generateWeaponTexture(weapon).then(base64 => {
                if (base64) {
                    textureLoader.load(base64, (tex) => {
                        tex.colorSpace = THREE.SRGBColorSpace;
                        weaponTextureCache[weapon.id] = tex;
                        setWeaponTexture(tex);
                    });
                }
            });
        }
    }, [weapon, isSelected, textureLoader]);

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.getElapsedTime();
        const isMoving = agent.state !== AgentState.IDLE;
        
        groupRef.current.position.y = 1 + Math.sin(time * 2) * 0.05; 
        
        // Simple IK-like animation
        const limbAngle = isMoving ? Math.sin(time * 10) * 0.6 : 0;
        groupRef.current.children.forEach((child, i) => {
             if (child.name === 'LeftLeg') child.rotation.x = limbAngle;
             if (child.name === 'RightLeg') child.rotation.x = -limbAngle;
             if (child.name === 'LeftArm') child.rotation.x = -limbAngle;
             if (child.name === 'RightArm') child.rotation.x = limbAngle;
        });
    });

    const isNPC = agent.classType.startsWith('NPC');

    return (
        <group ref={groupRef} rotation={[0, agent.rotationY, 0]}>
             {isNPC && (
                <Html position={[0, 2.5, 0]} center>
                    <div className="text-yellow-400 text-2xl font-bold animate-bounce drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">!</div>
                </Html>
             )}

            {/* Torso */}
            <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.5, 0.7, 0.3]} />
                <meshStandardMaterial color={armorColor} metalness={metalness} roughness={0.4} />
            </mesh>

            {/* Head */}
            <mesh position={[0, 1.3, 0]} castShadow>
                <boxGeometry args={[0.35, 0.35, 0.35]} />
                <meshStandardMaterial color={skinTone} />
            </mesh>

            {/* Arms */}
            <mesh name="LeftArm" position={[-0.4, 0.9, 0]} castShadow>
                 <boxGeometry args={[0.2, 0.7, 0.2]} />
                 <meshStandardMaterial color={armorColor} metalness={metalness} roughness={0.4} />
            </mesh>
            
            {/* Right Arm Group with Weapon */}
            <group name="RightArm" position={[0.4, 0.9, 0]}>
                <mesh position={[0, 0, 0]} castShadow>
                    <boxGeometry args={[0.2, 0.7, 0.2]} />
                    <meshStandardMaterial color={armorColor} metalness={metalness} roughness={0.4} />
                </mesh>
                
                {/* Dynamic Weapon Mesh */}
                {weapon && (
                    <group position={[0, -0.3, 0.2]} rotation={[Math.PI / 3, 0, 0]}>
                        <mesh castShadow>
                            {/* Simple generic shape, texture carries the detail */}
                            <boxGeometry args={[0.1, 1.2, 0.1]} />
                            <meshStandardMaterial 
                                map={weaponTexture} 
                                color={weaponTexture ? '#ffffff' : '#888888'}
                                metalness={0.7} 
                                roughness={0.3} 
                            />
                        </mesh>
                        {/* Glow effect for high rarity */}
                        {(weapon.rarity === 'LEGENDARY' || weapon.rarity === 'EPIC') && (
                             <pointLight distance={1} intensity={1} color={weapon.rarity === 'LEGENDARY' ? 'orange' : 'purple'} />
                        )}
                    </group>
                )}
            </group>

            <mesh name="LeftLeg" position={[-0.15, 0.3, 0]} castShadow>
                <boxGeometry args={[0.22, 0.7, 0.22]} />
                <meshStandardMaterial color="#1f2937" />
            </mesh>
            <mesh name="RightLeg" position={[0.15, 0.3, 0]} castShadow>
                <boxGeometry args={[0.22, 0.7, 0.22]} />
                <meshStandardMaterial color="#1f2937" />
            </mesh>

            {/* Name Tag */}
             <Html position={[0, 2.2, 0]} center distanceFactor={25}>
                <div className="flex flex-col items-center">
                    <div className="text-[10px] font-serif font-bold text-white bg-black/60 px-2 rounded backdrop-blur-md border border-white/20 shadow-lg">
                        {agent.name}
                    </div>
                     <div className="text-[8px] text-axiom-gold font-sans font-bold drop-shadow-md">
                        &lt;{agent.classType}&gt;
                    </div>
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
            <meshBasicMaterial color="black" opacity={0.5} transparent />
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
                // Smooth lerp to target
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
    if (!agent.loreSnippet) {
        const lore = await generateAgentLore(agent);
        updateAgentLore(agent.id, lore);
    }
  };

  return (
    <Canvas shadows camera={{ position: [20, 30, 40], fov: 45 }} dpr={[1, 1.5]}>
      {/* High-Rez Lighting Setup */}
      <color attach="background" args={['#050505']} /> 
      <fog attach="fog" args={['#050505', 40, 180]} />
      
      <GameLoop />
      <CameraController controlsRef={controlsRef} />
      
      <OrbitControls 
        ref={controlsRef}
        maxPolarAngle={Math.PI / 2 - 0.1} 
        enabled={true} 
        autoRotate={false}
        maxDistance={120}
        minDistance={5}
      />
      
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[50, 80, 50]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[4096, 4096]} // High Res Shadows
        shadow-bias={-0.0001}
      >
         <orthographicCamera attach="shadow-camera" args={[-100, 100, 100, -100]} />
      </directionalLight>
      
      <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade />
      <Cloud opacity={0.2} speed={0.1} width={200} depth={5} segments={20} position={[0, 40, 0]} color="#a5b4fc" />
      
      <InfiniteTerrain />
      <VegetationRenderer />
      
      {/* City Center Marker */}
      <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[2, 2, 20]} />
          <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={2} />
      </mesh>
      
      {agents.map((agent) => (
        <AgentMesh 
            key={agent.id} 
            agent={agent} 
            onClick={() => handleAgentClick(agent)} 
        />
      ))}
    </Canvas>
  );
};

export default WorldScene;
