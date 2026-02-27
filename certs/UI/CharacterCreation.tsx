import { useState, useRef, useCallback, Suspense, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { AppearanceConfig, DEFAULT_APPEARANCE } from '../../types';
import { createHumanoidModel, HumanoidAppearance } from '../../components/World/HumanoidModel';

class WebGLSafeBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? (this.props.fallback || null) : this.props.children; }
}

const SKIN_TONES = [
  '#f5dbcb', '#f0c8a0', '#e0ac69', '#c68642',
  '#8d5524', '#6b3a1f', '#4a2511', '#3b1a0e',
];

const HAIR_STYLES: HumanoidAppearance['hairStyle'][] = [
  'bald', 'short', 'long', 'mohawk', 'ponytail',
];

const HAIR_STYLE_LABELS: Record<string, string> = {
  bald: 'Bald',
  short: 'Short',
  long: 'Long',
  mohawk: 'Mohawk',
  ponytail: 'Ponytail',
};

const BASE_MODELS: AppearanceConfig['baseModel'][] = ['humanoid', 'slim', 'bulky'];

const BASE_MODEL_LABELS: Record<string, string> = {
  humanoid: 'Standard',
  slim: 'Slim',
  bulky: 'Bulky',
};

function CharacterPreview({ appearance }: { appearance: AppearanceConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<ReturnType<typeof createHumanoidModel> | null>(null);

  const rebuildModel = useCallback(() => {
    if (groupRef.current) {
      if (modelRef.current) {
        modelRef.current.group.traverse((child: any) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
            else child.material.dispose();
          }
        });
      }
      while (groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0]);
      }
      const scale = appearance.baseModel === 'slim' ? 0.85 : appearance.baseModel === 'bulky' ? 1.15 : 1.0;
      const model = createHumanoidModel({
        skinTone: appearance.skinTone,
        hairStyle: appearance.hairStyle,
        bodyScale: appearance.bodyScale * scale,
      });
      modelRef.current = model;
      groupRef.current.add(model.group);
    }
  }, [appearance.skinTone, appearance.hairStyle, appearance.bodyScale, appearance.baseModel]);

  useFrame(() => {
    if (!groupRef.current) return;
    if (groupRef.current.children.length === 0 || groupRef.current.userData.lastKey !== keyFor(appearance)) {
      rebuildModel();
      groupRef.current.userData.lastKey = keyFor(appearance);
    }
    groupRef.current.rotation.y += 0.005;
  });

  return <group ref={groupRef} position={[0, -0.5, 0]} />;
}

function keyFor(a: AppearanceConfig) {
  return `${a.skinTone}-${a.hairStyle}-${a.bodyScale}-${a.baseModel}`;
}

function PreviewScene({ appearance }: { appearance: AppearanceConfig }) {
  return (
    <Canvas
      camera={{ position: [0, 1, 3], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 3]} intensity={0.8} color="#e8dfc8" />
      <pointLight position={[-3, 3, -2]} intensity={0.3} color="#7b4fd4" />
      <pointLight position={[0, -1, 2]} intensity={0.2} color="#c9a227" />
      <Suspense fallback={null}>
        <CharacterPreview appearance={appearance} />
      </Suspense>
    </Canvas>
  );
}

const inputStyle: React.CSSProperties = {
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

const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
};

