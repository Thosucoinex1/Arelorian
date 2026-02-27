
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
    return chunk?.biome === 'CITY' || chunk?.cellType === 'SANCTUARY';
};

const DayNightSky = () => {
    const serverStats = useStore(state => state.serverStats);
    const uptime = serverStats.uptime || 0;

    const dayLength = 600;
    const cycle = (uptime % dayLength) / dayLength;

    const sunAngle = cycle * Math.PI * 2 - Math.PI * 0.5;
    const sunHeight = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 0.8;
    const sunY = Math.max(sunHeight, -0.3);
    const sunZ = 0.3;

    const isDawn = sunHeight > -0.1 && sunHeight < 0.15;
    const isNight = sunHeight <= -0.1;

    const dayFactor = THREE.MathUtils.clamp((sunHeight + 0.1) / 0.3, 0, 1);

    const dayAmbient = 0.5;
    const nightAmbient = 0.08;
    const ambientIntensity = THREE.MathUtils.lerp(nightAmbient, dayAmbient, dayFactor);

    const daySunIntensity = 2.0;
    const nightSunIntensity = 0.05;
    const sunIntensity = THREE.MathUtils.lerp(nightSunIntensity, daySunIntensity, dayFactor);

    const dayFogColor = new THREE.Color('#8ba4c4');
    const dawnFogColor = new THREE.Color('#c4856b');
    const nightFogColor = new THREE.Color('#0a0e1a');

    let fogColor: THREE.Color;
    if (isDawn) {
        const dawnT = THREE.MathUtils.clamp((sunHeight + 0.1) / 0.25, 0, 1);
        fogColor = nightFogColor.clone().lerp(dawnFogColor, dawnT);
    } else if (isNight) {
        fogColor = nightFogColor.clone();
    } else {
        fogColor = dawnFogColor.clone().lerp(dayFogColor, THREE.MathUtils.clamp((sunHeight - 0.15) / 0.3, 0, 1));
    }

    const daySunColor = new THREE.Color('#fff5e6');
    const dawnSunColor = new THREE.Color('#ff8844');
    const nightSunColor = new THREE.Color('#223366');
    let sunColor: THREE.Color;
    if (isDawn) {
        sunColor = nightSunColor.clone().lerp(dawnSunColor, dayFactor);
    } else if (isNight) {
        sunColor = nightSunColor.clone();
    } else {
        sunColor = dawnSunColor.clone().lerp(daySunColor, THREE.MathUtils.clamp((sunHeight - 0.15) / 0.3, 0, 1));
    }

    const dayHemiSky = new THREE.Color('#87CEEB');
    const nightHemiSky = new THREE.Color('#0a0e2a');
    const hemiSky = nightHemiSky.clone().lerp(dayHemiSky, dayFactor);

    const dayHemiGround = new THREE.Color('#4a6741');
    const nightHemiGround = new THREE.Color('#0a1008');
    const hemiGround = nightHemiGround.clone().lerp(dayHemiGround, dayFactor);

    const hemiIntensity = THREE.MathUtils.lerp(0.1, 0.6, dayFactor);

    return (
        <>
            <Sky
                distance={450000}
                sunPosition={[sunX * 100, sunY * 100, sunZ * 100]}
                turbidity={isNight ? 20 : isDawn ? 6 : 2}
                rayleigh={isNight ? 0.1 : isDawn ? 1.5 : 1}
                mieCoefficient={isDawn ? 0.02 : 0.005}
                mieDirectionalG={0.8}
            />
            <ambientLight intensity={ambientIntensity} color={fogColor} />
            <hemisphereLight args={[hemiSky, hemiGround, hemiIntensity]} />
            <directionalLight
                position={[sunX * 100, Math.max(sunY * 150, 5), sunZ * 100]}
                intensity={sunIntensity}
                castShadow
                color={sunColor}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={0.5}
                shadow-camera-far={500}
                shadow-camera-left={-100}
                shadow-camera-right={100}
                shadow-camera-top={100}
                shadow-camera-bottom={-100}
                shadow-bias={-0.001}
                shadow-normalBias={0.02}
            />
            <fog attach="fog" args={[fogColor, 120, 500]} />

            {isNight && (
                <>
                    <pointLight position={[0, 50, 0]} intensity={0.15} color="#334488" distance={300} />
                    <Stars />
                </>
            )}
        </>
    );
};

