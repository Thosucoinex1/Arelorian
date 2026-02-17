import React from 'react';
import { useStore } from '../../store';
import { Item, ItemType, ItemRarity, ItemStats } from '../../types';
import { calculateCombatRating, calculateItemRating, ITEM_SETS } from '../../utils';

const RarityColor = (rarity: ItemRarity) => {
  switch (rarity) {
    case 'LEGENDARY': return 'border-orange-500 text-orange-500 shadow-lg shadow-orange-500/50';
    case 'EPIC': return 'border-purple-500 text-purple-500 shadow-md shadow-purple-500/50';
    case 'RARE': return 'border-blue-500 text-blue-500 shadow-sm shadow-blue-500/50';
    case 'UNCOMMON': return 'border-green-500 text-green-500 shadow-sm shadow-green-500/30';
    default: return 'border-gray-600 text-gray-400';
  }
};

const StatRow = ({ label, value, color, icon }: { label: string, value: number, color: string, icon: string }) => (
  <div className={`flex justify-between items-center p-2 rounded bg-black/40 border border-white/5 ${color} hover:bg-white/5 transition-colors`}>
    <div className="flex items-center space-x-3">
      <span className="text-lg filter drop-shadow-md">{icon}</span>
      <span className="font-bold uppercase text-[10px] tracking-widest text-gray-300">{label}</span>
    </div>
    <span className="font-mono text-lg font-bold filter drop-shadow-sm">{value}</span>
  </div>
);

const ItemSlot = ({ item, type, label, onClick, equippedItem, isUpgrade, activeSetCount }: { item: Item | null | undefined, type?: string, label?: string, onClick?: () => void, equippedItem?: Item | null, isUpgrade?: boolean, activeSetCount?: number }) => {
  const getIconForSlot = (slotType?: string) => {
      switch(slotType) {
          case 'HEAD': return '🪖';
          case 'CHEST': return '👕';
          case 'LEGS': return '👖';
          case 'MAIN': return '⚔️';
          case 'OFFHAND': return '🛡️';
          case 'NECK': return '📿';
          case 'WAIST': return '🥋';
          case 'FINGER': return '💍';
          default: return '';
      }
  };

  if (!item) {
    return (
      <div className="w-12 h-12 bg-black/60 border border-white/10 rounded flex items-center justify-center relative group opacity-50">
        <span className="text-xl grayscale opacity-30">{getIconForSlot(type)}</span>
      </div>
    );
  }

  const rarityClass = RarityColor(item.rarity);
  const isLegendary = item.rarity === 'LEGENDARY';
  const isEpic = item.rarity === 'EPIC';
  
  const glowClasses = isLegendary 
      ? 'shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-[pulse_3s_ease-in-out_infinite] ring-1 ring-orange-500/30' 
      : isEpic
      ? 'shadow-[0_0_10px_rgba(168,85,247,0.5)] ring-1 ring-purple-500/30' 
      : '';

  const getStatDiff = (stat: keyof ItemStats, val: number) => {
      if (!equippedItem || item.id === equippedItem.id) return null;
      
      const equippedVal = equippedItem.stats[stat] || 0;
      const diff = val - equippedVal;
      
      if (diff === 0) return null;
      
      return (
          <span className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded border ${diff > 0 ? 'bg-green-900/50 border-green-500/50 text-green-300' : 'bg-red-900/50 border-red-500/50 text-red-300'}`}>
              {diff > 0 ? '+' : ''}{diff}
          </span>
      );
  };

  const setDefinition = item.setName ? ITEM_SETS[item.setName] : null;
  const isSetBonusActive = (activeSetCount || 0) >= 2;

  return (
    <div 
        onClick={onClick}
        className={`w-12 h-12 bg-black/80 border-2 rounded flex items-center justify-center relative group cursor-pointer hover:bg-white/5 transition-all active:scale-95 ${rarityClass} ${glowClasses}`}
    >
      <div 
        className="w-full h-full opacity-80"
        style={{ background: `radial-gradient(circle, ${item.iconColor}20 0%, transparent 70%)` }}
      />
      <span className="absolute text-xl">
        {item.subtype === 'BOW' || item.subtype === 'CROSSBOW' ? '🏹' : item.subtype.includes('STAFF') || item.subtype.includes('TOME') ? '🔮' : getIconForSlot(type)}
      </span>
      
      {item.setName && (
          <div className="absolute bottom-0.5 right-0.5 z-10">
              <div className={`w-3.5 h-3.5 bg-[#111] border rounded-full flex items-center justify-center shadow-lg ${isSetBonusActive ? 'border-green-400 text-green-400 shadow-green-400/20' : 'border-axiom-gold/50 text-axiom-gold shadow-axiom-gold/20'}`}>
                 <span className="text-[8px] font-serif font-bold">✦</span>
              </div>
          </div>
      )}

      {isUpgrade && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce z-10 border border-black">
              <span className="text-black text-[10px] font-bold">▲</span>
          </div>
      )}
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-black/95 border border-white/20 p-3 rounded z-50 pointer-events-none hidden group-hover:block shadow-xl backdrop-blur-md">
        <h4 className={`font-serif text-sm font-bold ${rarityClass.split(' ')[1]}`}>{item.name}</h4>
        <div className="text-[10px] text-gray-400 mt-1 uppercase flex justify-between">
            <span>{item.rarity} {item.subtype.replace('_', ' ')}</span>
            {equippedItem && item.id !== equippedItem.id && <span className="text-gray-500 italic">vs Equipped</span>}
        </div>
        
        <div className="mt-2 space-y-1 text-xs text-white">
           {item.stats.dmg ? <div className="text-red-400 flex justify-between items-center"><span>Damage: {item.stats.dmg}</span> {getStatDiff('dmg', item.stats.dmg)}</div> : null}
           {item.stats.str ? <div className="flex justify-between items-center"><span>+ {item.stats.str} Strength</span> {getStatDiff('str', item.stats.str)}</div> : null}
           {item.stats.agi ? <div className="flex justify-between items-center"><span>+ {item.stats.agi} Agility</span> {getStatDiff('agi', item.stats.agi)}</div> : null}
           {item.stats.int ? <div className="flex justify-between items-center"><span>+ {item.stats.int} Intellect</span> {getStatDiff('int', item.stats.int)}</div> : null}
           {item.stats.vit ? <div className="flex justify-between items-center"><span>+ {item.stats.vit} Vitality</span> {getStatDiff('vit', item.stats.vit)}</div> : null}
        </div>

        {item.effects && item.effects.length > 0 && (
             <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-axiom-cyan">
                {item.effects.map((e, i) => (
                    <div key={i}>✦ {e.type.replace('ON_HIT_', '').replace('_', ' ')} +{e.value}</div>
                ))}
             </div>
        )}

        {setDefinition && item.setName && (
             <div className="mt-3 pt-2 border-t border-white/10">
                <div className="text-axiom-gold font-bold text-xs mb-1">{item.setName} Set ({activeSetCount || 0}/4)</div>
                <div className="space-y-1">
                    {Object.entries(setDefinition).map(([count, effects]) => {
                        const isActive = (activeSetCount || 0) >= parseInt(count);
                        return (
                            <div key={count} className={`text-[10px] ${isActive ? 'text-green-400 font-bold' : 'text-gray-600'}`}>
                                {effects.map(e => e.description).join(', ')}
                            </div>
                        );
                    })}
                </div>
             </div>
        )}
        
        <div className="mt-2 text-[10px] text-gray-500 italic border-t border-gray-800 pt-2 leading-tight">
            "{item.description}"
        </div>
        
        {onClick && <div className="mt-2 text-[10px] text-axiom-gold italic font-bold text-center animate-pulse">Click to Equip</div>}
      </div>
    </div>
  );
};

