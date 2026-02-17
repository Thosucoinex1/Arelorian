
import React, { useState } from 'react';
import { useStore } from '../../store';
import { Agent, Item, ItemStats, ItemEffect } from '../../types';
import { ITEM_SETS } from '../../utils';

type EquipmentSlotType = keyof Agent['equipment'];

const RARITY_COLORS: Record<string, string> = {
    'COMMON': 'border-gray-500',
    'UNCOMMON': 'border-green-500',
    'RARE': 'border-blue-500',
    'EPIC': 'border-purple-500',
    'LEGENDARY': 'border-yellow-500',
};

const getSlotForItemType = (type: Item['type']): EquipmentSlotType | null => {
    switch (type) {
        case 'WEAPON': return 'mainHand';
        case 'OFFHAND': return 'offHand';
        case 'HELM': return 'head';
        case 'CHEST': return 'chest';
        case 'LEGS': return 'legs';
        default: return null;
    }
}

const StatComparison: React.FC<{ newItem: Item, equippedItem: Item | null }> = ({ newItem, equippedItem }) => {
    if (!equippedItem) {
        return (
            <>
                {Object.entries(newItem.stats).map(([stat, value]) => (
                    <div key={stat} className="flex justify-between">
                        <span>{stat.toUpperCase()}</span>
                        <span className="text-green-400">+{value}</span>
                    </div>
                ))}
            </>
        );
    }

    const allStats = [...new Set([...Object.keys(newItem.stats), ...Object.keys(equippedItem.stats)])];

    return (
        <>
            {allStats.map(stat => {
                const newVal = (newItem.stats as any)[stat] || 0;
                const oldVal = (equippedItem?.stats as any)[stat] || 0;
                const diff = newVal - oldVal;

                if (diff !== 0) {
                    return (
                        <div key={stat} className="flex justify-between">
                            <span>{stat.toUpperCase()}</span>
                            <span className={diff > 0 ? 'text-green-400' : 'text-red-500'}>
                                {diff > 0 ? '+' : ''}{diff} ({newVal})
                            </span>
                        </div>
                    );
                } else {
                     return (
                        <div key={stat} className="flex justify-between text-gray-500">
                            <span>{stat.toUpperCase()}</span>
                            <span>{newVal}</span>
                        </div>
                    );
                }
            })}
        </>
    );
};

const ItemTooltip: React.FC<{ item: Item, agent: Agent, position: {x: number, y: number} }> = ({ item, agent, position }) => {
    const slot = getSlotForItemType(item.type);
    const equippedItem = slot ? agent.equipment[slot] : null;

    return (
        <div 
            className="absolute z-50 w-48 bg-black border border-white/20 rounded-lg p-2 text-xs shadow-lg pointer-events-none"
            style={{ left: position.x + 15, top: position.y + 15 }}
        >
            <h4 className={`font-bold ${RARITY_COLORS[item.rarity]?.replace('border-', 'text-')}`}>{item.name}</h4>
            <p className="text-gray-400 capitalize">{item.rarity.toLowerCase()} {item.subtype}</p>
            <hr className="border-white/10 my-1"/>
            <div className="space-y-1">
                <StatComparison newItem={item} equippedItem={equippedItem} />
            </div>
             <p className="text-gray-500 italic mt-2 text-[10px]">"{item.description}"</p>
        </div>
    );
}

