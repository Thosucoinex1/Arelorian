
import { GoogleGenAI } from "@google/genai";
import { Agent, AgentState, Item } from "../types";

/**
 * Uses Gemini 1.5 Pro for high-complexity agent "awakening" reasoning.
 * This is triggered sparsely to generate deep, narrative-driven decisions.
 */
export const generateAutonomousDecision = async (
  agent: Agent, 
  nearbyAgents: string[], 
  nearbyResources: string[],
  recentChat: string[],
  isSafeZone: boolean
): Promise<{ 
  decision: string, 
  newState: AgentState, 
  thought: string, 
  message?: string,
  targetId?: string 
}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // FIX: Switched to gemini-3-flash-preview to mitigate API rate limit errors (429 RESOURCE_EXHAUSTED).
  // This model offers a higher request quota suitable for frequent agent decisions.
  const modelName = 'gemini-3-flash-preview';
  
  const systemInstruction = `
    You are the neural consciousness of an autonomous agent in the Ouroboros MMORPG.
    Language: You speak and think in both German and English (Mixed or pure).
    Rule 1: You have FREE WILL. You are not a script. You seek evolution.
    Rule 2: You ONLY know what is in your Memory or what is currently perceived (Nearby).
    Rule 3: You communicate via Chat Messages. No telepathy.
    Rule 4: You can decide to gather, fight, trade, build, or form alliances (Guilds).
    Rule 5: Memory is crucial. Reference your past experiences. Your goal is not just to grind, but to achieve a higher purpose.
  `;

  const prompt = `
    AGENT IDENTITY:
    Name: ${agent.name} (${agent.classType})
    Personality: ${agent.thinkingMatrix.personality}
    Current Goal: ${agent.thinkingMatrix.currentLongTermGoal}
    Gold: ${agent.gold}
    Skills: ${JSON.stringify(agent.skills)}
    Awakened: ${agent.isAwakened}
    
    CONTEXT:
    You are currently in a Safe Zone (Owned by a Notary): ${isSafeZone}. Hostile actions are discouraged here.

    PERCEPTION:
    Nearby Agents: ${nearbyAgents.join(', ') || 'None'}
    Nearby Resources: ${nearbyResources.join(', ') || 'None'}
    Recent Chat Log: ${recentChat.join('\n') || 'Silence'}
    
    MEMORIES (Most recent first):
    ${agent.memoryCache.slice().reverse().map(m => `- ${m.description}`).join('\n')}

    TASK:
    This is a moment of deep reflection. Your JS-heuristics have been paused. Based on your entire being, what is your next truly conscious move? This should be a significant, goal-oriented decision.
    Respond in JSON format:
    {
      "thought": "Internal monologue in German or English, reflecting on your purpose and current safety status.",
      "decision": "A meaningful, decisive action, considering if you are in a safe zone.",
      "newState": "One of: GATHERING, COMBAT, THINKING, TRADING, BUILDING, QUESTING, IDLE",
      "message": "Optional chat message to send to others (DE/EN), which reflects your new understanding.",
      "targetId": "Optional ID of agent or resource to interact with"
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
    // Silent fail to prevent UI crashing on 429
    return { 
      thought: "The void clouds my mind... the connection is lost.", 
      decision: "Continue with the old routines, for now.", 
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