export const CharacterSheet = () => {
  const selectedAgentId = useStore(state => state.selectedAgentId);
  const agents = useStore(state => state.agents);
  const toggleCharacterSheet = useStore(state => state.toggleCharacterSheet);
  const equipItem = useStore(state => state.equipItem);
  const isOpen = useStore(state => state.showCharacterSheet);

  const agent = agents.find(a => a.id === selectedAgentId);

  if (!isOpen || !agent) return null;

  const combatRating = calculateCombatRating(agent);

  const equippedSetCounts: Record<string, number> = {};
  Object.values(agent.equipment).forEach((val) => {
      const item = val as Item | null;
      if(item?.setName) equippedSetCounts[item.setName] = (equippedSetCounts[item.setName] || 0) + 1;
  });

  const getEquippedItem = (itemType: ItemType | undefined) => {
      if (!itemType) return null;
      if (itemType === 'WEAPON') return agent.equipment.mainHand;
      if (itemType === 'OFFHAND') return agent.equipment.offHand;
      if (itemType === 'HELM') return agent.equipment.head;
      if (itemType === 'CHEST') return agent.equipment.chest;
      if (itemType === 'LEGS') return agent.equipment.legs;
      if (itemType === 'NECK') return agent.equipment.neck;
      if (itemType === 'WAIST') return agent.equipment.waist;
      // For fingers, generic comparison to first finger or best logic could go here, for now compare to 1
      if (itemType === 'FINGER') return agent.equipment.finger1; 
      return null;
  };
  
  const checkUpgrade = (inventoryItem: Item | null): boolean => {
      if (!inventoryItem) return false;
      const currentEquipped = getEquippedItem(inventoryItem.type);
      const invRating = calculateItemRating(inventoryItem);
      const equippedRating = calculateItemRating(currentEquipped);
      return invRating > equippedRating;
  };

  const activeBonuses = Object.entries(equippedSetCounts).map(([setName, count]) => {
      const setDef = ITEM_SETS[setName];
      if (!setDef) return null;
      const bonuses: string[] = [];
      Object.entries(setDef).forEach(([thresholdStr, effects]) => {
          if (count >= parseInt(thresholdStr)) {
              effects.forEach(e => bonuses.push(e.description.replace(/^Set \(\d\): /, ''))); 
          }
      });
      if (bonuses.length === 0) return null;
      return (
          <div key={setName} className="mb-2 last:mb-0">
              <div className="flex justify-between items-center text-axiom-gold text-[10px] font-bold uppercase tracking-wider">
                  <span>{setName}</span>
                  <span className="text-gray-500">({count} pc)</span>
              </div>
              {bonuses.map((desc, i) => (
                  <div key={i} className="text-[9px] text-green-400 pl-2 leading-tight">✦ {desc}</div>
              ))}
          </div>
      );
  }).filter(Boolean);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[580px] bg-[#0f0f12] border border-stone-600 rounded-lg shadow-2xl z-40 flex flex-col font-serif select-none bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
      
      {/* Title Bar */}
      <div className="h-12 bg-gradient-to-b from-[#2a2a30] to-[#151518] border-b border-black flex items-center justify-between px-4 rounded-t-lg shadow-md">
        <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-black/50 border border-white/10 flex items-center justify-center text-axiom-gold">✦</div>
            <div>
              <div className="text-gray-200 font-bold tracking-widest text-lg leading-none">{agent.name}</div>
              <div className="text-axiom-cyan text-[10px] uppercase font-sans font-bold tracking-wider">Level {agent.level} {agent.classType}</div>
            </div>
        </div>
        <button onClick={() => toggleCharacterSheet(false)} className="text-gray-500 hover:text-white font-bold transition-colors">✕</button>
      </div>

      <div className="flex flex-1 p-6 space-x-6">
        
        {/* Left Column: Combat Stats */}
        <div className="w-1/4 flex flex-col space-y-4">
            <div className="bg-black/20 rounded border border-white/5 p-4 shadow-inner flex-1 flex flex-col">
              <h3 className="text-axiom-gold text-xs font-serif font-bold border-b border-white/10 pb-2 mb-3 uppercase tracking-widest">Stats</h3>
              
              <div className="space-y-2">
                  <StatRow label="STR" value={agent.stats.str} color="text-red-400" icon="⚔️" />
                  <StatRow label="AGI" value={agent.stats.agi} color="text-green-400" icon="🏹" />
                  <StatRow label="INT" value={agent.stats.int} color="text-blue-400" icon="🔮" />
                  <StatRow label="VIT" value={agent.stats.vit} color="text-yellow-400" icon="🛡️" />
              </div>

              <div className="mt-6">
                  <div className="flex justify-between items-end mb-1">
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Health</span>
                      <span className="text-green-500 font-mono text-xs font-bold">{agent.stats.hp}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-white/10 relative">
                      <div 
                          className="h-full bg-gradient-to-r from-green-700 via-green-500 to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                          style={{ width: `${(agent.stats.hp / agent.stats.maxHp) * 100}%` }}
                      ></div>
                  </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-white/10 text-center">
                  <span className="text-gray-600 text-[9px] uppercase tracking-[0.2em]">Rating</span>
                  <div className="text-2xl text-axiom-gold font-serif font-bold filter drop-shadow-[0_2px_4px_rgba(217,119,6,0.3)]">
                      {combatRating}
                  </div>
              </div>
            </div>
        </div>

        {/* Middle Column: Paper Doll */}
        <div className="w-2/5 flex flex-col items-center justify-center relative bg-black/20 rounded border border-white/5 shadow-inner p-2">
            
            <div className="grid grid-cols-3 gap-x-8 gap-y-4 w-full px-4 mb-4">
                 {/* Left Side: Main Gear */}
                 <div className="flex flex-col space-y-4 items-center">
                    <ItemSlot item={agent.equipment.head} type="HEAD" equippedItem={agent.equipment.head} activeSetCount={agent.equipment.head?.setName ? equippedSetCounts[agent.equipment.head.setName] : 0} />
                    <ItemSlot item={agent.equipment.chest} type="CHEST" equippedItem={agent.equipment.chest} activeSetCount={agent.equipment.chest?.setName ? equippedSetCounts[agent.equipment.chest.setName] : 0} />
                    <ItemSlot item={agent.equipment.legs} type="LEGS" equippedItem={agent.equipment.legs} activeSetCount={agent.equipment.legs?.setName ? equippedSetCounts[agent.equipment.legs.setName] : 0} />
                    <ItemSlot item={agent.equipment.waist} type="WAIST" equippedItem={agent.equipment.waist} activeSetCount={agent.equipment.waist?.setName ? equippedSetCounts[agent.equipment.waist.setName] : 0} />
                 </div>

                 {/* Center: Model */}
                 <div className="flex items-center justify-center relative">
                     <span className="text-9xl filter blur-sm opacity-20 absolute">🕴️</span>
                 </div>

                 {/* Right Side: Accessories */}
                 <div className="flex flex-col space-y-4 items-center">
                     <ItemSlot item={agent.equipment.neck} type="NECK" equippedItem={agent.equipment.neck} activeSetCount={agent.equipment.neck?.setName ? equippedSetCounts[agent.equipment.neck.setName] : 0} />
                     <ItemSlot item={agent.equipment.finger1} type="FINGER" equippedItem={agent.equipment.finger1} activeSetCount={agent.equipment.finger1?.setName ? equippedSetCounts[agent.equipment.finger1.setName] : 0} />
                     <ItemSlot item={agent.equipment.finger2} type="FINGER" equippedItem={agent.equipment.finger2} activeSetCount={agent.equipment.finger2?.setName ? equippedSetCounts[agent.equipment.finger2.setName] : 0} />
                 </div>
            </div>

             <div className="flex justify-between w-full px-12 mt-4">
                <ItemSlot item={agent.equipment.mainHand} type="MAIN" equippedItem={agent.equipment.mainHand} activeSetCount={agent.equipment.mainHand?.setName ? equippedSetCounts[agent.equipment.mainHand.setName] : 0} />
                <ItemSlot item={agent.equipment.offHand} type="OFFHAND" equippedItem={agent.equipment.offHand} activeSetCount={agent.equipment.offHand?.setName ? equippedSetCounts[agent.equipment.offHand.setName] : 0} />
            </div>
            
            <div className="absolute bottom-2 text-[8px] text-gray-600 font-sans uppercase tracking-widest">Class: {agent.classType}</div>
        </div>

        {/* Right Column: Inventory */}
        <div className="w-1/3 bg-black/30 rounded border border-white/5 p-4 flex flex-col">
            <h3 className="text-gray-400 text-xs uppercase border-b border-gray-700 pb-2 mb-3 tracking-widest font-bold">Inventory</h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
                {agent.inventory.map((item, idx) => (
                    <div key={idx} className="aspect-square">
                        <ItemSlot 
                            item={item} 
                            label=" " 
                            onClick={item ? () => equipItem(agent.id, item.id) : undefined}
                            equippedItem={getEquippedItem(item?.type)}
                            isUpgrade={checkUpgrade(item)}
                            activeSetCount={item?.setName ? equippedSetCounts[item.setName] : 0}
                        />
                    </div>
                ))}
            </div>

            {/* Effective Stats Section */}
            <div className="border-t border-gray-700 pt-2 mb-2">
                <h4 className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Effective Stats</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-black/40 p-1 rounded border border-white/5 flex justify-between items-center px-2">
                         <span className="text-red-400 font-bold text-[10px]">STR</span>
                         <span className="font-mono text-gray-200">{agent.stats.str}</span>
                    </div>
                    <div className="bg-black/40 p-1 rounded border border-white/5 flex justify-between items-center px-2">
                         <span className="text-green-400 font-bold text-[10px]">AGI</span>
                         <span className="font-mono text-gray-200">{agent.stats.agi}</span>
                    </div>
                    <div className="bg-black/40 p-1 rounded border border-white/5 flex justify-between items-center px-2">
                         <span className="text-blue-400 font-bold text-[10px]">INT</span>
                         <span className="font-mono text-gray-200">{agent.stats.int}</span>
                    </div>
                    <div className="bg-black/40 p-1 rounded border border-white/5 flex justify-between items-center px-2">
                         <span className="text-yellow-400 font-bold text-[10px]">VIT</span>
                         <span className="font-mono text-gray-200">{agent.stats.vit}</span>
                    </div>
                </div>
            </div>

            {/* Active Set Bonuses Section */}
            {activeBonuses.length > 0 && (
                <div className="border-t border-gray-700 pt-2 mb-2">
                    <h4 className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Set Bonuses</h4>
                    <div className="bg-black/40 p-2 rounded border border-white/5">
                        {activeBonuses}
                    </div>
                </div>
            )}
            
             <div className="mt-auto pt-3 border-t border-gray-700 flex justify-between items-center text-xs text-amber-500">
                <span className="text-gray-500 uppercase text-[10px] tracking-wider font-bold">Gold</span>
                <span className="font-mono font-bold text-lg">{Math.floor(Math.random() * 5000) + 500} <span className="text-sm">🪙</span></span>
            </div>
        </div>

      </div>
    </div>
  );
};