const EquipmentSlot: React.FC<{ agent: Agent, slot: EquipmentSlotType, onUnequip: (slot: EquipmentSlotType) => void }> = ({ agent, slot, onUnequip }) => {
    const item = agent.equipment[slot];
    const label = slot.replace(/([A-Z])/g, ' $1').toUpperCase();
    const rarityGlowClass = item?.rarity === 'EPIC' ? 'item-glow-epic' : item?.rarity === 'LEGENDARY' ? 'item-glow-legendary' : '';
    
    return (
        <div className="text-center">
            <div
                onClick={() => item && onUnequip(slot)}
                className={`relative w-16 h-16 md:w-20 md:h-20 mx-auto bg-black/50 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:border-axiom-cyan ${item ? RARITY_COLORS[item.rarity] : ''} ${rarityGlowClass}`}
            >
                {item ? <span className="text-3xl">⚔️</span> : <span className="text-gray-600 text-2xl">+</span>}
                {item?.setName && <div className="absolute top-1 right-1 w-2 h-2 bg-axiom-cyan rounded-full border border-black" title={`Set: ${item.setName}`}></div>}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">{label}</p>
            {item && <p className="text-xs font-bold text-white truncate">{item.name}</p>}
        </div>
    );
};

const InventoryItem: React.FC<{ 
    item: Item | null, 
    index: number, 
    onEquip: (item: Item, index: number) => void,
    onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void,
    onMouseEnter: (item: Item, e: React.MouseEvent) => void,
    onMouseLeave: () => void,
}> = ({ item, index, onEquip, onDragStart, onMouseEnter, onMouseLeave }) => {
    if (!item) {
        return <div className="w-16 h-16 bg-black/30 border border-white/5 rounded"></div>;
    }
    const rarityGlowClass = item.rarity === 'EPIC' ? 'item-glow-epic' : item.rarity === 'LEGENDARY' ? 'item-glow-legendary' : '';

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onClick={() => onEquip(item, index)}
            onMouseEnter={(e) => onMouseEnter(item, e)}
            onMouseLeave={onMouseLeave}
            className={`relative w-16 h-16 bg-black/50 border-2 ${RARITY_COLORS[item.rarity]} rounded flex items-center justify-center cursor-pointer hover:bg-axiom-cyan/20 transition-colors ${rarityGlowClass}`}
        >
             <span className="text-2xl">⚔️</span>
             {item.setName && <div className="absolute top-1 right-1 w-2 h-2 bg-axiom-cyan rounded-full border border-black" title={`Set: ${item.setName}`}></div>}
        </div>
    );
};

// FIX: Refactored to iterate over set definitions in a type-safe way, resolving iterator/unknown errors.
const ActiveSetBonuses: React.FC<{ agent: Agent }> = ({ agent }) => {
    const setCounts: Record<string, number> = {};
    
    // Use Object.keys with casting to (keyof typeof agent.equipment)[] for safe iteration over known properties.
    const equipment = agent.equipment;
    (Object.keys(equipment) as (keyof typeof equipment)[]).forEach(slot => {
        const item = equipment[slot];
        if (item?.setName) {
            setCounts[item.setName] = (setCounts[item.setName] || 0) + 1;
        }
    });

    const activeBonuses: ItemEffect[] = [];
    Object.entries(setCounts).forEach(([setName, count]) => {
        const setDef = ITEM_SETS[setName];
        if (!setDef) return;

        // Use Object.keys and mapping to iterate through threshold numbers safely.
        Object.keys(setDef).forEach((thresholdStr) => {
            const threshold = Number(thresholdStr);
            const effects = setDef[threshold];
            if (count >= threshold && Array.isArray(effects)) {
                activeBonuses.push(...effects);
            }
        });
    });


    if (activeBonuses.length === 0) return null;

    return (
        <div className="mt-6">
            <h3 className="text-green-400 text-xs font-bold uppercase mb-2 tracking-widest">Set Bonuses</h3>
            <div className="space-y-1 text-sm bg-black/20 p-2 rounded">
                {activeBonuses.map((effect, i) => (
                    <div key={`${effect.description}-${i}`} className="text-green-300 text-xs">
                        {effect.description}
                    </div>
                ))}
            </div>
        </div>
    );
};


