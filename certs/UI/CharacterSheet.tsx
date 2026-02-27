

import React, { useState } from 'react';
import { useStore } from '../../store';
// Cleaned up imports to reflect the current state of exported members in types.ts
import { Agent, Item, ItemEffect } from '../../types';
import { ITEM_SETS } from '../../utils';
import { AgentMemoryDisplay } from './AgentMemoryDisplay';

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
                {Object.entries(newItem.stats || {}).map(([stat, value]) => (
                    <div key={stat} className="flex justify-between">
                        <span>{String(stat).toUpperCase()}</span>
                        <span className="text-green-400">+{String(value)}</span>
                    </div>
                ))}
            </>
        );
    }

    const allStats = [...new Set([...Object.keys(newItem.stats || {}), ...Object.keys(equippedItem.stats || {})])];

    return (
        <>
            {allStats.map(stat => {
                const newVal = (newItem.stats as any)[stat] || 0;
                const oldVal = (equippedItem?.stats as any)[stat] || 0;
                const diff = newVal - oldVal;

                if (diff !== 0) {
                    return (
                        <div key={stat} className="flex justify-between">
                            <span>{String(stat).toUpperCase()}</span>
                            <span className={diff > 0 ? 'text-green-400' : 'text-red-500'}>
                                {diff > 0 ? '+' : ''}{String(diff)} ({String(newVal)})
                            </span>
                        </div>
                    );
                } else {
                     return (
                        <div key={stat} className="flex justify-between text-gray-500">
                            <span>{String(stat).toUpperCase()}</span>
                            <span>{String(newVal)}</span>
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
            <h4 className={`font-bold ${RARITY_COLORS[item.rarity]?.replace('border-', 'text-')}`}>{String(item.name)}</h4>
            <p className="text-gray-400 capitalize">{String(item.rarity).toLowerCase()} {String(item.subtype)}</p>
            <hr className="border-white/10 my-1"/>
            <div className="space-y-1">
                <StatComparison newItem={item} equippedItem={equippedItem} />
            </div>
             <p className="text-gray-500 italic mt-2 text-[10px]">"{String(item.description)}"</p>
        </div>
    );
}

const EquipmentSlot: React.FC<{ agent: Agent, slot: EquipmentSlotType, onUnequip: (slot: EquipmentSlotType) => void }> = ({ agent, slot, onUnequip }) => {
    const item = agent.equipment[slot];
    const label = String(slot).replace(/([A-Z])/g, ' $1').toUpperCase();
    const rarityGlowClass = item?.rarity === 'EPIC' ? 'item-glow-epic' : item?.rarity === 'LEGENDARY' ? 'item-glow-legendary' : '';
    
    return (
        <div className="text-center">
            <div
                onClick={() => item && onUnequip(slot)}
                className={`relative w-16 h-16 md:w-20 md:h-20 mx-auto bg-black/50 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:border-axiom-cyan ${item ? RARITY_COLORS[item.rarity] : ''} ${rarityGlowClass}`}
            >
                {item ? <span className="text-3xl">⚔️</span> : <span className="text-gray-600 text-2xl">+</span>}
                {item?.setName && <div className="absolute top-1 right-1 w-2 h-2 bg-axiom-cyan rounded-full border border-black" title={`Set: ${String(item.setName)}`}></div>}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">{String(label)}</p>
            {item && <p className="text-xs font-bold text-white truncate">{String(item.name)}</p>}
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
             {item.setName && <div className="absolute top-1 right-1 w-2 h-2 bg-axiom-cyan rounded-full border border-black" title={`Set: ${String(item.setName)}`}></div>}
        </div>
    );
};

const ActiveSetBonuses: React.FC<{ agent: Agent }> = ({ agent }) => {
    const setCounts: Record<string, number> = {};
    
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
                    <div key={`${String(effect.description)}-${i}`} className="text-green-300 text-xs">
                        {String(effect.description)}
                    </div>
                ))}
            </div>
        </div>
    );
};

import { Minus, X } from 'lucide-react';

