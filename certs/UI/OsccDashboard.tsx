import { useState, useEffect, useCallback, useRef } from 'react';

interface AdminSession {
  adminId: number;
  email: string;
  role: string;
}

interface TickStatus {
  current: number;
  isRunning: boolean;
  kappa: { current: number; isOverridden: boolean; ticksLeft: number };
  recentTicks: any[];
}

interface DashboardStats {
  tick: { current: number; isRunning: boolean; kappa: any };
  world: { agents: number; chunks: number; activeListings: number; activeEvents: number; state: any };
  economy: any;
  security: { recentAuditActions: number; recentAnomalies: number };
  serverUptime: number;
  memoryUsage: any;
}

interface AuditLog {
  id: number;
  admin_id: number;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  ip_address: string;
  timestamp: string;
}

interface LiveEvent {
  id: number;
  event_type: string;
  name: string;
  severity: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

const API_BASE = '/api/admin';

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('oscc_access_token');
  const headers: any = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('oscc_refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('oscc_access_token', data.accessToken);
          headers['Authorization'] = `Bearer ${data.accessToken}`;
          return fetch(`${API_BASE}${path}`, { ...options, headers });
        }
      } catch (_) {}
    }
    localStorage.removeItem('oscc_access_token');
    localStorage.removeItem('oscc_refresh_token');
    throw new Error('SESSION_EXPIRED');
  }
  return res;
}

function LoginScreen({ onLogin }: { onLogin: (session: AdminSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Authentication failed.');
        setLoading(false);
        return;
      }

      localStorage.setItem('oscc_access_token', data.accessToken);
      localStorage.setItem('oscc_refresh_token', data.refreshToken);
      onLogin(data.admin);
    } catch (err: any) {
      setError('Network error. Check connection.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Courier New', monospace"
    }}>
      <div style={{
        width: 420, background: '#111118', border: '1px solid #1a3a1a', borderRadius: 4, padding: 40,
        boxShadow: '0 0 40px rgba(0,255,0,0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 14, color: '#0f0', letterSpacing: 4, marginBottom: 8 }}>◉ OUROBOROS</div>
          <div style={{ fontSize: 22, color: '#0f0', fontWeight: 'bold', letterSpacing: 2 }}>O.S.C.C.</div>
          <div style={{ fontSize: 10, color: '#0a0', letterSpacing: 3, marginTop: 4 }}>OMNISCIENT SYSTEM CONTROL CONSOLE</div>
          <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, #0f0, transparent)', margin: '16px 0' }} />
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#0a0', fontSize: 11, letterSpacing: 2, display: 'block', marginBottom: 6 }}>OPERATOR EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#0a0a12', border: '1px solid #1a3a1a',
                color: '#0f0', fontFamily: 'inherit', fontSize: 14, borderRadius: 2, outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="admin@ouroboros.io"
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ color: '#0a0', fontSize: 11, letterSpacing: 2, display: 'block', marginBottom: 6 }}>ACCESS KEY</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#0a0a12', border: '1px solid #1a3a1a',
                color: '#0f0', fontFamily: 'inherit', fontSize: 14, borderRadius: 2, outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{ color: '#f44', fontSize: 12, marginBottom: 16, padding: '8px 12px', background: '#1a0a0a', border: '1px solid #3a1a1a', borderRadius: 2 }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px', background: loading ? '#1a1a2a' : '#0a2a0a',
              border: '1px solid #0f0', color: '#0f0', fontFamily: 'inherit', fontSize: 14,
              cursor: loading ? 'wait' : 'pointer', borderRadius: 2, letterSpacing: 2,
              transition: 'all 0.2s'
            }}
          >
            {loading ? '▓ AUTHENTICATING...' : '▶ INITIATE SESSION'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 10, color: '#333' }}>
          ZERO-TRUST MODEL · JWT AUTHENTICATED · BCRYPT SECURED
        </div>
      </div>
    </div>
  );
}

