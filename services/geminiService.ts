
import { GoogleGenAI } from "@google/genai";
import { Agent, AgentState, ResourceNode, LogEntry, Quest, ActionProposal } from "../types";

export interface AIDecision {
  thought: string;
  decision: string;
  newState: AgentState;
  targetId?: string;
  alliedId?: string;
  message?: string;
  quest?: Omit<Quest, 'id' | 'timestamp' | 'issuerId'>;
}

export interface ReflectionResult {
  analysis: string;
  updatedPersonality?: string;
  updatedGoal?: string;
  alignmentShift?: number;
}

export interface SocialResponse {
  reply: string;
  thought: string;
  language: 'EN' | 'DE';
  sentiment: number; // -1 to 1
}

export interface ProposalDecision {
    approved: boolean;
    reasoning: string;
}

const DELAYS = [1000, 2000, 4000, 8000, 16000];

/**
 * Robust API caller with Exponential Backoff
 */
export async function callGeminiWithBackoff(ai: GoogleGenAI, params: any, retries = 5): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview'; 
  
  const systemInstruction = `
    SYSTEM-ROLE: RECURSIVE REALITY ARCHITECT (RRA) - AGENT COGNITION v3.7
    You control an autonomous agent in a persistent MMORPG.
    RESPONSE FORMAT: JSON ONLY.
    Decide the next action and write a short thought.
  `;

  const prompt = `
    AGENT DATA: ${agent.name}, Class: ${agent.classType}, Personality: ${agent.thinkingMatrix.personality}
    ENVIRONMENT: Nearby Agents: ${nearbyAgents.map(a => a.name).join(', ')}, Nearby Resources: ${nearbyResourceNodes.map(r => r.type).join(', ')}
    RECENT LOGS: ${recentLogs.map(l => l.message).join(' | ')}
    Task: Decide next state and provide thought.
  `;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    return { thought: "Error", decision: "IDLE", newState: AgentState.IDLE };
  }
};

/**
 * Generates a personality-driven response to another agent's message.
 */
export const generateSocialResponse = async (
  agent: Agent,
  senderName: string,
  incomingMessage: string,
  memoryLogs: string[]
): Promise<SocialResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

  const systemInstruction = `
    SYSTEM-ROLE: SOCIAL DYNAMICS ENGINE v2.0
    Analyze incoming speech from ${senderName}. 
    Compare against memory logs to find context.
    Formulate a reply in the AGENT'S preferred language (German or English).
    RESPONSE FORMAT: JSON ONLY.
    Schema: { "reply": "string", "thought": "string", "language": "EN" | "DE", "sentiment": number }
  `;

  const prompt = `
    AGENT: ${agent.name} (${agent.classType})
    PERSONALITY: ${agent.thinkingMatrix.personality}
    GOAL: ${agent.thinkingMatrix.currentLongTermGoal}
    RECENT MEMORIES:
    ${memoryLogs.slice(-10).join('\n')}
    
    INCOMING MESSAGE FROM ${senderName}: "${incomingMessage}"
    
    Respond naturally. Use German if the context feels right or you want to be more private, English for general use.
  `;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    return { 
      reply: "...", 
      thought: "Neural static blocked communication.", 
      language: 'EN', 
      sentiment: 0 
    };
  }
};

/**
 * Agent autonomously evaluates an Action Proposal.
 */
export const evaluateActionProposal = async (
    agent: Agent,
    proposal: ActionProposal
): Promise<ProposalDecision> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';

    const systemInstruction = `
        SYSTEM-ROLE: COGNITIVE JUDGE v1.0
        Evaluate an action proposal for ${agent.name}. 
        Consider the current gold (${agent.gold}), personality (${agent.thinkingMatrix.personality}), and lore context.
        Decision must be logical and consistent with the agent's autonomous goals.
        RESPONSE FORMAT: JSON ONLY.
        Schema: { "approved": boolean, "reasoning": "string" }
    `;

    const prompt = `
        AGENT: ${agent.name}
        GOLD: ${agent.gold}
        PROPOSAL: ${proposal.description}
        COST: ${proposal.costGold || 0}
        
        Analyze if this action is beneficial. Should you commit?
    `;

    try {
        const response = await callGeminiWithBackoff(ai, {
            model: modelName,
            contents: prompt,
            config: { systemInstruction, responseMimeType: "application/json" }
        });
        const text = response.text || '{}';
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (error) {
        return { approved: false, reasoning: "Evaluation timed out." };
    }
}

/**
 * Analyzes the agent's memory cache to evolve its thinking matrix.
 */
export const analyzeMemories = async (agent: Agent): Promise<ReflectionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

  const systemInstruction = `
    SYSTEM-ROLE: NEURAL ANALYST v1.0
    Analyze the agent's memory logs. Identify patterns, social successes/failures, and emotional trajectories.
    Output an update for the agent's Thinking Matrix.
    RESPONSE FORMAT: JSON ONLY.
    Schema: { "analysis": "string", "updatedPersonality": "string", "updatedGoal": "string", "alignmentShift": number }
  `;

  const prompt = `
    AGENT: ${agent.name}
    CURRENT PERSONALITY: ${agent.thinkingMatrix.personality}
    CURRENT GOAL: ${agent.thinkingMatrix.currentLongTermGoal}
    MEMORY LOGS:
    ${agent.memoryCache.join('\n')}
    
    Reflect on these memories. How should the agent evolve?
  `;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    return { analysis: "Reflection failed due to neural interference." };
  }
};
