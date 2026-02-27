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
    { label: 'TICK', value: health.tickEngine?.currentTick?.toString() || '\u2014', color: '#c9a227' },
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(6,8,16,0.8)',
  border: '1px solid rgba(201,162,39,0.15)',
  color: '#e8dfc8',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
  borderRadius: 4,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.3s',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: 2,
  color: '#4a5570',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
};

interface LandingPageProps {
  onAuthenticated: (userData: { uid: string; username: string; email: string; token: string }) => void;
}

export default function LandingPage({ onAuthenticated }: LandingPageProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [authMode, setAuthMode] = useState<'create' | 'login'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    const token = localStorage.getItem('ouroboros_user_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.user) {
            onAuthenticated({
              uid: data.user.uid,
              username: data.user.username,
              email: data.user.email,
              token,
            });
          } else {
            localStorage.removeItem('ouroboros_user_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('ouroboros_user_token');
        });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = authMode === 'create' ? '/api/auth/register' : '/api/auth/login';
    const body = authMode === 'create'
      ? { email, password, username }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong.');
        setLoading(false);
        return;
      }

      localStorage.setItem('ouroboros_user_token', data.token);

      onAuthenticated({
        uid: data.user.uid,
        username: data.user.username,
        email: data.user.email,
        token: data.token,
      });
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const tabBase: React.CSSProperties = {
    flex: 1,
    padding: '10px 0',
    border: 'none',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: 3,
    cursor: 'pointer',
    transition: 'all 0.3s',
    textTransform: 'uppercase',
    borderRadius: 0,
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#060810',
      zIndex: 200,
      overflow: 'auto',
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
          maxWidth: 500,
          fontFamily: "'Crimson Pro', serif",
          fontSize: 'clamp(14px, 1.5vw, 17px)',
          color: '#8a9bb8',
          lineHeight: 1.8,
          fontStyle: 'italic',
          marginBottom: 24,
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 1.5s ease 1s',
        }}>
          In the lattice of infinite recursion, emergent minds awaken.
          The Matrix awaits your consciousness.
        </div>

        <div style={{
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 1.5s ease 1.3s',
          marginBottom: 24,
        }}>
          <WorldStatus health={health} />
        </div>

        <div style={{
          maxWidth: 380,
          width: '100%',
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 1.5s ease 1.5s',
        }}>
          <div style={{
            background: 'rgba(10,13,26,0.92)',
            border: '1px solid rgba(201,162,39,0.2)',
            borderRadius: 8,
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,162,39,0.1)' }}>
              <button
                type="button"
                onClick={() => { setAuthMode('create'); setError(''); }}
                style={{
                  ...tabBase,
                  background: authMode === 'create' ? 'rgba(201,162,39,0.08)' : 'transparent',
                  color: authMode === 'create' ? '#c9a227' : '#4a5570',
                  borderBottom: authMode === 'create' ? '2px solid #c9a227' : '2px solid transparent',
                }}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(''); }}
                style={{
                  ...tabBase,
                  background: authMode === 'login' ? 'rgba(201,162,39,0.08)' : 'transparent',
                  color: authMode === 'login' ? '#c9a227' : '#4a5570',
                  borderBottom: authMode === 'login' ? '2px solid #c9a227' : '2px solid transparent',
                }}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '28px 28px 24px' }}>
              {authMode === 'create' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.4)'}
                    onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.15)'}
                    placeholder="Choose a username"
                    autoComplete="username"
                    required
                    minLength={2}
                    maxLength={30}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.4)'}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.15)'}
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div style={{ marginBottom: authMode === 'create' ? 16 : 24 }}>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.4)'}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.15)'}
                  placeholder={authMode === 'create' ? 'Min. 6 characters' : 'Your password'}
                  autoComplete={authMode === 'create' ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                />
              </div>

              {authMode === 'create' && (
                <div style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#3a4560',
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}>
                  By creating an account you agree to the terms of the Ouroboros Neural Emergence protocol.
                </div>
              )}

              {error && (
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
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 14,
                  background: loading
                    ? 'rgba(201,162,39,0.05)'
                    : 'linear-gradient(135deg, rgba(201,162,39,0.2), rgba(201,162,39,0.05))',
                  border: '1px solid rgba(201,162,39,0.4)',
                  color: '#c9a227',
                  fontFamily: "'Cinzel', serif",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: 4,
                  cursor: loading ? 'wait' : 'pointer',
                  borderRadius: 4,
                  transition: 'all 0.3s',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    (e.target as HTMLElement).style.background = 'linear-gradient(135deg, rgba(201,162,39,0.3), rgba(201,162,39,0.1))';
                    (e.target as HTMLElement).style.boxShadow = '0 0 20px rgba(201,162,39,0.2)';
                  }
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.background = loading
                    ? 'rgba(201,162,39,0.05)'
                    : 'linear-gradient(135deg, rgba(201,162,39,0.2), rgba(201,162,39,0.05))';
                  (e.target as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {loading
                  ? 'Processing...'
                  : authMode === 'create'
                    ? 'Enter the Matrix'
                    : 'Initiate Session'
                }
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/oscc';
            }}
            style={{
              marginTop: 16,
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid rgba(138,155,184,0.15)',
              color: '#2a3550',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: 3,
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
              (e.target as HTMLElement).style.color = '#2a3550';
              (e.target as HTMLElement).style.borderColor = 'rgba(138,155,184,0.15)';
            }}
          >
            Admin Console
          </button>
        </div>

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
