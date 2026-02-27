
import { useState } from 'react';
import { useStore } from '../../store';
import { Shield, Plus, Minus, X } from 'lucide-react';

export const GuildPartyOverlay = () => {
  const toggleWindow = useStore(state => state.toggleWindow);
  const minimizeWindow = useStore(state => state.minimizeWindow);
  const guilds = useStore(state => state.guilds);
  const parties = useStore(state => state.parties);
  const agents = useStore(state => state.agents);
  const createGuild = useStore(state => state.createGuild);
  const joinGuild = useStore(state => state.joinGuild);
  const leaveGuild = useStore(state => state.leaveGuild);
  const createParty = useStore(state => state.createParty);
  const joinParty = useStore(state => state.joinParty);
  const leaveParty = useStore(state => state.leaveParty);
  
  const [activeTab, setActiveTab] = useState<'GUILDS' | 'PARTIES'>('GUILDS');
  const [newGuildName, setNewGuildName] = useState('');

  const userAgent = agents.find(a => a.faction === 'PLAYER'); // Assuming user controls a player agent

  return (
    <div 
      className="fixed top-24 right-8 w-80 bg-black/80 border border-white/10 rounded-3xl backdrop-blur-xl z-40 overflow-hidden flex flex-col max-h-[70vh]"
    >
      <div className="flex justify-between items-center bg-white/5 border-b border-white/10 px-4">
        <div className="flex flex-1">
          <button 
            onClick={() => setActiveTab('GUILDS')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'GUILDS' ? 'text-axiom-cyan' : 'text-gray-500 hover:text-white'}`}
          >
            Guilds
          </button>
          <button 
            onClick={() => setActiveTab('PARTIES')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PARTIES' ? 'text-axiom-gold' : 'text-gray-500 hover:text-white'}`}
          >
            Parties
          </button>
        </div>
        <div className="flex gap-1 ml-2">
          <button 
            onClick={() => minimizeWindow('GUILD_PARTY')} 
            className="p-1 text-gray-500 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button 
            onClick={() => toggleWindow('GUILD_PARTY', false)} 
            className="p-1 text-gray-500 hover:text-white transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {activeTab === 'GUILDS' ? (
          <>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="New Guild Name..." 
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-axiom-cyan/40"
                  value={newGuildName}
                  onChange={e => setNewGuildName(e.target.value)}
                />
                <button 
                  onClick={() => {
                    if (newGuildName && userAgent) {
                      createGuild(newGuildName, userAgent.id);
                      setNewGuildName('');
                    }
                  }}
                  className="p-2 bg-axiom-cyan text-black rounded-xl hover:bg-white transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {guilds.map(guild => (
                <div key={guild.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[11px] font-black text-white">{guild.name}</div>
                      <div className="text-[8px] text-gray-500 uppercase tracking-tighter">Level {guild.level} • {guild.memberIds.length} Members</div>
                    </div>
                    <Shield className="w-3 h-3 text-axiom-cyan" />
                  </div>
                  <div className="flex gap-2">
                    {userAgent && !guild.memberIds.includes(userAgent.id) ? (
                      <button 
                        onClick={() => joinGuild(guild.id, userAgent.id)}
                        className="flex-1 py-1.5 bg-axiom-cyan/20 text-axiom-cyan border border-axiom-cyan/30 rounded-lg text-[9px] font-bold uppercase hover:bg-axiom-cyan hover:text-black transition-all"
                      >
                        Join
                      </button>
                    ) : userAgent && guild.memberIds.includes(userAgent.id) && (
                      <button 
                        onClick={() => leaveGuild(guild.id, userAgent.id)}
                        className="flex-1 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-bold uppercase hover:bg-red-500 hover:text-white transition-all"
                      >
                        Leave
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button 
              onClick={() => userAgent && createParty(userAgent.id)}
              className="w-full py-3 bg-axiom-gold/20 text-axiom-gold border border-axiom-gold/30 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-axiom-gold hover:text-black transition-all mb-4"
            >
              Create Party
            </button>

            <div className="space-y-3">
              {parties.map(party => (
                <div key={party.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] font-bold text-white">Party #{party.id.slice(-4)}</div>
                    <div className="flex -space-x-2">
                      {party.memberIds.slice(0, 3).map(id => (
                        <div key={id} className="w-5 h-5 rounded-full bg-axiom-gold/40 border border-black flex items-center justify-center text-[8px] text-white">
                          {agents.find(a => a.id === id)?.name[0]}
                        </div>
                      ))}
                      {party.memberIds.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-gray-800 border border-black flex items-center justify-center text-[8px] text-white">
                          +{party.memberIds.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[8px] text-gray-500 uppercase">{party.memberIds.length} / 4 Members</div>
                  <div className="flex gap-2">
                    {userAgent && !party.memberIds.includes(userAgent.id) ? (
                      <button 
                        onClick={() => joinParty(party.id, userAgent.id)}
                        className="flex-1 py-1.5 bg-white/5 text-white border border-white/10 rounded-lg text-[9px] font-bold uppercase hover:bg-white hover:text-black transition-all"
                      >
                        Join
                      </button>
                    ) : userAgent && party.memberIds.includes(userAgent.id) && (
                      <button 
                        onClick={() => leaveParty(party.id, userAgent.id)}
                        className="flex-1 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-bold uppercase hover:bg-red-500 hover:text-white transition-all"
                      >
                        Leave
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
