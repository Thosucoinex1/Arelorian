
import { useStore } from '../../store';
import { User, Shield, Map, ShoppingCart, LogOut, Settings, Save, UserPlus, Zap } from 'lucide-react';

export const MainMenu = () => {
  const toggleWindow = useStore(state => state.toggleWindow);
  const toggleCharacterSheet = useStore(state => state.toggleCharacterSheet);
  const toggleAdmin = useStore(state => state.toggleAdmin);
  const toggleMap = useStore(state => state.toggleMap);
  const toggleMarket = useStore(state => state.toggleMarket);
  const showAdmin = useStore(state => state.showAdmin);
  const toggleDeveloperTools = useStore(state => state.toggleDeveloperTools);
  const saveGame = useStore(state => state.saveGame);
  const matrixEnergy = useStore(state => state.matrixEnergy);

  return (
    <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4">
      <button
        onClick={() => {
          localStorage.removeItem('ouroboros_user_token');
          localStorage.removeItem('ouroboros_game_phase');
          localStorage.removeItem('ouroboros_has_character');
          window.location.href = '/';
        }}
        className="p-4 bg-red-900/60 backdrop-blur-md rounded-full border border-red-500/30 shadow-lg text-red-300 hover:bg-red-600 hover:text-white transition-colors"
        title="Sign Out"
      >
        <LogOut size={24} />
      </button>
      <button onClick={() => saveGame()} className="p-4 bg-axiom-dark/80 backdrop-blur-md rounded-full border border-axiom-gold/30 shadow-lg text-white hover:bg-axiom-gold hover:text-black transition-colors" title="Save Game">
        <Save size={24} />
      </button>
      <button onClick={() => toggleCharacterSheet(true)} className="p-4 bg-axiom-dark/80 backdrop-blur-md rounded-full border border-axiom-cyan/30 shadow-lg text-white hover:bg-axiom-cyan hover:text-black transition-colors" title="Character">
        <User size={24} />
      </button>
      <button onClick={() => toggleWindow('AGENT_MANAGER', true)} className="p-4 bg-axiom-dark/80 backdrop-blur-md rounded-full border border-cyan-500/30 shadow-lg text-white hover:bg-cyan-500 hover:text-black transition-colors" title="Agent Manager">
        <UserPlus size={24} />
      </button>
      <button onClick={() => toggleWindow('ENERGY_SHOP', true)} className="relative p-4 bg-axiom-dark/80 backdrop-blur-md rounded-full border border-yellow-500/30 shadow-lg text-white hover:bg-yellow-500 hover:text-black transition-colors" title="Matrix Energy Shop">
        <Zap size={24} />
        <span className="absolute -top-1 -right-1 text-[8px] bg-yellow-500 text-black font-black rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{matrixEnergy}</span>
      </button>
      <button onClick={() => toggleMap(true)} className="p-4 bg-axiom-dark/80 backdrop-blur-md rounded-full border border-axiom-cyan/30 shadow-lg text-white hover:bg-axiom-cyan hover:text-black transition-colors" title="World Map">
        <Map size={24} />
      </button>
      <button onClick={() => toggleMarket(true)} className="p-4 bg-axiom-dark/80 backdrop-blur-md rounded-full border border-axiom-cyan/30 shadow-lg text-white hover:bg-axiom-cyan hover:text-black transition-colors" title="Market">
        <ShoppingCart size={24} />
      </button>
      {showAdmin && (
        <>
          <button onClick={() => toggleAdmin(true)} className="p-4 bg-axiom-purple/80 backdrop-blur-md rounded-full border border-axiom-purple/30 shadow-lg text-white hover:bg-axiom-purple hover:text-black transition-colors">
            <Shield size={24} />
          </button>
          <button onClick={() => toggleDeveloperTools(true)} className="p-4 bg-axiom-purple/80 backdrop-blur-md rounded-full border border-axiom-purple/30 shadow-lg text-white hover:bg-axiom-purple hover:text-black transition-colors">
            <Settings size={24} />
          </button>
        </>
      )}
    </div>
  );
};