function SystemPanel({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return <div style={{ color: '#555', padding: 16 }}>Loading system data...</div>;

  const uptime = Math.floor(stats.serverUptime);
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  const secs = uptime % 60;
  const mem = stats.memoryUsage;
  const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
  const rssMB = (mem.rss / 1024 / 1024).toFixed(1);

  return (
    <div style={{ padding: 12 }}>
      <SectionTitle>SYSTEM STATUS</SectionTitle>

      <StatusRow label="TICK ENGINE" value={stats.tick.isRunning ? 'RUNNING' : 'PAUSED'} color={stats.tick.isRunning ? '#0f0' : '#f44'} />
      <StatusRow label="CURRENT TICK" value={`#${stats.tick.current}`} />
      <StatusRow label="κ (KAPPA)" value={`${stats.tick.kappa.current}${stats.tick.kappa.isOverridden ? ` [${stats.tick.kappa.ticksLeft} ticks]` : ''}`}
        color={stats.tick.kappa.isOverridden ? '#ff0' : '#0f0'} />
      <StatusRow label="DB STATUS" value="CONNECTED" color="#0f0" />

      <div style={{ height: 1, background: '#1a3a1a', margin: '12px 0' }} />
      <SectionTitle>WORLD STATE</SectionTitle>

      <StatusRow label="AGENTS" value={stats.world.agents.toString()} />
      <StatusRow label="CHUNKS" value={stats.world.chunks.toString()} />
      <StatusRow label="MARKET LISTINGS" value={stats.world.activeListings.toString()} />
      <StatusRow label="ACTIVE EVENTS" value={stats.world.activeEvents.toString()} color={stats.world.activeEvents > 0 ? '#ff0' : '#0f0'} />

      <div style={{ height: 1, background: '#1a3a1a', margin: '12px 0' }} />
      <SectionTitle>RESOURCES</SectionTitle>

      <StatusRow label="UPTIME" value={`${hours}h ${mins}m ${secs}s`} />
      <StatusRow label="HEAP" value={`${heapMB} MB`} />
      <StatusRow label="RSS" value={`${rssMB} MB`} />

      {stats.economy && stats.economy.gdp !== undefined && (
        <>
          <div style={{ height: 1, background: '#1a3a1a', margin: '12px 0' }} />
          <SectionTitle>ECONOMY</SectionTitle>
          <StatusRow label="GDP" value={Number(stats.economy.gdp || 0).toFixed(2)} />
          <StatusRow label="INFLATION" value={`${(Number(stats.economy.inflation_rate || 0) * 100).toFixed(1)}%`} />
          <StatusRow label="TRADE VOL" value={stats.economy.trade_volume?.toString() || '0'} />
        </>
      )}

      <div style={{ height: 1, background: '#1a3a1a', margin: '12px 0' }} />
      <SectionTitle>SECURITY</SectionTitle>
      <StatusRow label="AUDIT (1H)" value={stats.security.recentAuditActions.toString()} />
      <StatusRow label="ANOMALIES (1H)" value={stats.security.recentAnomalies.toString()}
        color={stats.security.recentAnomalies > 0 ? '#f80' : '#0f0'} />
    </div>
  );
}

function EventControlPanel({
  stats, onAction
}: {
  stats: DashboardStats | null;
  onAction: (action: string, payload: any) => Promise<any>;
}) {
  const [eventType, setEventType] = useState('INVASION');
  const [eventName, setEventName] = useState('');
  const [severity, setSeverity] = useState(5);
  const [shockMagnitude, setShockMagnitude] = useState(0.5);
  const [kappaValue, setKappaValue] = useState(1000);
  const [kappaDuration, setKappaDuration] = useState(100);
  const [biomeTarget, setBiomeTarget] = useState('CORRUPTED');
  const [biomeWeight, setBiomeWeight] = useState(1.0);
  const [loreTitle, setLoreTitle] = useState('');
  const [loreContent, setLoreContent] = useState('');
  const [rollbackTick, setRollbackTick] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const exec = async (action: string, payload: any) => {
    setProcessing(true);
    setFeedback(null);
    try {
      const result = await onAction(action, payload);
      setFeedback({ type: 'success', message: JSON.stringify(result).slice(0, 200) });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
    setProcessing(false);
  };

  return (
    <div style={{ padding: 12 }}>
      <SectionTitle>TICK ENGINE CONTROL</SectionTitle>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <ActionButton color="#0f0" disabled={processing || !stats?.tick.isRunning} onClick={() => exec('tick/pause', {})}>
          ⏸ PAUSE
        </ActionButton>
        <ActionButton color="#0f0" disabled={processing || (stats?.tick.isRunning ?? false)} onClick={() => exec('tick/resume', {})}>
          ▶ RESUME
        </ActionButton>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <InputField label="κ VALUE" type="number" value={kappaValue} onChange={v => setKappaValue(Number(v))} width={100} />
        <InputField label="TICKS" type="number" value={kappaDuration} onChange={v => setKappaDuration(Number(v))} width={80} />
        <ActionButton color="#ff0" onClick={() => exec('tick/modify-kappa', { kappa: kappaValue, durationTicks: kappaDuration })}>
          SET κ
        </ActionButton>
      </div>

      <div style={{ height: 1, background: '#1a3a1a', margin: '16px 0' }} />
      <SectionTitle>LIVE EVENT CREATOR</SectionTitle>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {['INVASION', 'ECONOMIC_SHOCK', 'BIOME_SHIFT', 'LORE_INJECTION'].map(t => (
          <button key={t} onClick={() => setEventType(t)} style={{
            padding: '6px 10px', background: eventType === t ? '#0a2a0a' : '#0a0a12',
            border: `1px solid ${eventType === t ? '#0f0' : '#1a3a1a'}`, color: eventType === t ? '#0f0' : '#555',
            fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', borderRadius: 2, letterSpacing: 1
          }}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {eventType === 'INVASION' && (
        <div>
          <InputField label="EVENT NAME" value={eventName} onChange={setEventName} />
          <div style={{ marginBottom: 8 }}>
            <label style={{ color: '#0a0', fontSize: 10, letterSpacing: 1, display: 'block', marginBottom: 4 }}>
              SEVERITY: {severity}/10
            </label>
            <input type="range" min={1} max={10} value={severity} onChange={e => setSeverity(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0f0' }} />
          </div>
          <ActionButton color="#f44" onClick={() => exec('events/create', { eventType: 'INVASION', name: eventName || 'Dark Invasion', severity, parameters: {} })}>
            ⚔ SPAWN INVASION
          </ActionButton>
        </div>
      )}

      {eventType === 'ECONOMIC_SHOCK' && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ color: '#0a0', fontSize: 10, letterSpacing: 1, display: 'block', marginBottom: 4 }}>
              MAGNITUDE: {shockMagnitude.toFixed(2)} · Price = Price × (1 + {shockMagnitude.toFixed(2)}/κ)
            </label>
            <input type="range" min={-90} max={1000} value={shockMagnitude * 100} onChange={e => setShockMagnitude(Number(e.target.value) / 100)}
              style={{ width: '100%', accentColor: '#ff0' }} />
          </div>
          <ActionButton color="#ff0" onClick={() => exec('world/economic-shock', { magnitude: shockMagnitude })}>
            💥 TRIGGER ECONOMIC SHOCK
          </ActionButton>
        </div>
      )}

      {eventType === 'BIOME_SHIFT' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <InputField label="TARGET BIOME" value={biomeTarget} onChange={setBiomeTarget} />
            <InputField label="WEIGHT" type="number" value={biomeWeight} onChange={v => setBiomeWeight(Number(v))} width={80} />
          </div>
          <div style={{ color: '#555', fontSize: 10, marginBottom: 8 }}>P_new = P_old × e^({biomeWeight}/κ)</div>
          <ActionButton color="#0ff" onClick={() => exec('world/biome-shift', { targetBiome: biomeTarget, eventWeight: biomeWeight })}>
            🌍 APPLY BIOME SHIFT
          </ActionButton>
        </div>
      )}

      {eventType === 'LORE_INJECTION' && (
        <div>
          <InputField label="TITLE" value={loreTitle} onChange={setLoreTitle} />
          <div style={{ marginBottom: 8 }}>
            <label style={{ color: '#0a0', fontSize: 10, letterSpacing: 1, display: 'block', marginBottom: 4 }}>CONTENT</label>
            <textarea value={loreContent} onChange={e => setLoreContent(e.target.value)} rows={4}
              style={{
                width: '100%', padding: 8, background: '#0a0a12', border: '1px solid #1a3a1a',
                color: '#0f0', fontFamily: 'inherit', fontSize: 12, borderRadius: 2, resize: 'vertical',
                outline: 'none', boxSizing: 'border-box'
              }} />
          </div>
          <ActionButton color="#a0f" onClick={() => exec('world/inject-lore', { title: loreTitle, content: loreContent })}>
            📜 INJECT LORE
          </ActionButton>
        </div>
      )}

      <div style={{ height: 1, background: '#1a3a1a', margin: '16px 0' }} />
      <SectionTitle>EMERGENCY CONTROLS</SectionTitle>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <InputField label="ROLLBACK TO TICK" type="number" value={rollbackTick} onChange={v => setRollbackTick(Number(v))} width={120} />
        <ActionButton color="#f44" onClick={() => {
          if (confirm(`EMERGENCY ROLLBACK to tick ${rollbackTick}? This will pause the engine and delete tick data.`)) {
            exec('world/rollback', { targetTick: rollbackTick });
          }
        }}>
          ⚠ ROLLBACK
        </ActionButton>
      </div>

      {feedback && (
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 2, fontSize: 11,
          background: feedback.type === 'success' ? '#0a1a0a' : '#1a0a0a',
          border: `1px solid ${feedback.type === 'success' ? '#0f0' : '#f44'}`,
          color: feedback.type === 'success' ? '#0f0' : '#f44',
          wordBreak: 'break-all'
        }}>
          {feedback.type === 'success' ? '✓ ' : '✗ '}{feedback.message}
        </div>
      )}
    </div>
  );
}

function AuditPanel({ auditLogs, anomalies, events }: { auditLogs: AuditLog[]; anomalies: any[]; events: LiveEvent[] }) {
  const [tab, setTab] = useState<'audit' | 'security' | 'events'>('audit');

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['audit', 'security', 'events'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 12px', background: tab === t ? '#0a2a0a' : '#0a0a12',
            border: `1px solid ${tab === t ? '#0f0' : '#1a3a1a'}`, color: tab === t ? '#0f0' : '#555',
            fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', borderRadius: 2, letterSpacing: 1,
            textTransform: 'uppercase'
          }}>
            {t === 'audit' ? `AUDIT (${auditLogs.length})` : t === 'security' ? `ALERTS (${anomalies.length})` : `EVENTS (${events.length})`}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
        {tab === 'audit' && auditLogs.map(log => (
          <div key={log.id} style={{
            padding: '8px 10px', borderBottom: '1px solid #111', fontSize: 11, color: '#0a0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: actionColor(log.action), fontWeight: 'bold' }}>{log.action}</span>
              <span style={{ color: '#444', fontSize: 9 }}>{formatTime(log.timestamp)}</span>
            </div>
            <div style={{ color: '#555' }}>
              {log.target_type}:{log.target_id} · {log.ip_address}
            </div>
          </div>
        ))}

        {tab === 'security' && (anomalies.length === 0 ? (
          <div style={{ color: '#0f0', padding: 16, textAlign: 'center', fontSize: 12 }}>
            ✓ NO ANOMALIES DETECTED
          </div>
        ) : anomalies.map((a: any) => (
          <div key={a.id} style={{
            padding: '8px 10px', borderBottom: '1px solid #111', fontSize: 11,
            color: a.severity === 'CRITICAL' ? '#f44' : a.severity === 'HIGH' ? '#f80' : '#ff0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontWeight: 'bold' }}>[{a.severity}] {a.pattern}</span>
              <span style={{ color: '#444', fontSize: 9 }}>{formatTime(a.timestamp)}</span>
            </div>
            <div style={{ color: '#555' }}>{a.source_ip}</div>
          </div>
        )))}

        {tab === 'events' && events.map(ev => (
          <div key={ev.id} style={{
            padding: '8px 10px', borderBottom: '1px solid #111', fontSize: 11
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: ev.status === 'ACTIVE' ? '#f80' : '#0f0', fontWeight: 'bold' }}>
                {ev.event_type}: {ev.name}
              </span>
              <span style={{ color: ev.status === 'ACTIVE' ? '#f80' : '#555', fontSize: 9 }}>{ev.status}</span>
            </div>
            <div style={{ color: '#555' }}>
              Severity: {ev.severity} · {formatTime(ev.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: '#0a0', fontSize: 10, letterSpacing: 3, marginBottom: 10, fontWeight: 'bold',
      borderBottom: '1px solid #1a3a1a', paddingBottom: 4
    }}>
      {children}
    </div>
  );
}

function StatusRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}>
      <span style={{ color: '#555' }}>{label}</span>
      <span style={{ color: color || '#0f0', fontWeight: 'bold' }}>{value}</span>
    </div>
  );
}

function ActionButton({ children, color, onClick, disabled }: {
  children: React.ReactNode; color: string; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '8px 14px', background: disabled ? '#111' : '#0a0a12',
      border: `1px solid ${disabled ? '#222' : color}`, color: disabled ? '#333' : color,
      fontFamily: "'Courier New', monospace", fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer',
      borderRadius: 2, letterSpacing: 1, whiteSpace: 'nowrap', transition: 'all 0.2s'
    }}>
      {children}
    </button>
  );
}

function InputField({ label, value, onChange, type, width }: {
  label: string; value: any; onChange: (v: string) => void; type?: string; width?: number;
}) {
  return (
    <div style={{ marginBottom: 8, flex: width ? `0 0 ${width}px` : 1 }}>
      <label style={{ color: '#0a0', fontSize: 10, letterSpacing: 1, display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '6px 8px', background: '#0a0a12', border: '1px solid #1a3a1a',
          color: '#0f0', fontFamily: 'inherit', fontSize: 12, borderRadius: 2, outline: 'none',
          boxSizing: 'border-box'
        }} />
    </div>
  );
}

function actionColor(action: string): string {
  if (action.includes('LOGIN') || action.includes('LOGOUT')) return '#0ff';
  if (action.includes('ROLLBACK') || action.includes('INVASION')) return '#f44';
  if (action.includes('SHOCK') || action.includes('KAPPA')) return '#ff0';
  if (action.includes('PAUSE') || action.includes('RESUME')) return '#f80';
  if (action.includes('EVENT') || action.includes('BIOME')) return '#0f0';
  return '#0a0';
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false }) + ' ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ts; }
}

