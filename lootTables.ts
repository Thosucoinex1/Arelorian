
import { Item, ItemRarity, ItemStats, ItemType, MonsterType } from "./types";

type LootDrop = {
    item: Omit<Item, 'id' | 'rarity'>;
    chance: number; // 0-1
    rarity: {
        [ItemRarity.COMMON]: number;
        [ItemRarity.UNCOMMON]: number;
        [ItemRarity.RARE]: number;
        [ItemRarity.EPIC]: number;
        [ItemRarity.LEGENDARY]: number;
        [ItemRarity.AXIOMATIC]: number;
    };
};

export const lootTables: Record<MonsterType, LootDrop[]> = {
    [MonsterType.SLIME]: [
        {
            item: { name: "Slime Residue", type: 'MATERIAL', subtype: "Crafting Material", stats: {}, description: "A sticky, viscous substance." },
            chance: 0.5,
            rarity: {
                [ItemRarity.COMMON]: 0.9,
                [ItemRarity.UNCOMMON]: 0.1,
                [ItemRarity.RARE]: 0,
                [ItemRarity.EPIC]: 0,
                [ItemRarity.LEGENDARY]: 0,
                [ItemRarity.AXIOMATIC]: 0,
            },
        },
    ],
    [MonsterType.GOBLIN]: [
        {
            item: { name: "Goblin Ear", type: 'MATERIAL', subtype: "Trophy", stats: {}, description: "A gruesome trophy." },
            chance: 0.2,
            rarity: {
                [ItemRarity.COMMON]: 1,
                [ItemRarity.UNCOMMON]: 0,
                [ItemRarity.RARE]: 0,
                [ItemRarity.EPIC]: 0,
                [ItemRarity.LEGENDARY]: 0,
                [ItemRarity.AXIOMATIC]: 0,
            },
        },
        {
            item: { name: "Rusty Dagger", type: 'WEAPON', subtype: "Dagger", stats: { atk: 2 }, description: "A crude and rusty dagger." },
            chance: 0.1,
            rarity: {
                [ItemRarity.COMMON]: 0.8,
                [ItemRarity.UNCOMMON]: 0.2,
                [ItemRarity.RARE]: 0,
                [ItemRarity.EPIC]: 0,
                [ItemRarity.LEGENDARY]: 0,
                [ItemRarity.AXIOMATIC]: 0,
            },
        },
    ],
    [MonsterType.ORC]: [
        {
            item: { name: "Orc Tusk", type: 'MATERIAL', subtype: "Trophy", stats: {}, description: "A large, sharp tusk." },
            chance: 0.3,
            rarity: {
                [ItemRarity.COMMON]: 1,
                [ItemRarity.UNCOMMON]: 0,
                [ItemRarity.RARE]: 0,
                [ItemRarity.EPIC]: 0,
                [ItemRarity.LEGENDARY]: 0,
                [ItemRarity.AXIOMATIC]: 0,
            },
        },
        {
            item: { name: "Cracked Axe", type: 'WEAPON', subtype: "Axe", stats: { atk: 5 }, description: "A heavy, cracked axe." },
            chance: 0.15,
            rarity: {
                [ItemRarity.COMMON]: 0.7,
                [ItemRarity.UNCOMMON]: 0.25,
                [ItemRarity.RARE]: 0.05,
                [ItemRarity.EPIC]: 0,
                [ItemRarity.LEGENDARY]: 0,
                [ItemRarity.AXIOMATIC]: 0,
            },
        },
    ],
    [MonsterType.DRAGON]: [
        {
            item: { name: "Dragon Scale", type: 'MATERIAL', subtype: "Crafting Material", stats: { def: 2 }, description: "A shimmering, metallic scale." },
            chance: 0.8,
            rarity: {
                [ItemRarity.COMMON]: 0,
                [ItemRarity.UNCOMMON]: 0.5,
                [ItemRarity.RARE]: 0.3,
                [ItemRarity.EPIC]: 0.15,
                [ItemRarity.LEGENDARY]: 0.05,
                [ItemRarity.AXIOMATIC]: 0,
            },
        },
        {
            item: { name: "Dragon's Tooth", type: 'WEAPON', subtype: "Sword", stats: { atk: 20 }, description: "A massive, razor-sharp tooth." },
            chance: 0.2,
            rarity: {
                [ItemRarity.COMMON]: 0,
                [ItemRarity.UNCOMMON]: 0,
                [ItemRarity.RARE]: 0.6,
                [ItemRarity.EPIC]: 0.3,
                [ItemRarity.LEGENDARY]: 0.1,
                [ItemRarity.AXIOMATIC]: 0,
            },
        },
    ],
};

export function generateLoot(monsterType: MonsterType): Item[] {
    const loot: Item[] = [];
    const table = lootTables[monsterType];
    if (!table) return loot;

    for (const drop of table) {
        if (Math.random() < drop.chance) {
            let rarity: ItemRarity = ItemRarity.COMMON;
            const rarityRoll = Math.random();
            let cumulativeChance = 0;

            for (const r in drop.rarity) {
                const itemRarity = r as ItemRarity;
                cumulativeChance += drop.rarity[itemRarity];
                if (rarityRoll < cumulativeChance) {
                    rarity = itemRarity;
                    break;
                }
            }
            
            // Skip common items for higher-level monsters
            if (monsterType === MonsterType.DRAGON && rarity === ItemRarity.COMMON) {
                continue;
            }

            const newItem: Item = {
                ...drop.item,
                id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                rarity,
            };
            loot.push(newItem);
        }
    }

    return loot;
}
