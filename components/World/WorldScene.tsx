
import { Html, OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree, ThreeElements } from '@react-three/fiber';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { soundManager } from '../../services/SoundManager';
import { useStore } from '../../store';
import { Agent, AgentState, Chunk, LandParcel, Monster, ResourceNode, StructureType } from '../../types';
import { axiomFragmentShader, axiomVertexShader } from './AxiomShader';

const GatherEffect = ({ agentId, nodeId }: { agentId: string, nodeId: string }) => {
    const agents = useStore(state => state.agents);
    const nodes = useStore(state => state.resourceNodes);
    const pointsRef = useRef<THREE.Points>(null);
    const agent = agents.find(a => a.id === agentId);
    const node = nodes.find(n => n.id === nodeId);
    const particlesCount = 30;
    const positions = useMemo(() => new Float32Array(particlesCount * 3), []);

    useFrame((state) => {
        if (!pointsRef.current || !agent || !node) return;
        const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < particlesCount; i++) {
            const i3 = i * 3;
            if (positions[i3] === 0 && positions[i3+1] === 0 && positions[i3+2] === 0) {
                positions[i3] = node.position[0] + (Math.random() - 0.5) * 2;
                positions[i3+1] = node.position[1] + 1 + (Math.random() - 0.5) * 2;
                positions[i3+2] = node.position[2] + (Math.random() - 0.5) * 2;
            }
            const targetX = agent.position[0];
            const targetY = agent.position[1] + 1.5;
            const targetZ = agent.position[2];
            positions[i3] += (targetX - positions[i3]) * 0.05;
            positions[i3+1] += (targetY - positions[i3+1]) * 0.05;
            positions[i3+2] += (targetZ - positions[i3+2]) * 0.05;
            const dist = Math.hypot(positions[i3] - targetX, positions[i3+1] - targetY, positions[i3+2] - targetZ);
            if (dist < 0.2) {
                positions[i3] = node.position[0];
                positions[i3+1] = node.position[1] + 1;
                positions[i3+2] = node.position[2];
            }
            attr.setXYZ(i, positions[i3], positions[i3+1], positions[i3+2]);
        }
        attr.needsUpdate = true;
    });

    if (!agent || !node || agent.state !== AgentState.GATHERING) return null;

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={particlesCount} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.15} color="#06b6d4" transparent opacity={0.6} />
        </points>
    );
};

const SpeechBubble = ({ agentId }: { agentId: string }) => {
    const messages = useStore(state => state.chatMessages);
    const [displayMessage, setDisplayMessage] = useState<string | null>(null);
    const [opacity, setOpacity] = useState(0);
    const lastId = useRef<string | null>(null);

    useEffect(() => {
        const agentMessages = messages.filter(m => m.senderId === agentId && m.channel !== 'THOUGHT');
        if (agentMessages.length > 0) {
            const latest = agentMessages[agentMessages.length - 1];
            if (latest.id !== lastId.current) {
                lastId.current = latest.id;
                setDisplayMessage(latest.message);
                setOpacity(1);
                setTimeout(() => setOpacity(0), 4000);
                setTimeout(() => setDisplayMessage(null), 6000);
            }
        }
    }, [messages, agentId]);

    if (!displayMessage) return null;

    return (
        <group position={[0, 3.5, 0]}>
            <Html center distanceFactor={15} zIndexRange={[100, 0]}>
                <div className="bg-axiom-dark/95 border border-axiom-cyan/40 text-white px-3 py-1.5 rounded-lg text-[9px] shadow-lg backdrop-blur-md relative transition-opacity duration-1000" style={{ opacity }}>
                    {displayMessage}
                </div>
            </Html>
        </group>
    );
};

