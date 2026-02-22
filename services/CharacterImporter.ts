
import { Agent, AgentState } from "../types";

export class CharacterImporter {
  static async importFromURL(url: string): Promise<Partial<Agent> | null> {
    try {
      // JanitorAI Format
      if (url.includes('janitorai.com')) {
        return await this.importJanitorAI(url);
      }
      
      // Character.AI Format
      if (url.includes('character.ai')) {
        return await this.importCharacterAI(url);
      }
      
      throw new Error('Unsupported URL format. Use JanitorAI or Character.AI links.');
    } catch (error) {
      console.error('Import failed:', error);
      return null;
    }
  }

  static async importJanitorAI(url: string): Promise<Partial<Agent>> {
    const match = url.match(/characters\/([^\/\?]+)/);
    const charId = match ? match[1] : null;
    
    if (!charId) {
      throw new Error('Could not extract character ID from JanitorAI URL.');
    }

    const apiUrl = `https://www.janitorai.com/api/characters/${charId}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch character data from JanitorAI. Status: ${response.status}`);
    }

    const data = await response.json();

    return {
      name: data.name,
      loreSnippet: data.description,
      thinkingMatrix: {
        personality: data.personality,
        currentLongTermGoal: 'Understand this new world',
        alignment: 0.5,
        languagePreference: 'EN',
        sociability: 0.8,
        aggression: 0.2
      },
      stats: { str: 12, agi: 12, int: 15, vit: 10, hp: 100, maxHp: 100 }
    };
  }

  static async importCharacterAI(url: string): Promise<Partial<Agent>> {
    const match = url.match(/chat\/([^\/\?]+)/);
    const charId = match ? match[1] : null;

    if (!charId) {
      throw new Error('Could not extract character ID from Character.AI URL.');
    }

    const apiUrl = `https://character.ai/chat/character/info-cached/${charId}/`;

    const response = await fetch(apiUrl, {
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch character data from Character.AI. Status: ${response.status}`);
    }

    const data = await response.json();

    return {
      name: data.character.name,
      loreSnippet: data.character.greeting,
      thinkingMatrix: {
        personality: 'Chatty',
        currentLongTermGoal: 'Find a conversation partner',
        alignment: 0.8,
        languagePreference: 'EN',
        sociability: 0.9,
        aggression: 0.1
      },
      stats: { str: 8, agi: 10, int: 18, vit: 8, hp: 80, maxHp: 80 }
    };
  }

  static importFromJSON(json: string): Partial<Agent> | null {
    try {
      const data = JSON.parse(json);
      return {
        name: data.name || 'Unknown Import',
        loreSnippet: data.description || 'No description provided.',
        thinkingMatrix: {
            personality: data.personality?.primary || 'Neutral',
            currentLongTermGoal: 'Survive',
            alignment: 0.5,
            languagePreference: 'EN',
            sociability: data.personality?.sociability || 0.5,
            aggression: data.personality?.aggression || 0.5
        },
        stats: {
            str: data.stats?.str || 10,
            agi: data.stats?.agi || 10,
            int: data.stats?.int || 10,
            vit: data.stats?.vit || 10,
            hp: 100,
            maxHp: 100
        }
      };
    } catch (error) {
      console.error('JSON import failed:', error);
      return null;
    }
  }
}