export default function CharacterCreation({ onComplete }: { onComplete: () => void }) {
  const createPlayerAgent = useStore(s => s.createPlayerAgent);
  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState<AppearanceConfig>({ ...DEFAULT_APPEARANCE });
  const [fadeIn, setFadeIn] = useState(false);
  const [error, setError] = useState('');

  useState(() => {
    setTimeout(() => setFadeIn(true), 50);
  });

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name for your character.');
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 24) {
      setError('Name must be 2-24 characters.');
      return;
    }
    setError('');
    createPlayerAgent(trimmed, appearance);
    onComplete();
  };

  const updateAppearance = (patch: Partial<AppearanceConfig>) => {
    setAppearance(prev => ({ ...prev, ...patch }));
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#060810',
      zIndex: 200,
      overflow: 'auto',
      opacity: fadeIn ? 1 : 0,
      transition: 'opacity 0.8s ease',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 60% 40%, rgba(123,79,212,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '40px 24px',
      }}>
        <div style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: 'clamp(20px, 4vw, 36px)',
          fontWeight: 700,
          color: '#e8dfc8',
          letterSpacing: 6,
          textShadow: '0 0 30px rgba(201,162,39,0.2)',
          marginBottom: 8,
          textAlign: 'center',
        }}>
          Forge Your Identity
        </div>

        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(10px, 1.5vw, 14px)',
          color: '#c9a227',
          letterSpacing: 8,
          marginBottom: 32,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          Character Creation
        </div>

        <div style={{
          display: 'flex',
          gap: 40,
          maxWidth: 900,
          width: '100%',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 280,
            height: 360,
            border: '1px solid rgba(201,162,39,0.15)',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'rgba(10,13,26,0.6)',
            flexShrink: 0,
          }}>
            <WebGLSafeBoundary fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5570', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>3D preview unavailable</div>}>
              <PreviewScene appearance={appearance} />
            </WebGLSafeBoundary>
          </div>

          <div style={{
            flex: 1,
            minWidth: 280,
            maxWidth: 420,
          }}>
            <div style={sectionStyle}>
              <label style={labelStyle}>Character Name</label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                style={inputStyle}
                placeholder="Enter name..."
                maxLength={24}
                onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.4)'}
                onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.15)'}
              />
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Skin Tone</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SKIN_TONES.map(tone => (
                  <button
                    key={tone}
                    onClick={() => updateAppearance({ skinTone: tone })}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: tone,
                      border: appearance.skinTone === tone
                        ? '2px solid #c9a227'
                        : '2px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      boxShadow: appearance.skinTone === tone
                        ? '0 0 10px rgba(201,162,39,0.4)'
                        : 'none',
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Hair Style</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {HAIR_STYLES.map(style => (
                  <button
                    key={style}
                    onClick={() => updateAppearance({ hairStyle: style })}
                    style={{
                      padding: '6px 14px',
                      background: appearance.hairStyle === style
                        ? 'rgba(201,162,39,0.2)'
                        : 'rgba(10,13,26,0.8)',
                      border: appearance.hairStyle === style
                        ? '1px solid rgba(201,162,39,0.5)'
                        : '1px solid rgba(201,162,39,0.1)',
                      color: appearance.hairStyle === style ? '#c9a227' : '#4a5570',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      letterSpacing: 1,
                      cursor: 'pointer',
                      borderRadius: 4,
                      transition: 'all 0.2s',
                      textTransform: 'uppercase',
                    }}
                  >
                    {HAIR_STYLE_LABELS[style]}
                  </button>
                ))}
              </div>
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Body Type</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {BASE_MODELS.map(model => (
                  <button
                    key={model}
                    onClick={() => updateAppearance({ baseModel: model })}
                    style={{
                      padding: '6px 14px',
                      background: appearance.baseModel === model
                        ? 'rgba(123,79,212,0.2)'
                        : 'rgba(10,13,26,0.8)',
                      border: appearance.baseModel === model
                        ? '1px solid rgba(123,79,212,0.5)'
                        : '1px solid rgba(123,79,212,0.1)',
                      color: appearance.baseModel === model ? '#7b4fd4' : '#4a5570',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      letterSpacing: 1,
                      cursor: 'pointer',
                      borderRadius: 4,
                      transition: 'all 0.2s',
                      textTransform: 'uppercase',
                    }}
                  >
                    {BASE_MODEL_LABELS[model]}
                  </button>
                ))}
              </div>
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Body Scale: {appearance.bodyScale.toFixed(2)}</label>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={appearance.bodyScale}
                onChange={e => updateAppearance({ bodyScale: parseFloat(e.target.value) })}
                style={{
                  width: '100%',
                  accentColor: '#c9a227',
                  cursor: 'pointer',
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: '#4a5570',
                marginTop: 2,
              }}>
                <span>Compact</span>
                <span>Large</span>
              </div>
            </div>

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
              onClick={handleSave}
              style={{
                width: '100%',
                padding: 16,
                background: 'linear-gradient(135deg, rgba(201,162,39,0.2), rgba(201,162,39,0.05))',
                border: '1px solid rgba(201,162,39,0.4)',
                color: '#c9a227',
                fontFamily: "'Cinzel', serif",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 6,
                cursor: 'pointer',
                borderRadius: 4,
                transition: 'all 0.3s',
                textTransform: 'uppercase',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.background = 'linear-gradient(135deg, rgba(201,162,39,0.3), rgba(201,162,39,0.1))';
                (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(201,162,39,0.3), inset 0 0 30px rgba(201,162,39,0.05)';
                (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.7)';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.background = 'linear-gradient(135deg, rgba(201,162,39,0.2), rgba(201,162,39,0.05))';
                (e.target as HTMLElement).style.boxShadow = 'none';
                (e.target as HTMLElement).style.borderColor = 'rgba(201,162,39,0.4)';
              }}
            >
              Enter the World
            </button>
          </div>
        </div>

        <div style={{
          marginTop: 40,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          letterSpacing: 3,
          color: '#1e2a4a',
          textTransform: 'uppercase',
        }}>
          Ouroboros Collective · Identity Forge Protocol
        </div>
      </div>
    </div>
  );
}
