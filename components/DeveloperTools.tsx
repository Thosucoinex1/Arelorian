import React from 'react';
import { useStore } from '../store';
import { X } from 'lucide-react';

export const DeveloperTools = () => {
  const showDeveloperTools = useStore(state => state.showDeveloperTools);
  const toggleDeveloperTools = useStore(state => state.toggleDeveloperTools);

  if (!showDeveloperTools) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center">
      <div className="bg-axiom-dark p-8 rounded-lg shadow-2xl border border-axiom-cyan/30 w-11/12 max-w-3xl h-3/4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Developer Tools</h2>
          <button onClick={() => toggleDeveloperTools(false)} className="p-2 rounded-full text-white hover:bg-axiom-cyan hover:text-black transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto text-white/80">
          {/* Developer Tools Content Goes Here */}
          <p>Welcome to the Ouroboros Developer Tools. More functionality coming soon!</p>
        </div>
      </div>
    </div>
  );
};