export const CharacterSheet = () => {
    const selectedAgentId = useStore(state => state.selectedAgentId);
    const agents = useStore(state => state.agents);
    const toggleWindow = useStore(state => state.toggleWindow);
    const minimizeWindow = useStore(state => state.minimizeWindow);
    const equipItem = useStore(state => state.equipItem);
    const unequipItem = useStore(state => state.unequipItem);
    const moveInventoryItem = useStore(state => state.moveInventoryItem);
    
    const agent = agents.find(a => a.id === selectedAgentId);
    
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<{item: Item, pos: {x: number, y: number}} | null>(null);
    const [activeTab, setActiveTab] = useState<'GEAR' | 'MEMORY'>('GEAR');

    if (!agent) return null;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4 md:p-10">
            <div className="w-full max-w-[800px] h-full max-h-[700px] bg-axiom-dark border border-axiom-purple/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl pointer-events-auto shadow-[0_0_50px_rgba(79,70,229,0.3)]">
                {tooltip && <ItemTooltip item={tooltip.item} agent={agent} position={tooltip.pos} />}
                
                {/* Header with Tabs */}
                <div className="p-1 bg-axiom-purple/20 border-b border-axiom-purple/30 flex items-center">
                    <div className="flex-1 flex gap-1 px-4">
                        <button 
                            onClick={() => setActiveTab('GEAR')}
                            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'GEAR' ? 'text-white border-b-2 border-axiom-cyan' : 'text-gray-500 hover:text-white'}`}
                        >
                            Neural Gear
                        </button>
                        <button 
                            onClick={() => setActiveTab('MEMORY')}
                            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MEMORY' ? 'text-white border-b-2 border-axiom-cyan' : 'text-gray-500 hover:text-white'}`}
                        >
                            Axiom Memory
                        </button>
                    </div>
                    <div className="flex items-center">
                        <button 
                            onClick={() => minimizeWindow('CHARACTER')} 
                            className="text-gray-500 hover:text-white p-4 transition-colors"
                            title="Minimize"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => toggleWindow('CHARACTER', false)} 
                            className="text-gray-500 hover:text-white p-4 transition-colors"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-6">
                    {activeTab === 'GEAR' ? (
                        <div className="flex flex-col md:flex-row h-full gap-6">
                            <div className="w-full md:w-1/2 border-r border-white/5 pr-6 flex flex-col justify-between">
                                 <div>
                                    <h3 className="text-axiom-cyan text-[10px] font-bold uppercase mb-4 tracking-widest">Equipment Grid</h3>
                                    <div className="grid grid-cols-3 gap-y-4">
                                        <div></div><EquipmentSlot agent={agent} slot="head" onUnequip={handleUnequip} /><div></div>
                                        <EquipmentSlot agent={agent} slot="mainHand" onUnequip={handleUnequip} />
                                        <EquipmentSlot agent={agent} slot="chest" onUnequip={handleUnequip} />
                                        <EquipmentSlot agent={agent} slot="offHand" onUnequip={handleUnequip} />
                                        <div></div><EquipmentSlot agent={agent} slot="legs" onUnequip={handleUnequip} /><div></div>
                                    </div>
                                 </div>
                                 <div className="mt-6">
                                    <h3 className="text-axiom-gold text-[10px] font-bold uppercase mb-2 tracking-widest">Core Matrix</h3>
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-black/40 p-3 rounded-xl border border-white/5">
                                        <div className="flex justify-between"><span>STR</span> <span className="text-white font-bold">{String(agent.stats.str)}</span></div>
                                        <div className="flex justify-between"><span>AGI</span> <span className="text-white font-bold">{String(agent.stats.agi)}</span></div>
                                        <div className="flex justify-between"><span>INT</span> <span className="text-white font-bold">{String(agent.stats.int)}</span></div>
                                        <div className="flex justify-between"><span>VIT</span> <span className="text-white font-bold">{String(agent.stats.vit)}</span></div>
                                    </div>
                                    <ActiveSetBonuses agent={agent} />
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-axiom-gold text-[10px] font-bold uppercase mb-2 tracking-widest">Skill Matrix</h3>
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-black/40 p-3 rounded-xl border border-white/5">
                                        <div className="flex justify-between"><span>Mining</span> <span className="text-white font-bold">{String(agent.skills.mining.level)}</span></div>
                                        <div className="flex justify-between"><span>Crafting</span> <span className="text-white font-bold">{String(agent.skills.crafting.level)}</span></div>
                                        <div className="flex justify-between"><span>Combat</span> <span className="text-white font-bold">{String(agent.skills.combat.level)}</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col overflow-hidden">
                                <h3 className="text-axiom-cyan text-[10px] font-bold uppercase mb-4 tracking-widest">Neural Inventory ({String(agent.inventory.filter(i => i).length)}/{String(agent.inventory.length)})</h3>
                                <div className="grid grid-cols-4 gap-2 overflow-y-auto pr-2 custom-scrollbar">
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
                                 <section className="mt-6 bg-axiom-purple/10 p-4 rounded-xl border border-axiom-purple/20 italic text-[11px] text-gray-400 leading-relaxed shadow-inner">
                                  <h4 className="text-[10px] text-axiom-purple not-italic font-black mb-2 uppercase tracking-widest">Neural Monologue</h4>
                                  "{String(agent.loreSnippet || "The consciousness is still forming, grasping at fragmented data streams...")}"
                                </section>
                            </div>
                        </div>
                    ) : (
                        <AgentMemoryDisplay agentId={agent.id} />
                    )}
                </div>
            </div>
        </div>
    );
};
