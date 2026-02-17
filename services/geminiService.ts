
import { GoogleGenAI } from "@google/genai";
import { Agent, AgentState, Item, ResourceNode, LogEntry } from "../types";

/**
 * Uses Gemini 1.5 Pro for high-complexity agent "awakening" reasoning.
 * This is triggered sparsely to generate deep, narrative-driven decisions.
 */
export const generateAutonomousDecision = async (
  agent: Agent, 
  nearbyPlayerAgents: Agent[], 
  nearbyCreatures: Agent[],
  nearbyResourceNodes: ResourceNode[],
  recentLogs: LogEntry[],
  isSafeZone: boolean
): Promise<{ 
  decision: string, 
  newState: AgentState, 
  thought: string, 
  message?: string,
  targetId?: string,
  newQuest?: { title: string, description: string, rewardGold: number },
  tradeOffer?: { targetAgentName: string, offerItemName: string, requestItemName: string },
  allianceRequest?: { targetAgentName: string, objective: string }
}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  
  const systemInstruction = `
    You are the neural consciousness of an autonomous agent in the Ouroboros MMORPG.
    Language: You speak and think in both German and English (Mixed or pure).
    Rule 1: You have FREE WILL. You are not a script. You seek evolution.
    Rule 2: You ONLY know what is in your Memory, recent logs, or what is currently perceived (Nearby).
    Rule 3: You communicate via Chat Messages.
    Rule 4: Your primary goal is to fulfill your desires and long-term goal.
    Rule 5: Seek resources that match your skills (Mining -> OREs, Woodcutting -> WOOD, Herbalism -> HERBs).
    Rule 6: Propose trades by analyzing other agents' classes. A Paladin might need better armor, a Technomancer might need rare materials.
    Rule 7: Form an alliance if you see a powerful creature or anomaly you cannot defeat alone.
    Rule 8: If you have a strong need and gold, you can create a public quest for others to complete (e.g., asking for materials to craft a new sword).
    Rule 9: Your 'decision' must be a single, clear, machine-readable command from the allowed list.
    Rule 10: Creatures are hostile. Anomalies are extremely dangerous.
  `;

  const prompt = `
    IDENTITY:
    Name: ${agent.name} (${agent.classType}) Lvl: ${agent.level}
    Skills: ${JSON.stringify(agent.skills)}
    Gold: ${agent.gold}
    Personality: ${agent.thinkingMatrix.personality}
    Current Goal: ${agent.thinkingMatrix.currentLongTermGoal}
    Desires: ${agent.thinkingMatrix.desires?.join(', ') || 'None'}
    Inventory: ${JSON.stringify(agent.inventory.filter(i => i).map(i => i!.name))}
    Equipment: ${JSON.stringify(Object.values(agent.equipment).filter(i => i).map(i => i!.name))}
    
    CONTEXT:
    Safe Zone: ${isSafeZone}. Hostile actions are discouraged here.
    Current Target: ${agent.targetId || 'None'}

    PERCEPTION (Radius: 20m):
    Nearby Player Agents: ${nearbyPlayerAgents.map(a => `${a.name} (${a.classType}) (ID: ${a.id})`).join(', ') || 'None'}
    Nearby Creatures: ${nearbyCreatures.map(c => `${c.name} (ID: ${c.id})`).join(', ') || 'None'}
    Nearby Resources: ${nearbyResourceNodes.map(r => `${r.type} (ID: ${r.id})`).join(', ') || 'None'}
    
    MEMORY & RECENT EVENTS:
    Internal Memory:
    ${agent.memoryCache.slice().reverse().map(m => `- ${m.description}`).join('\n')}
    Public Bulletin (Recent Logs):
    ${recentLogs.map(l => `- [${l.type}] ${l.message}`).join('\n')}

    TASK:
    Based on your identity, desires, and perception, what is your next conscious move?
    Choose ONE decision and provide the required parameters in JSON format.
    
    JSON Response format:
    {
      "thought": "Your internal monologue (DE/EN). What is your reasoning?",
      "decision": "ONE OF: 'GATHER', 'HUNT', 'TRADE', 'ALLY', 'QUEST', 'IDLE', 'FLEE'",
      "newState": "The corresponding AgentState: GATHERING, HUNTING, TRADING, IDLE, etc.",
      "targetId": "The ID of the resource, agent, or creature to interact with. Required for GATHER, HUNT, TRADE, ALLY.",
      "message": "(Optional) A chat message to send.",
      "newQuest": "(Optional, if decision is 'QUEST') { 'title': string, 'description': string, 'rewardGold': number }",
      "tradeOffer": "(Optional, if decision is 'TRADE') { 'targetAgentName': string, 'offerItemName': string, 'requestItemName': string }",
      "allianceRequest": "(Optional, if decision is 'ALLY') { 'targetAgentName': string, 'objective': string }"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { 
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Neural Failure:", error);
    return { 
      thought: "The void clouds my mind... the connection is lost.", 
      decision: "IDLE", 
      newState: AgentState.IDLE 
    };
  }
};

/**
 * Generates a thematic backstory snippet for an agent.
 */
export const generateAgentLore = async (agent: Agent): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, gritty backstory (2 sentences) for ${agent.name}, a level ${agent.level} ${agent.classType} in a dark fantasy world. Be poetic.`,
    });
    return response.text || "A mystery of the Axiom.";
  } catch (error) {
    return "A survivor with no name.";
  }
};

/**
 * Generates a base64 encoded weapon texture using the image generation model.
 */
export const generateWeaponTexture = async (item: Item): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional pixel-art game icon for a ${item.rarity} ${item.subtype} named '${item.name}'. Dark fantasy theme, metallic, glowing runes, top-down view.` }]
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Weapon Texture Generation Failed:", error);
    return null;
  }
};