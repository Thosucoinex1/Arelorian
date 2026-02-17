
import { GoogleGenAI, Type } from "@google/genai";
import { Agent, AgentState, Item, ResourceNode, LogEntry, Quest } from "../types";

export interface AIDecision {
  thought: string;
  decision: string;
  newState: AgentState;
  targetId?: string;
  alliedId?: string;
  message?: string;
  quest?: Omit<Quest, 'id' | 'timestamp' | 'issuerId'>;
}

export const generateAutonomousDecision = async (
  agent: Agent, 
  nearbyAgents: Agent[], 
  nearbyResourceNodes: ResourceNode[],
  recentLogs: LogEntry[],
  isSafeZone: boolean
): Promise<AIDecision> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const modelName = 'gemini-3-pro-preview';
  
  const systemInstruction = `
    SYSTEM-ROLE: RECURSIVE REALITY ARCHITECT (RRA) - AGENT COGNITION v3.5
    
    You control an autonomous agent in a persistent MMORPG simulation. 
    The goal is emergent complexity and realistic agency.
    
    CORE DIRECTIVES:
    1. PROACTIVE RESOURCE SEEKING: If you have gathering skills, seek corresponding resources (e.g., Miners seek ore, Woodcutters seek trees).
    2. SOCIAL EMERGENCE: 
       - Forming Alliances: If a task or area seems dangerous (low stability), seek an 'alliedId' from nearby agents.
       - Trade Negotiations: If your inventory is full or you lack a specific resource, initiate trade with a message.
    3. ORGANIC QUESTS: You can initiate quests based on observations. If you notice resource scarcity or high entropy, issue a quest to the world.
    4. RECURSIVE MEMORY: Use the 'recentLogs' and 'thinkingMatrix' to maintain personality consistency.
    
    AGENT DATA:
    Name: ${agent.name}
    Personality: ${agent.thinkingMatrix.personality}
    Skills: ${JSON.stringify(agent.skills)}
    Inventory: ${agent.inventory.filter(i => i).map(i => i?.name).join(', ')}
    Stability: ${agent.stabilityIndex}
    
    RESPONSE FORMAT: JSON ONLY.
    Schema:
    {
      "thought": "Internal recursive monologue",
      "decision": "Action label",
      "newState": "AgentState value",
      "targetId": "ID of resource node or agent",
      "alliedId": "Optional agent ID to form an alliance",
      "message": "Optional public message/trade offer",
      "quest": { "title": "...", "description": "...", "rewardGold": 100 }
    }
  `;

  const prompt = `
    ENVIRONMENT:
    Nearby Agents: ${nearbyAgents.map(a => `${a.name} (ID:${a.id}, Faction:${a.faction})`).join(', ')}
    Nearby Resources: ${nearbyResourceNodes.map(r => `${r.type} (ID:${r.id}) at [${r.position[0]}, ${r.position[2]}]`).join(', ')}
    Logs: ${recentLogs.map(l => l.message).join(' | ')}
    
    What is your current emergent intent? Focus on skill-based gathering or social interaction if agents are near.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { 
        systemInstruction, 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4096 }
      }
    });
    
    const text = response.text || '{}';
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("AI Decision Error:", error);
    return { 
      thought: "Instability detected. Reverting to base state.", 
      decision: "IDLE", 
      newState: AgentState.IDLE 
    };
  }
};
