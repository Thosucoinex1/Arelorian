import { useEffect } from 'react';
import { useStore } from '../../store';
import { User, Shield, Map, ShoppingCart, Github, LogOut } from 'lucide-react';

export const MainMenu = () => {
  const toggleCharacterSheet = useStore(state => state.toggleCharacterSheet);
  const toggleAdmin = useStore(state => state.toggleAdmin);
  const toggleMap = useStore(state => state.toggleMap);
  const toggleMarket = useStore(state => state.toggleMarket);
  const showAdmin = useStore(state => state.showAdmin);

  const storeUser = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);





  return (
    <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4">
      <button className="p-4 bg-gray-700/80 backdrop-blur-md rounded-full border border-gray-500/30 shadow-lg text-white hover:bg-gray-500 hover:text-white transition-colors">
        <Github size={24} />
      </button>
      <button onClick={() => toggleCharacterSheet(true)} className="p-4 bg-axiom-dark/80 backdrop-blur-md rounded-full border border-axiom-cyan/30 shadow-lg text-white hover:bg-axiom-cyan hover:text-black transition-colors">
        <User size={24} />
      </button>
      <button onClick={() => toggleMap(true)} className="p-4 bg-axiom-dark/80 backdrop-blur-md rounded-full border border-axiom-cyan/30 shadow-lg text-white hover:bg-axiom-cyan hover:text-black transition-colors">
        <Map size={24} />
      </button>
      <button onClick={() => toggleMarket(true)} className="p-4 bg-axiom-dark/80 backdrop-blur-md rounded-full border border-axiom-cyan/30 shadow-lg text-white hover:bg-axiom-cyan hover:text-black transition-colors">
        <ShoppingCart size={24} />
      </button>
      {showAdmin && (
        <button onClick={() => toggleAdmin(true)} className="p-4 bg-axiom-purple/80 backdrop-blur-md rounded-full border border-axiom-purple/30 shadow-lg text-white hover:bg-axiom-purple hover:text-black transition-colors">
          <Shield size={24} />
        </button>
      )}
    </div>
  );
};
