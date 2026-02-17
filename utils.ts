import { Agent, Item, ItemEffectType, ItemEffect } from './types';

export const ITEM_SETS: Record<string, { [count: number]: ItemEffect[] }> = {
    'Voidstalker': {
        2: [{ type: 'CRIT_CHANCE', value: 5, description: 'Set (2): +5% Crit Chance' }],
        4: [{ type: 'LIFESTEAL', value: 10, description: 'Set (4): +10% Lifesteal' }]
    },
    'Ironclad': {
        2: [{ type: 'THORNS', value: 15, description: 'Set (2): Reflects 15 Dmg' }],
        4: [{ type: 'PASSIVE_REGEN', value: 20, description: 'Set (4): +20 HP/Sec' }]
    },
    'Arcanist': {
        2: [{ type: 'ON_HIT_SLOW', value: 10, description: 'Set (2): 10% Slow Chance' }],
        4: [{ type: 'ON_HIT_STUN', value: 5, description: 'Set (4): 5% Stun Chance' }]
    },
    'Phoenix': {
        2: [{ type: 'PASSIVE_REGEN', value: 10, description: 'Set (2): +10 HP/Sec' }],
        4: [{ type: 'THORNS', value: 25, description: 'Set (4): Reflects 25 Dmg' }]
    }
};

/**
 * Processes and aggregates all active item effects from an agent's equipment.
 * Returns a structured object mapping Effect Types to their total calculated values.
 * 
 * @param agent The agent to evaluate
 * @param includeInventory Whether to include passive effects from inventory items (e.g. Charms) - defaults to false
 */
export const aggregateActiveEffects = (agent: Agent, includeInventory: boolean = false): Record<ItemEffectType, number> => {
  // Initialize with defaults to ensure all keys exist
  const totals: Record<ItemEffectType, number> = {
    'ON_HIT_SLOW': 0,
    'ON_HIT_STUN': 0,
    'PASSIVE_REGEN': 0,
    'THORNS': 0,
    'CRIT_CHANCE': 0,
    'LIFESTEAL': 0
  };

  const setCounts: Record<string, number> = {};

  const processItem = (item: Item | null) => {
    if (!item) return;
    
    // Process Intrinsic Effects
    if (item.effects) {
        item.effects.forEach(effect => {
            totals[effect.type] += effect.value;
        });
    }

    // Count Sets
    if (item.setName) {
        setCounts[item.setName] = (setCounts[item.setName] || 0) + 1;
    }
  };

  // Process currently equipped items
  processItem(agent.equipment.head);
  processItem(agent.equipment.chest);
  processItem(agent.equipment.legs);
  processItem(agent.equipment.mainHand);

  // Process Set Bonuses
  Object.entries(setCounts).forEach(([setName, count]) => {
      const setDef = ITEM_SETS[setName];
      if (!setDef) return;

      Object.entries(setDef).forEach(([thresholdStr, effects]) => {
          const threshold = parseInt(thresholdStr);
          if (count >= threshold) {
              effects.forEach(effect => {
                  totals[effect.type] += effect.value;
              });
          }
      });
  });

  // Process Inventory if requested (e.g. for Charms or carrying effects)
  // Note: Set bonuses typically don't count inventory items unless specified, assumed equipment only above.
  if (includeInventory) {
    agent.inventory.forEach(item => processItem(item));
  }

  return totals;
};

/**
 * Calculates a raw power score for a single item to facilitate quick comparisons.
 */
export const calculateItemRating = (item: Item | null | undefined): number => {
    if (!item) return 0;

    let rating = (item.stats.str || 0) + (item.stats.agi || 0) + (item.stats.int || 0) + (item.stats.vit || 0);
    rating += (item.stats.dmg || 0) * 2;

    if (item.effects) {
        item.effects.forEach(effect => {
            switch(effect.type) {
                case 'CRIT_CHANCE': rating += effect.value * 20; break;
                case 'LIFESTEAL': rating += effect.value * 10; break;
                case 'THORNS': rating += effect.value * 5; break;
                case 'PASSIVE_REGEN': rating += effect.value * 5; break;
                case 'ON_HIT_STUN': rating += effect.value * 15; break;
                case 'ON_HIT_SLOW': rating += effect.value * 5; break;
            }
        });
    }
    
    // Slight bump for being part of a set to encourage collecting
    if (item.setName) rating += 10;

    return Math.floor(rating);
};

/**
 * Helper to calculate total Combat Rating based on stats and effects.
 */
export const calculateCombatRating = (agent: Agent): number => {
    const effects = aggregateActiveEffects(agent);
    
    let rating = agent.stats.str + agent.stats.agi + agent.stats.int + agent.stats.vit;
    rating += (agent.equipment.mainHand?.stats?.dmg || 0) * 2;
    
    // Add weighted value from effects
    rating += (effects.CRIT_CHANCE || 0) * 20;   // High value
    rating += (effects.LIFESTEAL || 0) * 10;     // Medium value
    rating += (effects.THORNS || 0) * 5;         // Low value
    rating += (effects.PASSIVE_REGEN || 0) * 5;  // Low value
    rating += (effects.ON_HIT_STUN || 0) * 15;   // High value
    rating += (effects.ON_HIT_SLOW || 0) * 5;
    
    return Math.floor(rating);
};
