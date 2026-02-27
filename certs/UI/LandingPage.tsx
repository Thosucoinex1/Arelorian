import { useState, useEffect, useRef, useMemo, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? (this.props.fallback || null) : this.props.children; }
}

interface HealthData {
  tickEngine?: { running: boolean; currentTick: number };
  playerCount?: number;
  status?: string;
  constants?: { KAPPA: number };
}

function RotatingTerrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(40, 40, 64, 64);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const height =
        Math.sin(x * 0.3) * Math.cos(y * 0.3) * 1.5 +
        Math.sin(x * 0.7 + 1) * 0.8 +
        Math.cos(y * 0.5 + 2) * 0.6;
      pos.setZ(i, height);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = clock.getElapsedTime() * 0.05;
      const pos = geometry.attributes.position;
      const t = clock.getElapsedTime();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const height =
          Math.sin(x * 0.3 + t * 0.2) * Math.cos(y * 0.3 + t * 0.15) * 1.5 +
          Math.sin(x * 0.7 + 1 + t * 0.1) * 0.8 +
          Math.cos(y * 0.5 + 2 + t * 0.12) * 0.6;
        pos.setZ(i, height);
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -2, 0]}>
      <meshStandardMaterial
        color="#1a1a2e"
        wireframe
        emissive="#c9a227"
        emissiveIntensity={0.15}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const { positions, count } = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return { positions, count };
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.02;
      pointsRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.03) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial color="#c9a227" size={0.08} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

function WebGLBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 8, 15], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 10, 5]} intensity={0.4} color="#c9a227" />
        <pointLight position={[-5, 5, -5]} intensity={0.3} color="#7b4fd4" />
        <fog attach="fog" args={['#060810', 10, 40]} />
        <RotatingTerrain />
        <FloatingParticles />
      </Canvas>
    </div>
  );
}