export default function OsccDashboard() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('oscc_access_token');
    if (token) {
      adminFetch('/session').then(res => res.json()).then(data => {
        if (data.authenticated) {
          setSession(data.admin);
        }
      }).catch(() => {
        localStorage.removeItem('oscc_access_token');
        localStorage.removeItem('oscc_refresh_token');
      });
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!session) return;
    try {
      const [statsRes, auditRes, anomalyRes, eventsRes] = await Promise.all([
        adminFetch('/dashboard-stats'),
        adminFetch('/audit-logs?limit=50'),
        adminFetch('/anomaly-logs?limit=30'),
        adminFetch('/events?limit=30')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (auditRes.ok) { const d = await auditRes.json(); setAuditLogs(d.logs || []); }
      if (anomalyRes.ok) { const d = await anomalyRes.json(); setAnomalies(d.anomalies || []); }
      if (eventsRes.ok) { const d = await eventsRes.json(); setEvents(d.events || []); }
      setConnectionStatus('connected');
    } catch (err: any) {
      setConnectionStatus('disconnected');
      if (err.message === 'SESSION_EXPIRED') {
        setSession(null);
      }
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchAllData();
      pollRef.current = setInterval(fetchAllData, 2000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session, fetchAllData]);

  const handleAction = async (action: string, payload: any) => {
    const method = action.startsWith('tick/') && action.includes('status') ? 'GET' : 'POST';
    const res = await adminFetch(`/${action}`, {
      method,
      body: method === 'POST' ? JSON.stringify(payload) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Action failed');
    setTimeout(fetchAllData, 500);
    return data;
  };

  const handleLogout = async () => {
    try { await adminFetch('/logout', { method: 'POST' }); } catch (_) {}
    localStorage.removeItem('oscc_access_token');
    localStorage.removeItem('oscc_refresh_token');
    setSession(null);
  };

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Courier New', monospace",
      color: '#0f0', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', background: '#0a0a14', borderBottom: '1px solid #1a3a1a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, letterSpacing: 2, fontWeight: 'bold' }}>◉ O.S.C.C.</span>
          <span style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>OMNISCIENT SYSTEM CONTROL CONSOLE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontSize: 9, padding: '3px 8px', borderRadius: 2,
            background: connectionStatus === 'connected' ? '#0a1a0a' : '#1a0a0a',
            border: `1px solid ${connectionStatus === 'connected' ? '#0f0' : '#f44'}`,
            color: connectionStatus === 'connected' ? '#0f0' : '#f44'
          }}>
            {connectionStatus === 'connected' ? '● LIVE' : '○ OFFLINE'}
          </span>
          <span style={{ fontSize: 10, color: '#555' }}>{session.email}</span>
          <span style={{ fontSize: 9, color: '#0a0', padding: '2px 6px', border: '1px solid #1a3a1a', borderRadius: 2, textTransform: 'uppercase' }}>
            {session.role}
          </span>
          <button onClick={handleLogout} style={{
            padding: '4px 10px', background: 'none', border: '1px solid #3a1a1a',
            color: '#f44', fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', borderRadius: 2
          }}>
            DISCONNECT
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: 280, borderRight: '1px solid #1a3a1a', overflowY: 'auto',
          background: '#0a0a10'
        }}>
          <SystemPanel stats={stats} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid #1a3a1a' }}>
          <EventControlPanel stats={stats} onAction={handleAction} />
        </div>

        <div style={{ width: 340, overflowY: 'auto', background: '#0a0a10' }}>
          <AuditPanel auditLogs={auditLogs} anomalies={anomalies} events={events} />
        </div>
      </div>
    </div>
  );
}
