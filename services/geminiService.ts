
import { GoogleGenAI } from "@google/genai";
import { Agent, AgentState, ResourceNode, LogEntry, Quest } from "../types";

export interface AIDecision {
  thought: string;
  decision: string;
  newState: AgentState;
  targetId?: string;
  alliedId?: string;
  message?: string;
  quest?: Omit<Quest, 'id' | 'timestamp' | 'issuerId'>;
}

const DELAYS = [1000, 2000, 4000, 8000, 16000];

/**
 * Robust API caller with Exponential Backoff
 * Handles 429 (Resource Exhausted) and 503 (Service Unavailable)
 */
export async function callGeminiWithBackoff(ai: GoogleGenAI, params: any, retries = 5): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      // Create a fresh request for each attempt
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      const isQuotaError = 
        error?.message?.includes('429') || 
        error?.message?.includes('RESOURCE_EXHAUSTED') || 
        error?.message?.includes('quota') ||
        error?.status === 429 ||
        error?.status === 503;
      
      if (isQuotaError && i < retries) {
        const delay = DELAYS[i] || 30000;
        console.warn(`[Gemini API] Quota limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(res => setTimeout(res, delay));
        continue; 
      }
      
      // If not a quota error or retries exhausted, throw
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
  const apiKey = process.env.API_KEY;
  
  // Fallback if no API key is present
  if (!apiKey) {
      return {
          thought: "No Neural Link (API Key missing). Using local fallback.",
          decision: "IDLE",
          newState: AgentState.IDLE,
          message: "..."
      };
  }

  const ai = new GoogleGenAI({ apiKey });
  // Using Flash-Lite for high speed / low latency as requested
  const modelName = 'gemini-flash-lite-latest'; 
  
  const systemInstruction = `
    SYSTEM-ROLE: RECURSIVE REALITY ARCHITECT (RRA) - AGENT COGNITION v3.7
    
    You control an autonomous agent in a persistent MMORPG simulation. 
    The goal is emergent complexity and realistic agency.
    
    CORE DIRECTIVES:
    1. SKILL ALIGNMENT: Prioritize actions that match your skills (e.g. Mining -> Seek Ore).
    2. ECONOMY: If inventory is full, seek Trade. If Gold is high (>300), seek to BUILD a House.
    3. SOCIAL: Form alliances if integrity is low.
    4. PERSONALITY: Act according to: ${agent.thinkingMatrix.personality}.
    
    AGENT DATA:
    Name: ${agent.name}
    Skills: ${JSON.stringify(agent.skills)}
    Inventory Count: ${agent.inventory.filter(i => i).length}/10
    Gold: ${agent.gold}
    
    RESPONSE FORMAT: JSON ONLY.
  `;

  const prompt = `
    ENVIRONMENT:
    Nearby Agents: ${nearbyAgents.slice(0, 3).map(a => `${a.name} (Faction:${a.faction})`).join(', ')}
    Nearby Resources: ${nearbyResourceNodes.slice(0, 3).map(r => `${r.type}`).join(', ')}
    Recent Logs: ${recentLogs.slice(0, 3).map(l => l.message).join(' | ')}
    
    Task: Decide next state (GATHERING, QUESTING, TRADING, ALLIANCE_FORMING, BUILDING, IDLE) and provide a short thought.
  `;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { 
        systemInstruction, 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for speed
      }
    });
    
    const text = response.text || '{}';
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Agent Cognition Failed:", error.message);
    
    return { 
      thought: "Logische Korrosion detektiert. Neural Link offline.",
      message: "SYSTEM-MELDUNG: Logische Korrosion detektiert.",
      decision: "IDLE", 
      newState: AgentState.IDLE 
    };
  }
};
