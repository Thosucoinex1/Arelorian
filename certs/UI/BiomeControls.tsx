import { useStore } from '../../store';
import { Switch } from './Switch'; // Assuming a Switch component exists

export const BiomeControls = () => {
  const showAdmin = useStore(state => state.showAdmin);
  const debugBiomeEnabled = useStore(state => state.debugBiomeEnabled);
  const debugBiome = useStore(state => state.debugBiome);
  const toggleDebugBiome = useStore(state => state.toggleDebugBiome);
  const setDebugBiome = useStore(state => state.setDebugBiome);

  if (!showAdmin) {
    return null;
  }

  const biomes = ['CITY', 'FOREST', 'MOUNTAIN', 'PLAINS'];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-axiom-dark/80 backdrop-blur-md p-4 rounded-lg border border-axiom-cyan/30 shadow-lg flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Switch checked={debugBiomeEnabled} onChange={toggleDebugBiome} />
        <span className="text-xs font-bold text-white uppercase">Biome Override</span>
      </div>
      {debugBiomeEnabled && (
        <div className="flex items-center gap-2">
          {biomes.map((biome, index) => (
            <button
              key={biome}
              onClick={() => setDebugBiome(index)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                debugBiome === index
                  ? 'bg-axiom-cyan text-black'
                  : 'bg-axiom-dark-700 text-gray-400 hover:bg-axiom-dark-600'
              }`}>
              {biome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
