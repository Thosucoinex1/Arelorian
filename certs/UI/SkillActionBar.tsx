import { useState } from 'react';
import { useStore } from '../../store';
import { GAME_SKILLS, SKILL_ACTIONS, getUnlockedActions, SkillCategory } from '../../types';
import { Swords, Pickaxe, Hammer, Wind, Crosshair, Sparkles, Shield, Axe, Gem, Skull, Eye, Fish, Leaf, FlaskConical, CookingPot } from 'lucide-react';

const CATEGORY_ORDER: SkillCategory[] = ['COMBAT', 'GATHERING', 'CRAFTING', 'UTILITY'];
const CATEGORY_COLORS: Record<SkillCategory, string> = {
  COMBAT: 'from-red-600 to-red-800',
  GATHERING: 'from-green-600 to-green-800',
  CRAFTING: 'from-yellow-600 to-yellow-800',
  UTILITY: 'from-purple-600 to-purple-800',
};
const CATEGORY_BORDER: Record<SkillCategory, string> = {
  COMBAT: 'border-red-500/50',
  GATHERING: 'border-green-500/50',
  CRAFTING: 'border-yellow-500/50',
  UTILITY: 'border-purple-500/50',
};

const getIcon = (iconName: string, size: string = 'w-5 h-5') => {
  const props = { className: size };
  switch (iconName) {
    case 'Swords': return <Swords {...props} />;
    case 'Crosshair': return <Crosshair {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'Shield': return <Shield {...props} />;
    case 'Pickaxe': return <Pickaxe {...props} />;
    case 'Axe': return <Axe {...props} />;
    case 'Hammer': return <Hammer {...props} />;
    case 'Wind': return <Wind {...props} />;
    case 'Gem': return <Gem {...props} />;
    case 'Skull': return <Skull {...props} />;
    case 'Eye': return <Eye {...props} />;
    case 'Fish': return <Fish {...props} />;
    case 'Leaf': return <Leaf {...props} />;
    case 'FlaskConical': return <FlaskConical {...props} />;
    case 'CookingPot': return <CookingPot {...props} />;
    default: return <Swords {...props} />;
  }
};

export const SkillActionBar = () => {
  const controlledAgentId = useStore(state => state.controlledAgentId);
  const agents = useStore(state => state.agents);
  const executeSkillAction = useStore(state => state.executeSkillAction);
  const { isTablet, isMobile } = useStore(state => state.device);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('COMBAT');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  if (!controlledAgentId) return null;
  const agent = agents.find(a => a.id === controlledAgentId);
  if (!agent) return null;

  const categorySkills = Object.entries(GAME_SKILLS).filter(([, def]) => def.category === selectedCategory);
  const activeSkill = selectedSkill || categorySkills[0]?.[0];
  const unlockedActions = activeSkill ? getUnlockedActions(activeSkill, agent.skills[activeSkill]?.level || 1) : [];

  const btnSize = isTablet ? 'min-h-[56px] min-w-[56px]' : isMobile ? 'min-h-[48px] min-w-[48px]' : 'min-h-[44px] min-w-[44px]';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
      <div className="bg-black/90 backdrop-blur-xl border-t border-axiom-cyan/30">
        <div className="flex items-center gap-1 px-2 py-1 border-b border-white/10 overflow-x-auto">
          <div className="flex items-center gap-1 px-1 py-0.5 bg-red-500/20 rounded mr-1">
            <div className="w-20 md:w-28 h-2 bg-black/60 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${(agent.stats.hp / agent.stats.maxHp) * 100}%` }} />
            </div>
            <span className="text-[9px] text-red-400 font-mono whitespace-nowrap">{Math.floor(agent.stats.hp)}/{agent.stats.maxHp}</span>
          </div>
          <div className="flex items-center gap-1 px-1 py-0.5 bg-blue-500/20 rounded mr-2">
            <div className="w-20 md:w-28 h-2 bg-black/60 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all" style={{ width: `${((agent.stats.mana ?? 100) / (agent.stats.maxMana ?? 100)) * 100}%` }} />
            </div>
            <span className="text-[9px] text-blue-400 font-mono whitespace-nowrap">{Math.floor(agent.stats.mana ?? 100)}/{agent.stats.maxMana ?? 100}</span>
          </div>

          {CATEGORY_ORDER.map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setSelectedSkill(null); }}
              className={`${btnSize} px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 ${selectedCategory === cat ? `bg-gradient-to-b ${CATEGORY_COLORS[cat]} text-white shadow-lg` : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              {cat}
            </button>
          ))}

          {(agent.unspentStatPoints || 0) > 0 && (
            <div className="ml-auto px-2 py-1 bg-axiom-gold/20 border border-axiom-gold/50 rounded-lg animate-pulse">
              <span className="text-[10px] text-axiom-gold font-bold">+{agent.unspentStatPoints} SP</span>
            </div>
          )}
        </div>

        <div className="flex gap-1 px-2 py-1 border-b border-white/5 overflow-x-auto">
          {categorySkills.map(([key, def]) => {
            const level = agent.skills[key]?.level || 1;
            const xp = agent.skills[key]?.xp || 0;
            const xpNeeded = level * 100 + level * level * 10;
            return (
              <button
                key={key}
                onClick={() => setSelectedSkill(key)}
                className={`flex flex-col items-center ${btnSize} px-2 rounded-lg transition-all active:scale-95 ${activeSkill === key ? `bg-white/15 ${CATEGORY_BORDER[selectedCategory]} border` : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-1">
                  {getIcon(def.icon, 'w-3.5 h-3.5')}
                  <span className="text-[9px] text-white font-bold">{level}</span>
                </div>
                <span className="text-[8px] text-gray-400">{def.name}</span>
                <div className="w-full h-0.5 bg-black/40 rounded-full mt-0.5 overflow-hidden">
                  <div className="h-full bg-axiom-cyan transition-all" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 px-2 py-2 overflow-x-auto">
          {unlockedActions.map((action, idx) => (
            <button
              key={action.name}
              onClick={() => activeSkill && executeSkillAction(controlledAgentId, activeSkill, idx)}
              className={`${btnSize} px-3 md:px-4 rounded-xl bg-gradient-to-b ${CATEGORY_COLORS[selectedCategory]} border ${CATEGORY_BORDER[selectedCategory]} text-white font-bold transition-all active:scale-90 hover:brightness-125 shadow-lg flex flex-col items-center justify-center`}
              title={action.description}
            >
              <span className={`${isTablet ? 'text-xs' : 'text-[10px]'} font-black`}>{action.name}</span>
              <span className="text-[8px] opacity-70">
                {action.damage ? `${action.damage} DMG` : action.effect?.replace(/_/g, ' ')}
                {action.manaCost ? ` | ${action.manaCost} MP` : ''}
              </span>
            </button>
          ))}
          {unlockedActions.length === 0 && (
            <div className="text-gray-500 text-xs py-2 px-4">No actions available. Level up this skill!</div>
          )}
        </div>
      </div>
    </div>
  );
};
