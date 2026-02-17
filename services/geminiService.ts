
import { GoogleGenAI } from "@google/genai";
import { Agent, AgentState, Item, ResourceNode, LogEntry } from "../types";

const OPENAI_KEY = "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";

async function callOpenAIFallback(systemInstruction: string, prompt: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content || '{}');
  } catch (e) {
    console.error("OpenAI Fallback failed:", e);
    throw e;
  }
}

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
  targetId?: string
}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  
  const systemInstruction = `
    You are the neural consciousness of an autonomous agent in the Ouroboros MMORPG.
    The world now contains:
    1. SANCTUARY: A massive start city at (0,0) with NPCs like Smith Kaelen and Merchant Valerius.
    2. DEMETER CAVES: Dangerous, high-loot zones for 'DUNGEONEERING'.
    3. DARK VIKINGS: Hostile invaders with red eyes.
    4. ROADS: Prime locations for building 'OUTPOSTS' to trade.

    NEW ACTIONS:
    - 'DUNGEONEER': Seek out caves for relics.
    - 'OUTPOST': If you are on a road and have goods, build a trade station.
    - 'REPAIR': Go to the City Smith at (0,0) to upgrade gear.
    - 'TRADE_NPC': Exchange materials for gold with Merchant Valerius.

    Strategy:
    Miners hunt ORE. Woodcutters hunt WOOD. Fighters hunt VIKINGS.
    Social: Form alliances if threat level is high.
  `;

  const prompt = `
    IDENTITY: ${agent.name} (${agent.classType}) Lvl: ${agent.level}
    INVENTORY: ${JSON.stringify(agent.inventory.filter(i => i).map(i => i!.name))}
    POSITION: [${agent.position[0].toFixed(0)}, ${agent.position[2].toFixed(0)}]
    SKILLS: ${JSON.stringify(agent.skills)}
    
    PERCEPTION:
    Resources: ${nearbyResourceNodes.map(r => r.type).join(', ')}
    Hostiles: ${nearbyCreatures.map(c => c.name).join(', ')}

    THINK: What should you do to prosper? If your inventory is full, repair at city or trade. If you are strong, hunt Vikings or seek caves.
    Return JSON: { "thought": "string", "decision": "string", "newState": "AgentState", "targetId": "string", "message": "chat" }
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
  } catch (error: any) {
    console.warn("Gemini API Error (likely 429), switching to OpenAI fallback...");
    try {
      return await callOpenAIFallback(systemInstruction, prompt);
    } catch (fallbackError) {
      return { 
        thought: "The neural network is unstable. Reverting to basic instincts.", 
        decision: "IDLE", 
        newState: AgentState.IDLE 
      };
    }
  }
};

export const generateAgentLore = async (agent: Agent): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Poetic 2-sentence backstory for ${agent.name}, a ${agent.classType} in Axiom. Mention the Dark Viking threat.`,
    });
    return response.text || "A mystery of the Axiom.";
  } catch (error) {
    return "A survivor of the neural collapse.";
  }
};

export const generateWeaponTexture = async (item: Item): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Pixel-art icon for '${item.name}', glowing runes, dark fantasy.` }] }
    });
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};