const ResourceNodeMesh: React.FC<{ node: ResourceNode }> = ({ node }) => {
    const agents = useStore(state => state.agents);
    const meshRef = useRef<THREE.Mesh>(null);
    const [gatherer, setGatherer] = useState<string | null>(null);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        let current: string | null = null;
        for (const a of agents) {
            if (a.state === AgentState.GATHERING && a.targetId === node.id) { current = a.id; break; }
        }
        setGatherer(current);
        if (meshRef.current) {
            meshRef.current.scale.setScalar(current ? 0.9 + Math.sin(time * 12) * 0.1 : 1);
        }
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

    if (node.amount <= 0) return null;

    return (
        <group position={node.position}>
            <mesh ref={meshRef} castShadow position={[0, node.type === 'WOOD' ? 2 : 1, 0]}>
                {node.type === 'WOOD' ? <boxGeometry args={[1, 4, 1]} /> : <dodecahedronGeometry args={[1.5, 0]} />}
                <meshStandardMaterial color={getColor()} roughness={0.7} emissive={getColor()} emissiveIntensity={0.1} />
            </mesh>
            {gatherer && <GatherEffect agentId={gatherer} nodeId={node.id} />}
            <Html position={[0, 4.5, 0]} center distanceFactor={15}>
                <div className="bg-black/90 px-2 py-0.5 rounded text-[7px] text-axiom-gold border border-axiom-gold/30">
                    {String(node.type)}: {String(node.amount)}u
                </div>
            </Html>
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
    uFogFar: { value: 350 }
  }), [chunk.id, stability]);

  useFrame((state) => { if (meshRef.current) (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime(); });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[chunk.x * 80, -0.5, chunk.z * 80]}>
      <planeGeometry args={[80, 80, 128, 128]} />
      <shaderMaterial vertexShader={axiomVertexShader} fragmentShader={axiomFragmentShader} uniforms={uniforms} />
    </mesh>
  );
};

const AgentMesh: React.FC<{ agent: Agent; onSelect: (id: string) => void }> = ({ agent, onSelect }) => {
    return (
        <group position={agent.position} rotation={[0, agent.rotationY, 0]} onClick={(e) => { e.stopPropagation(); onSelect(agent.id); soundManager.playUI('CLICK'); }}>
            <SpeechBubble agentId={agent.id} />
            <mesh castShadow position={[0, agent.state === AgentState.MOUNTED ? 1.5 : 0.9, 0]}>
                <boxGeometry args={[0.7, 1.8, 0.7]} />
                <meshStandardMaterial color={agent.faction === 'PLAYER' ? '#06b6d4' : '#ef4444'} roughness={0.7} />
            </mesh>
            <Html position={[0, 2.5, 0]} center distanceFactor={20}>
                 <div className="text-white text-[8px] bg-black/60 px-1.5 py-0.5 rounded">
                    {String(agent.name)} [X:{agent.position[0].toFixed(2)}, Z:{agent.position[2].toFixed(2)}]
                 </div>
            </Html>
        </group>
    );
};

const CameraController = () => {
    const controlsRef = useRef<any>(null);
    const cameraTarget = useStore(state => state.cameraTarget);
    const setCameraTarget = useStore(state => state.setCameraTarget);
    useFrame((_state, delta) => {
        if (cameraTarget && controlsRef.current) {
            const targetVec = new THREE.Vector3(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
            controlsRef.current.target.lerp(targetVec, 5 * delta);
            if (controlsRef.current.target.distanceTo(targetVec) < 0.1) setCameraTarget(null);
        }
    });
    return <OrbitControls ref={controlsRef} maxDistance={300} minDistance={10} enableDamping />;
}

const GameLoop = () => {
    const updatePhysics = useStore(state => state.updatePhysics);
    const runCognition = useStore(state => state.runCognition);
    useFrame((_state, delta) => updatePhysics(delta));
    useEffect(() => { const i = setInterval(runCognition, 8000); return () => clearInterval(i); }, [runCognition]);
    return null;
};

const SceneContent = () => {
    const agents = useStore(state => state.agents);
    const nodes = useStore(state => state.resourceNodes);
    const chunks = useStore(state => state.loadedChunks);
    const selectAgent = useStore(state => state.selectAgent);
    return (
        <Suspense fallback={null}>
            <GameLoop />
            <color attach="background" args={['#050505']} /> 
            <CameraController />
            <ambientLight intensity={0.4} />
            <directionalLight position={[100, 150, 100]} intensity={1.5} castShadow />
            <Stars radius={300} count={6000} factor={4} fade />
            <group>
                {chunks.map(c => <TerrainChunk key={c.id} chunk={c} stability={1} />)}
                {nodes.map(n => <ResourceNodeMesh key={n.id} node={n} />)}
                {agents.map(a => <AgentMesh key={a.id} agent={a} onSelect={selectAgent} />)}
            </group>
        </Suspense>
    );
};

const WorldScene = () => (
    <Canvas shadows camera={{ position: [60, 80, 60], fov: 45 }} dpr={[1, 1.5]}>
        <SceneContent />
    </Canvas>
);

export default React.memo(WorldScene);