export const CharacterSheet = () => {
    const { selectedAgentId, agents, showCharacterSheet, toggleCharacterSheet, equipItem, unequipItem, moveInventoryItem } = useStore();
    const agent = agents.find(a => a.id === selectedAgentId);
    
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<{item: Item, pos: {x: number, y: number}} | null>(null);

    if (!showCharacterSheet || !agent) return null;

    const handleEquip = (item: Item, index: number) => {
        equipItem(agent.id, item, index);
    };

    const handleUnequip = (slot: EquipmentSlotType) => {
        unequipItem(agent.id, slot);
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== toIndex) {
            moveInventoryItem(agent.id, draggedIndex, toIndex);
        }
        setDraggedIndex(null);
    };

    return (
        <div className="w-[90vw] md:w-[700px] h-[85vh] max-h-[800px] bg-axiom-dark border border-axiom-purple/50 rounded-lg shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl pointer-events-auto">
            {tooltip && <ItemTooltip item={tooltip.item} agent={agent} position={tooltip.pos} />}
            <div className="p-4 bg-axiom-purple/20 border-b border-axiom-purple/30 flex justify-between items-center">
                <h2 className="text-xl font-serif text-white tracking-widest">{agent.name}'s Awareness</h2>
                <button onClick={() => toggleCharacterSheet(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Panel: Equipment & Stats */}
                <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 p-4 flex flex-col justify-between">
                     <div>
                        <h3 className="text-axiom-cyan text-xs font-bold uppercase mb-4 tracking-widest">Equipment</h3>
                        <div className="grid grid-cols-3 gap-y-4">
                            <div></div><EquipmentSlot agent={agent} slot="head" onUnequip={handleUnequip} /><div></div>
                            <EquipmentSlot agent={agent} slot="mainHand" onUnequip={handleUnequip} />
                            <EquipmentSlot agent={agent} slot="chest" onUnequip={handleUnequip} />
                            <EquipmentSlot agent={agent} slot="offHand" onUnequip={handleUnequip} />
                            <div></div><EquipmentSlot agent={agent} slot="legs" onUnequip={handleUnequip} /><div></div>
                        </div>
                     </div>
                     <div>
                        <div className="mt-6">
                            <h3 className="text-axiom-gold text-xs font-bold uppercase mb-2 tracking-widest">Core Matrix</h3>
                            <div className="space-y-1 text-sm bg-black/20 p-2 rounded">
                                <div className="flex justify-between"><span>STR</span> <span className="text-white">{agent.stats.str}</span></div>
                                <div className="flex justify-between"><span>AGI</span> <span className="text-white">{agent.stats.agi}</span></div>
                                <div className="flex justify-between"><span>INT</span> <span className="text-white">{agent.stats.int}</span></div>
                                <div className="flex justify-between"><span>VIT</span> <span className="text-white">{agent.stats.vit}</span></div>
                            </div>
                        </div>
                        <ActiveSetBonuses agent={agent} />
                    </div>
                </div>

                {/* Right Panel: Inventory */}
                <div className="flex-1 p-4 overflow-y-auto touch-scroll">
                    <h3 className="text-axiom-cyan text-xs font-bold uppercase mb-4 tracking-widest">Inventory ({agent.inventory.filter(i => i).length}/{agent.inventory.length})</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {agent.inventory.map((item, index) => (
                             <div 
                                key={index} 
                                onDrop={(e) => handleDrop(e, index)}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                <InventoryItem 
                                    item={item} 
                                    index={index} 
                                    onEquip={handleEquip}
                                    onDragStart={handleDragStart}
                                    onMouseEnter={(item, e) => setTooltip({item, pos: {x: e.clientX, y: e.clientY}})}
                                    onMouseLeave={() => setTooltip(null)}
                                />
                            </div>
                        ))}
                    </div>
                     <section className="bg-axiom-purple/5 p-4 rounded-lg border border-axiom-purple/20 italic text-sm text-gray-400 mt-6">
                      <h4 className="text-[10px] text-axiom-purple not-italic font-bold mb-2 uppercase">Neural Monologue</h4>
                      "{agent.loreSnippet || "The consciousness is still forming..."}"
                    </section>
                </div>
            </div>
        </div>
    );
};