const Stars = () => {
    const starsRef = useRef<THREE.Points>(null);
    const { positions, count } = useMemo(() => {
        const count = 500;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 0.8 + 0.2);
            const r = 400;
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi);
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        return { positions, count };
    }, []);

    useFrame((state) => {
        if (starsRef.current) {
            starsRef.current.rotation.y = state.clock.getElapsedTime() * 0.005;
        }
    });

    return (
        <points ref={starsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
            </bufferGeometry>
            <pointsMaterial color="#ffffff" size={1.5} transparent opacity={0.8} sizeAttenuation={false} />
        </points>
    );
};

const DungeonPortalRing: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const ringRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (ringRef.current) {
            ringRef.current.rotation.z = time * 0.8;
        }
        if (glowRef.current) {
            glowRef.current.intensity = 1.5 + Math.sin(time * 2) * 0.8;
        }
    });

    return (
        <group position={position}>
            <mesh ref={ringRef} rotation={[0, 0, 0]}>
                <torusGeometry args={[1.8, 0.12, 16, 32]} />
                <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={2.5} transparent opacity={0.9} />
            </mesh>
            <mesh rotation={[0, 0, 0]}>
                <torusGeometry args={[1.5, 0.06, 16, 32]} />
                <meshStandardMaterial color="#c084fc" emissive="#c084fc" emissiveIntensity={1.5} transparent opacity={0.6} />
            </mesh>
            <pointLight ref={glowRef} color="#8b5cf6" intensity={2} distance={12} />
        </group>
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
                    <group>
                        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                            <boxGeometry args={[3.5, 1, 2.5]} />
                            <meshStandardMaterial color="#8B6914" roughness={0.85} metalness={0.05} />
                        </mesh>
                        <mesh position={[-1.5, 1.8, 0]} castShadow>
                            <cylinderGeometry args={[0.08, 0.08, 2.6]} />
                            <meshStandardMaterial color="#5C4033" roughness={0.9} metalness={0} />
                        </mesh>
                        <mesh position={[1.5, 1.8, 0]} castShadow>
                            <cylinderGeometry args={[0.08, 0.08, 2.6]} />
                            <meshStandardMaterial color="#5C4033" roughness={0.9} metalness={0} />
                        </mesh>
                        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
                            <boxGeometry args={[4, 0.1, 3]} />
                            <meshStandardMaterial color="#C41E3A" roughness={0.7} metalness={0.05} />
                        </mesh>
                        <mesh position={[0, 3.15, -1.5]} castShadow>
                            <boxGeometry args={[4, 0.2, 0.08]} />
                            <meshStandardMaterial color="#FFD700" roughness={0.3} metalness={0.6} />
                        </mesh>
                        <mesh position={[-0.8, 1.3, 0]} castShadow>
                            <sphereGeometry args={[0.2, 8, 8]} />
                            <meshStandardMaterial color="#FF6347" roughness={0.6} metalness={0.1} />
                        </mesh>
                        <mesh position={[0, 1.3, 0]} castShadow>
                            <sphereGeometry args={[0.2, 8, 8]} />
                            <meshStandardMaterial color="#FFD700" roughness={0.6} metalness={0.1} />
                        </mesh>
                        <mesh position={[0.8, 1.3, 0]} castShadow>
                            <sphereGeometry args={[0.18, 8, 8]} />
                            <meshStandardMaterial color="#32CD32" roughness={0.6} metalness={0.1} />
                        </mesh>
                    </group>
                )}
                {poi.type === 'TREE' && (
                    <group>
                        <mesh position={[0, 2, 0]} castShadow receiveShadow>
                            <cylinderGeometry args={[0.15, 0.35, 4]} />
                            <meshStandardMaterial color="#3B2507" roughness={0.95} metalness={0} />
                        </mesh>
                        <mesh position={[0, 5, 0]} castShadow receiveShadow>
                            <sphereGeometry args={[2.2, 8, 6]} />
                            <meshStandardMaterial color="#1A5C1A" roughness={0.85} metalness={0} />
                        </mesh>
                        <mesh position={[0.8, 4.2, 0.6]} castShadow>
                            <sphereGeometry args={[1.4, 7, 5]} />
                            <meshStandardMaterial color="#2D7A2D" roughness={0.8} metalness={0} />
                        </mesh>
                        <mesh position={[-0.6, 4.5, -0.5]} castShadow>
                            <sphereGeometry args={[1.3, 7, 5]} />
                            <meshStandardMaterial color="#1E6B1E" roughness={0.82} metalness={0} />
                        </mesh>
                    </group>
                )}
                {poi.type === 'BUILDING' && (
                    <group>
                        <mesh position={[0, 2, 0]} castShadow receiveShadow>
                            <boxGeometry args={[5, 4, 4.5]} />
                            <meshStandardMaterial color="#8B7355" roughness={0.85} metalness={0.05} />
                        </mesh>
                        <mesh position={[0, 4.2, 0]} castShadow receiveShadow>
                            <boxGeometry args={[5.4, 0.3, 4.9]} />
                            <meshStandardMaterial color="#6B4226" roughness={0.9} metalness={0} />
                        </mesh>
                        <mesh position={[0, 5.5, 0]} castShadow receiveShadow rotation={[0, 0, 0]}>
                            <coneGeometry args={[3.8, 2.5, 4]} />
                            <meshStandardMaterial color="#8B2500" roughness={0.8} metalness={0.05} />
                        </mesh>
                        <mesh position={[0, 0.8, 2.26]} receiveShadow>
                            <boxGeometry args={[1.0, 1.6, 0.08]} />
                            <meshStandardMaterial color="#3B2507" roughness={0.9} metalness={0.1} />
                        </mesh>
                        <mesh position={[0.35, 0.85, 2.27]}>
                            <sphereGeometry args={[0.06, 8, 8]} />
                            <meshStandardMaterial color="#C5A53A" roughness={0.3} metalness={0.8} />
                        </mesh>
                        <mesh position={[-1.8, 2.2, 2.26]} receiveShadow>
                            <boxGeometry args={[0.8, 0.9, 0.08]} />
                            <meshStandardMaterial color="#87CEEB" roughness={0.2} metalness={0.1} transparent opacity={0.6} />
                        </mesh>
                        <mesh position={[-1.8, 2.2, 2.27]}>
                            <boxGeometry args={[0.82, 0.92, 0.02]} />
                            <meshStandardMaterial color="#5C4033" roughness={0.9} metalness={0} wireframe />
                        </mesh>
                        <mesh position={[1.8, 2.2, 2.26]} receiveShadow>
                            <boxGeometry args={[0.8, 0.9, 0.08]} />
                            <meshStandardMaterial color="#87CEEB" roughness={0.2} metalness={0.1} transparent opacity={0.6} />
                        </mesh>
                        <mesh position={[1.8, 2.2, 2.27]}>
                            <boxGeometry args={[0.82, 0.92, 0.02]} />
                            <meshStandardMaterial color="#5C4033" roughness={0.9} metalness={0} wireframe />
                        </mesh>
                        <mesh position={[2.51, 2.2, 0]} receiveShadow>
                            <boxGeometry args={[0.08, 0.9, 0.8]} />
                            <meshStandardMaterial color="#87CEEB" roughness={0.2} metalness={0.1} transparent opacity={0.6} />
                        </mesh>
                    </group>
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
                {poi.type === 'DUNGEON' && (
                    <group>
                        <mesh position={[-2, 2, 0]} castShadow receiveShadow>
                            <boxGeometry args={[0.8, 4, 1.5]} />
                            <meshStandardMaterial color="#3a3a3a" roughness={0.95} metalness={0.1} />
                        </mesh>
                        <mesh position={[2, 2, 0]} castShadow receiveShadow>
                            <boxGeometry args={[0.8, 4, 1.5]} />
                            <meshStandardMaterial color="#3a3a3a" roughness={0.95} metalness={0.1} />
                        </mesh>
                        <mesh position={[0, 4.2, 0]} castShadow receiveShadow>
                            <boxGeometry args={[4.8, 0.8, 1.5]} />
                            <meshStandardMaterial color="#4a4a4a" roughness={0.9} metalness={0.1} />
                        </mesh>
                        <mesh position={[0, 2, 0.5]}>
                            <planeGeometry args={[3.2, 4]} />
                            <meshStandardMaterial color="#050510" roughness={1} metalness={0} side={2} />
                        </mesh>
                        <DungeonPortalRing position={[0, 2, -0.2]} />
                    </group>
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

const SlimeBody: React.FC<{ color: string; scale: number }> = ({ color, scale }) => (
    <group scale={[scale, scale, scale]}>
        <mesh castShadow receiveShadow position={[0, 0.6, 0]} scale={[1, 0.7, 1]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} transparent opacity={0.75} roughness={0.1} metalness={0.2} />
        </mesh>
        <mesh position={[0.25, 1.0, 0.4]} scale={[0.2, 0.25, 0.15]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#111111" roughness={0.1} metalness={0.8} />
        </mesh>
        <mesh position={[-0.25, 1.0, 0.4]} scale={[0.2, 0.25, 0.15]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#111111" roughness={0.1} metalness={0.8} />
        </mesh>
    </group>
);

const GoblinBody: React.FC<{ color: string; scale: number }> = ({ color, scale }) => (
    <group scale={[scale, scale, scale]}>
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.5, 10, 10]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.2, 0]}>
            <sphereGeometry args={[0.45, 10, 10]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.9, 0]}>
            <sphereGeometry args={[0.4, 10, 10]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh castShadow position={[0, 2.5, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.35, 0.7, 6]} />
            <meshStandardMaterial color="#8B0000" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[0.15, 2.05, 0.3]} scale={[0.12, 0.15, 0.1]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[-0.15, 2.05, 0.3]} scale={[0.12, 0.15, 0.1]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.8} />
        </mesh>
    </group>
);

const OrcBody: React.FC<{ color: string; scale: number }> = ({ color, scale }) => (
    <group scale={[scale, scale, scale]}>
        <mesh castShadow receiveShadow position={[0, 0.8, 0]} scale={[0.8, 1.0, 0.6]}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.9, 0]} scale={[0.55, 0.6, 0.5]}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh castShadow position={[0.7, 0.6, 0]} scale={[0.3, 0.7, 0.3]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh castShadow position={[-0.7, 0.6, 0]} scale={[0.3, 0.7, 0.3]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[0.2, 2.1, 0.35]} scale={[0.1, 0.12, 0.08]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial color="#ff3300" emissive="#ff3300" emissiveIntensity={1.0} />
        </mesh>
        <mesh position={[-0.2, 2.1, 0.35]} scale={[0.1, 0.12, 0.08]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial color="#ff3300" emissive="#ff3300" emissiveIntensity={1.0} />
        </mesh>
    </group>
);

const DragonBody: React.FC<{ color: string; scale: number }> = ({ color, scale }) => (
    <group scale={[scale, scale, scale]}>
        <mesh castShadow receiveShadow position={[0, 0.8, 0]} scale={[0.6, 0.7, 1.2]}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.3, -1.0]} scale={[0.35, 0.4, 0.35]}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh castShadow position={[0, 1.4, -1.4]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[0.12, 0.4, 4]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0.15, 1.55, -1.05]} scale={[0.08, 0.1, 0.06]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={2.0} />
        </mesh>
        <mesh position={[-0.15, 1.55, -1.05]} scale={[0.08, 0.1, 0.06]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={2.0} />
        </mesh>
        <mesh castShadow position={[0, 0.6, 1.2]} rotation={[-0.3, 0, 0]} scale={[0.15, 0.15, 0.8]}>
            <cylinderGeometry args={[1, 0.1, 1, 6]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh castShadow position={[0.9, 1.1, 0]} rotation={[0, 0, -0.6]} scale={[0.6, 0.05, 0.4]}>
            <planeGeometry args={[2, 1.5]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} side={THREE.DoubleSide} transparent opacity={0.85} roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh castShadow position={[-0.9, 1.1, 0]} rotation={[0, 0, 0.6]} scale={[0.6, 0.05, 0.4]}>
            <planeGeometry args={[2, 1.5]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} side={THREE.DoubleSide} transparent opacity={0.85} roughness={0.3} metalness={0.4} />
        </mesh>
    </group>
);

const MonsterMesh: React.FC<{ monster: Monster }> = ({ monster }) => {
    const selectMonster = useStore(state => state.selectMonster);
    const agents = useStore(state => state.agents);
    const chunks = useStore(state => state.loadedChunks);
    const [isVisible, setIsVisible] = useState(false);
    const groupRef = useRef<THREE.Group>(null);
    const bobOffset = useRef(Math.random() * Math.PI * 2);

    useFrame((state) => {
        if (monster.state === 'DEAD') return;
        if (isPosInSanctuary(monster.position, chunks)) { setIsVisible(true); }
        else {
            let visible = false;
            for (const a of agents) {
                const dist = Math.hypot(a.position[0] - monster.position[0], a.position[2] - monster.position[2]);
                if (dist < a.visionRange) { visible = true; break; }
            }
            if (visible !== isVisible) setIsVisible(visible);
        }

        if (groupRef.current && isVisible) {
            const time = state.clock.getElapsedTime();
            const bobSpeed = monster.type === 'SLIME' ? 3.0 : 1.5;
            const bobHeight = monster.type === 'SLIME' ? 0.4 : 0.15;
            groupRef.current.position.y = monster.position[1] + Math.sin(time * bobSpeed + bobOffset.current) * bobHeight;

            if (monster.type === 'SLIME') {
                const squish = 1.0 + Math.sin(time * bobSpeed + bobOffset.current) * 0.15;
                groupRef.current.scale.set(1.0 / squish, squish, 1.0 / squish);
            }
        }
    });

    if (!isVisible || monster.state === 'DEAD') return null;

    const renderMonsterBody = () => {
        switch (monster.type) {
            case 'SLIME':
                return <SlimeBody color={monster.color} scale={monster.scale} />;
            case 'GOBLIN':
                return <GoblinBody color={monster.color} scale={monster.scale} />;
            case 'ORC':
                return <OrcBody color={monster.color} scale={monster.scale} />;
            case 'DRAGON':
                return <DragonBody color={monster.color} scale={monster.scale} />;
            default:
                return (
                    <mesh castShadow receiveShadow scale={[monster.scale, monster.scale, monster.scale]} position={[0, monster.scale, 0]}>
                        <icosahedronGeometry args={[1, 1]} />
                        <meshStandardMaterial color={monster.color} emissive={monster.color} emissiveIntensity={0.4} roughness={0.3} metalness={0.6} />
                    </mesh>
                );
        }
    };

    const labelHeight = monster.type === 'DRAGON' ? monster.scale * 2.5 + 1 : monster.type === 'ORC' ? monster.scale * 2.8 + 0.5 : monster.type === 'GOBLIN' ? monster.scale * 3.5 + 0.5 : monster.scale * 2 + 1;

    return (
        <group position={[monster.position[0], monster.position[1], monster.position[2]]} onClick={(e) => { e.stopPropagation(); selectMonster(monster.id); }}>
            <group ref={groupRef}>
                {renderMonsterBody()}
                <pointLight position={[0, monster.scale + 0.5, 0]} color={monster.color} intensity={0.5} distance={5} />
            </group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
                <circleGeometry args={[monster.scale * 0.8, 16]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.35} />
            </mesh>
            <Html position={[0, labelHeight, 0]} center distanceFactor={15}>
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
        uBiome: { value: debugBiomeEnabled ? debugBiome : chunk.biome === 'CITY' ? 0.0 : chunk.biome === 'FOREST' ? 1.0 : chunk.biome === 'MOUNTAIN' ? 2.0 : chunk.biome === 'DESERT' ? 4.0 : chunk.biome === 'SWAMP' ? 5.0 : 3.0 },
        uFogColor: { value: new THREE.Color('#8ba4c4') },
        uFogNear: { value: 150 },
        uFogFar: { value: 600 },
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
    const visibleRef = useRef(true);
    const [renderVisible, setRenderVisible] = useState(true);
    const groupRef = useRef<THREE.Group>(null);
    const modelRef = useRef<{ group: THREE.Group; controller: AnimationController | null; lastState: AgentState | null }>({ group: null as any, controller: null, lastState: null });

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
        let shouldBeVisible = true;

        if (agent.faction === 'PLAYER') {
            shouldBeVisible = true;
        } else if (isPosInSanctuary(agent.position, chunks)) {
            shouldBeVisible = true;
        } else {
            shouldBeVisible = false;
            for (const a of agents) {
                if (a.id === agent.id) continue;
                const dist = Math.hypot(a.position[0] - agent.position[0], a.position[2] - agent.position[2]);
                if (dist < a.visionRange) { shouldBeVisible = true; break; }
            }
        }

        if (shouldBeVisible !== visibleRef.current) {
            visibleRef.current = shouldBeVisible;
            setRenderVisible(shouldBeVisible);
        }

        if (modelRef.current.controller) {
            modelRef.current.controller.update(delta);

            if (modelRef.current.lastState !== agent.state) {
                modelRef.current.controller.playForState(agent.state);
                modelRef.current.lastState = agent.state;
            }
        }
    });

    const isImported = agent.id.startsWith('imported_');

    const bodyColor = appearance.skinTone || '#c9a26b';
    const isPlayer = agent.faction === 'PLAYER';

    return (
        <group
            ref={groupRef}
            position={[agent.position[0], agent.position[1] + 0.8, agent.position[2]]}
            rotation={[0, agent.rotationY, 0]}
            visible={renderVisible}
            onClick={(e) => { if (!renderVisible) return; e.stopPropagation(); onSelect(agent.id); soundManager.playUI('CLICK'); }}
            castShadow
        >
            <mesh position={[0, 0.9, 0]} castShadow>
                <capsuleGeometry args={[0.25, 0.8, 4, 8]} />
                <meshStandardMaterial color={bodyColor} roughness={0.7} metalness={0.05} />
            </mesh>
            <mesh position={[0, 1.65, 0]} castShadow>
                <sphereGeometry args={[0.22, 8, 8]} />
                <meshStandardMaterial color={bodyColor} roughness={0.7} metalness={0.05} />
            </mesh>
            {isPlayer && (
                <pointLight position={[0, 2, 0]} intensity={0.5} distance={8} color="#c9a227" />
            )}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.5, 16]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.3} />
            </mesh>
            {renderVisible && (
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
            )}
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

const SceneLighting = () => null;

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
                <color attach="background" args={['#6b8cb5']} />
                <ThirdPersonCamera />
                <SceneLighting />
                <DayNightSky />
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
