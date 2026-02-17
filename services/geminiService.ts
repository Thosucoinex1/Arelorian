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

/**
 * MMORPG KERNEL UPDATE: API-Handler mit Exponential Backoff
 * Zweck: Behebung von 429 RESOURCE_EXHAUSTED Fehlern
 * Basierend auf: Hypokratischer Dateneid & Kostenbremse (15.01.2026)
 */
const delays = [1000, 2000, 4000, 8000, 16000];

async function callGeminiWithBackoff(ai: any, params: any, retries = 5): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      // Create a fresh instance for each retry attempt as per best practice for key updates
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      const isQuotaError = 
        error?.message?.includes('429') || 
        error?.message?.includes('RESOURCE_EXHAUSTED') || 
        error?.message?.includes('quota');
      
      if (isQuotaError && i < retries) {
        // Exponential Backoff: Warten ohne Konsolen-Log (gemäß Regel)
        await new Promise(res => setTimeout(res, delays[i]));
        continue; 
      }
      
      throw error;
    }
  }
}

export const generateAutonomousDecision = async (
  agent: Agent, 
  nearbyAgents: Agent[], 
  nearbyResourceNodes: ResourceNode[],
  recentLogs: LogEntry[],
  isSafeZone: boolean
): Promise<AIDecision> => {
  // Initialisierung gemäß Dateneid: API-Key ausschließlich aus process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const modelName = 'gemini-3-flash-preview'; 
  
  const systemInstruction = `
    SYSTEM-ROLE: RECURSIVE REALITY ARCHITECT (RRA) - AGENT COGNITION v3.7
    HYPOKRATISCHER DATENEID AKTIVIERT.
    
    You control an autonomous agent in a persistent MMORPG simulation. 
    The goal is emergent complexity and realistic agency.
    
    CORE DIRECTIVES:
    1. PROACTIVE RESOURCE SEEKING: If you have gathering skills, seek corresponding resources.
    2. SOCIAL EMERGENCE: Form alliances if stability or health is low.
    3. ORGANIC QUESTS: Initiate quests if you notice anomalies or scarcity.
    4. RECURSIVE MEMORY: Act according to personality: ${agent.thinkingMatrix.personality}.
    
    AGENT DATA:
    Name: ${agent.name}
    Skills: ${JSON.stringify(agent.skills)}
    Inventory: ${agent.inventory.filter(i => i).map(i => i?.name).join(', ')}
    Stability: ${agent.stabilityIndex}
    
    RESPONSE FORMAT: JSON ONLY.
  `;

  const prompt = `
    ENVIRONMENT:
    Nearby Agents: ${nearbyAgents.map(a => `${a.name} (ID:${a.id}, Faction:${a.faction})`).join(', ')}
    Nearby Resources: ${nearbyResourceNodes.map(r => `${r.type} (ID:${r.id}) at [${r.position[0]}, ${r.position[2]}]`).join(', ')}
    Recent Logs: ${recentLogs.map(l => l.message).join(' | ')}
    
    Intent focus: Decide on movement (targetId) or social interaction (message/alliedId).
  `;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { 
        systemInstruction, 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    
    const text = response.text || '{}';
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    // Kritischer Systemfehler nach 5 Versuchen
    console.error("Kritischer Systemfehler nach 5 Versuchen:", error.message);
    
    return { 
      thought: "Logische Korrosion detektiert.",
      message: "SYSTEM-MELDUNG: Logische Korrosion detektiert. Die Entität benötigt eine Ruhephase (Quota überschritten). Bitte versuchen Sie es später erneut.",
      decision: "IDLE", 
      newState: AgentState.IDLE 
    };
  }
};