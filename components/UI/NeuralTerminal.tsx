
import React, { useState } from 'react';
import { useStore } from '../store';
import { Key, ShieldCheck } from 'lucide-react';

const NeuralTerminal = () => {
  const { 
    isAxiomAuthenticated, 
    setAxiomAuthenticated,
    userApiKey, 
    setUserApiKey 
  } = useStore(state => ({
    isAxiomAuthenticated: state.isAxiomAuthenticated,
    setAxiomAuthenticated: state.setAxiomAuthenticated,
    userApiKey: state.userApiKey,
    setUserApiKey: state.setUserApiKey,
  }));

  const [keyInput, setKeyInput] = useState(userApiKey || '');

  const handleAuth = () => {
    // This key is the "Universal Key" for gamemaster and admin access.
    const gamemasterKey = "GENER4T1V33ALLACCESSNT1TYNPLU21P1P1K4TZE4I";

    if (keyInput === gamemasterKey) {
      setUserApiKey(keyInput);
      setAxiomAuthenticated(true);
    } else {
      alert('Invalid Axiom Key');
    }
  };

  if (isAxiomAuthenticated) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-4">
        <ShieldCheck className="w-6 h-6 text-green-500" />
        <div>
          <h4 className="text-green-400 text-xs font-bold">Handshake Complete</h4>
          <p className="text-xs text-green-400/70">Axiomatic controls enabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4 text-yellow-400" />
        <label className="text-sm font-bold text-yellow-400">Axiom Key</label>
      </div>
      <input
        type="password"
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        className="w-full bg-black/20 text-white p-2 rounded"
        placeholder="Enter Axiom Key..."
      />
      <button
        onClick={handleAuth}
        className="w-full bg-yellow-400 text-black font-bold p-2 rounded hover:bg-yellow-500 transition-colors"
      >
        Authenticate
      </button>
    </div>
  );
};

export default NeuralTerminal;