function WorldStatus({ health }: { health: HealthData | null }) {
  if (!health) return null;

  const items = [
    { label: 'STATUS', value: health.status || 'UNKNOWN', color: health.status === 'CONNECTED' ? '#4eaa60' : '#e8921a' },
    { label: 'TICK', value: health.tickEngine?.currentTick?.toString() || '—', color: '#c9a227' },
    { label: 'AGENTS ONLINE', value: health.playerCount?.toString() || '0', color: '#1fb8b8' },
    { label: 'ENGINE', value: health.tickEngine?.running ? 'ACTIVE' : 'PAUSED', color: health.tickEngine?.running ? '#4eaa60' : '#c0392b' },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: 24,
      justifyContent: 'center',
      flexWrap: 'wrap',
      padding: '16px 0',
    }}>
      {items.map(item => (
        <div key={item.label} style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: 3,
            color: '#4a5570',
            marginBottom: 4,
            textTransform: 'uppercase',
          }}>
            {item.label}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 16,
            fontWeight: 700,
            color: item.color,
            textShadow: `0 0 10px ${item.color}40`,
          }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage({ onEnterGame }: { onEnterGame: (mode: 'guest' | 'login') => void }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setFadeIn(true);
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setHealth(data);
      } catch {
        setHealth(null);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.message || 'Authentication failed.');
        setLoginLoading(false);
        return;
      }
      localStorage.setItem('oscc_access_token', data.accessToken);
      localStorage.setItem('oscc_refresh_token', data.refreshToken);
      onEnterGame('login');
    } catch {
      setLoginError('Network error.');
    }
    setLoginLoading(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#060810',
      zIndex: 200,
      overflow: 'hidden',
      opacity: fadeIn ? 1 : 0,
      transition: 'opacity 1.2s ease',
    }}>
      <WebGLErrorBoundary fallback={<div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 40% 50%, #0d1117 0%, #060810 100%)' }} />}>
        <WebGLBackground />
      </WebGLErrorBoundary>

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(6,8,16,0.7) 60%, rgba(6,8,16,0.95) 100%)',
        zIndex: 1,
      }} />

      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{
          marginBottom: 16,
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(-30px)',
          transition: 'all 1.5s ease 0.3s',
        }}>
          <div style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: 'clamp(32px, 6vw, 72px)',
            fontWeight: 900,
            color: '#e8dfc8',
            letterSpacing: 8,
            lineHeight: 1.1,
            textShadow: '0 0 40px rgba(201,162,39,0.3), 0 0 80px rgba(201,162,39,0.1)',
          }}>
            OUROBOROS
          </div>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 'clamp(12px, 2vw, 22px)',
            fontWeight: 400,
            color: '#c9a227',
            letterSpacing: 12,
            marginTop: 8,
            textShadow: '0 0 20px rgba(201,162,39,0.4)',
          }}>
            NEURAL EMERGENCE
          </div>
        </div>

        <div style={{
          width: 60,
          height: 1,
          background: 'linear-gradient(90deg, transparent, #c9a227, transparent)',
          margin: '20px auto',
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 1.5s ease 0.8s',
        }} />

        <div style={{
          maxWidth: 560,
          fontFamily: "'Crimson Pro', serif",
          fontSize: 'clamp(14px, 1.5vw, 18px)',
          color: '#8a9bb8',
          lineHeight: 1.8,
          fontStyle: 'italic',
          marginBottom: 32,
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 1.5s ease 1s',
        }}>
          In the lattice of infinite recursion, emergent minds awaken.
          Agents evolve, economies breathe, and the world reshapes itself
          through the eternal cycle of creation and entropy.
          The Matrix awaits your consciousness.
        </div>

        <div style={{
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 1.5s ease 1.3s',
          marginBottom: 32,
        }}>
          <WorldStatus health={health} />
        </div>

        {!showLogin ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 1.5s ease 1.5s',
          }}>
            <button
              onClick={() => onEnterGame('guest')}
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 6,
                padding: '18px 48px',
                background: 'linear-gradient(135deg, rgba(201,162,39,0.15), rgba(201,162,39,0.05))',
                border: '1px solid rgba(201,162,39,0.4)',
                color: '#c9a227',
                cursor: 'pointer',
                borderRadius: 4,
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.background = 'linear-gradient(135deg, rgba(201,162,39,0.3), rgba(201,162,39,0.1))';
                (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(201,162,39,0.3), inset 0 0 30px rgba(201,162,39,0.05)';
                (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.7)';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.background = 'linear-gradient(135deg, rgba(201,162,39,0.15), rgba(201,162,39,0.05))';
                (e.target as HTMLElement).style.boxShadow = 'none';
                (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.4)';
              }}
            >
              Enter the Matrix
            </button>

            <button
              onClick={() => setShowLogin(true)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: 3,
                padding: '10px 24px',
                background: 'transparent',
                border: '1px solid rgba(138,155,184,0.2)',
                color: '#4a5570',
                cursor: 'pointer',
                borderRadius: 4,
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.color = '#8a9bb8';
                (e.target as HTMLElement).style.borderColor = 'rgba(138,155,184,0.4)';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.color = '#4a5570';
                (e.target as HTMLElement).style.borderColor = 'rgba(138,155,184,0.2)';
              }}
            >
              Admin Login
            </button>
          </div>
        ) : (
          <div style={{
            maxWidth: 360,
            width: '100%',
            opacity: fadeIn ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}>
            <form onSubmit={handleLogin} style={{
              background: 'rgba(10,13,26,0.9)',
              border: '1px solid rgba(201,162,39,0.2)',
              borderRadius: 8,
              padding: 32,
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 14,
                letterSpacing: 4,
                color: '#c9a227',
                textAlign: 'center',
                marginBottom: 24,
                textTransform: 'uppercase',
              }}>
                Authenticate
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 2,
                  color: '#4a5570',
                  display: 'block',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(6,8,16,0.8)',
                    border: '1px solid rgba(201,162,39,0.15)',
                    color: '#e8dfc8',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    borderRadius: 4,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.4)'}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.15)'}
                  placeholder="operator@ouroboros.io"
                  autoComplete="email"
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 2,
                  color: '#4a5570',
                  display: 'block',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}>
                  Access Key
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(6,8,16,0.8)',
                    border: '1px solid rgba(201,162,39,0.15)',
                    color: '#e8dfc8',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    borderRadius: 4,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.4)'}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.15)'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {loginError && (
                <div style={{
                  color: '#c0392b',
                  fontSize: 12,
                  marginBottom: 16,
                  padding: '8px 12px',
                  background: 'rgba(192,57,43,0.1)',
                  border: '1px solid rgba(192,57,43,0.3)',
                  borderRadius: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  width: '100%',
                  padding: 14,
                  background: loginLoading ? 'rgba(201,162,39,0.05)' : 'linear-gradient(135deg, rgba(201,162,39,0.2), rgba(201,162,39,0.05))',
                  border: '1px solid rgba(201,162,39,0.4)',
                  color: '#c9a227',
                  fontFamily: "'Cinzel', serif",
                  fontSize: 13,
                  letterSpacing: 4,
                  cursor: loginLoading ? 'wait' : 'pointer',
                  borderRadius: 4,
                  transition: 'all 0.3s',
                  textTransform: 'uppercase',
                }}
              >
                {loginLoading ? 'Verifying...' : 'Initiate Session'}
              </button>

              <button
                type="button"
                onClick={() => { setShowLogin(false); setLoginError(''); }}
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: 10,
                  background: 'transparent',
                  border: 'none',
                  color: '#4a5570',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 2,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                ← Back
              </button>
            </form>
          </div>
        )}

        <div style={{
          position: 'absolute',
          bottom: 24,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          letterSpacing: 3,
          color: '#1e2a4a',
          textTransform: 'uppercase',
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 2s ease 2s',
        }}>
          Ouroboros Collective · Neural Emergence Protocol v1.0
        </div>
      </div>
    </div>
  );
}