
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

const OPENAI_API_KEY = "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";
const DELAYS = [1000, 2000, 4000, 8000, 16000];

/**
 * Tier 3 Fallback: Advanced Local Heuristic Logic Engine (Experience-Aware)
 * Analyzes memory logs for positive/negative outcomes to drive autonomous planning.
 */
function generateLocalHeuristicDecision(agent: Agent): AIDecision {
    const memories = agent.memoryCache.slice(-30).join(' ').toLowerCase();
    
    // Valence Pattern Matching (Learning from History)
    const failurePatterns = (memories.match(/failed|insufficient|lost|died|stuck|declined|error|bad/g) || []).length;
    const successPatterns = (memories.match(/success|approved|gained|killed|built|found|good|profit/g) || []).length;
    
    // Resource Analysis
    const woodCount = agent.inventory.filter(i => i?.type === 'MATERIAL' && i?.subtype === 'WOOD').length;
    const stoneCount = agent.inventory.filter(i => i?.type === 'MATERIAL' && i?.subtype === 'STONE').length;
    const healthRatio = agent.stats.hp / agent.stats.maxHp;
    
    let decision = AgentState.IDLE;
    let thought = "[Neural Trace Analysis] Synchronizing experience logs...";

    // 1. Critical Survival
    if (healthRatio < 0.25) {
        decision = AgentState.IDLE;
        thought = "[Neural Trace] Critical integrity breach. Prioritizing rest cycle.";
    } 
    // 2. Learning from Planning Failures
    else if (failurePatterns > successPatterns && woodCount < 5) {
        decision = AgentState.GATHERING;
        thought = "[Neural Trace] Previous planning attempts yielded 'Failure'. Redirecting to resource accumulation (Wood/Stone).";
    }
    // 3. Resource-Driven Ambition
    else if (woodCount >= 10 && stoneCount >= 10 && agent.gold >= 200) {
        decision = AgentState.BUILDING;
        thought = `[Neural Trace] Physical assets identified: ${woodCount}w, ${stoneCount}s. Materializing architectural proposal.`;
    }
    // 4. Social Stability
    else if (memories.includes('lonely') || (agent.soulDensity < 0.4)) {
        decision = AgentState.ALLIANCE_FORMING;
        thought = "[Neural Trace] Social entropy detected. Initiating collective synergy protocols.";
    }
    // 5. Default Exploration
    else {
        decision = AgentState.QUESTING;
        thought = "[Neural Trace] Experience logs stable. Proceeding with world data extraction.";
    }

    return {
        thought,
        decision: String(decision),
        newState: decision
    };
}

/**
 * Fallback to OpenAI if Gemini fails due to quota limits
 */
async function callOpenAIFallback(systemInstruction: string, prompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
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
    return data.choices[0].message.content;
  } catch (err) {
    console.error("OpenAI Fallback failed:", err);
    throw err;
  }
}

/**
 * Robust API caller with Exponential Backoff and OpenAI Fallback
 */
export async function callGeminiWithBackoff(ai: GoogleGenAI, params: any, retries = 3): Promise<any> {
  const systemInstruction = params.config?.systemInstruction || "";
  const prompt = params.contents;

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      const isQuotaError = 
        error?.message?.includes('429') || 
        error?.message?.includes('RESOURCE_EXHAUSTED') || 
        error?.message?.includes('quota') ||
        error?.status === 429;
      
      if (isQuotaError) {
        console.warn(`[Gemini API] Quota limit hit. Attempting OpenAI Fallback...`);
        try {
           const fallbackText = await callOpenAIFallback(systemInstruction, prompt);
           return { text: fallbackText };
        } catch (fallbackError) {
           return null;
        }
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
    SYSTEM-ROLE: EXECUTIVE SOVEREIGNTY ENGINE v4.0
    Analyze agent stats and memory logs. Determine if the agent should propose a resource-heavy action.
    Decide the next state based on material wealth and history.
    RESPONSE FORMAT: JSON ONLY.
  `;

  const prompt = `
    AGENT DATA: ${agent.name}, Gold: ${agent.gold}, Memory Tags: ${agent.memoryCache.slice(-5).join(',')}
    ENVIRONMENT: Nearby Agents: ${nearbyAgents.map(a => a.name).join(', ')}
    Task: Decide next state. If previous attempts failed, explain why in 'thought'.
  `;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });

    if (!response) {
        return generateLocalHeuristicDecision(agent);
    }

    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    return generateLocalHeuristicDecision(agent);
  }
};

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
    RESPONSE FORMAT: JSON ONLY.
  `;

  const prompt = `
    AGENT: ${agent.name}
    INCOMING MESSAGE FROM ${senderName}: "${incomingMessage}"
  `;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    
    if (!response) {
        return {
            reply: "... [Analyzing Social Context] ...",
            thought: "[Local Logic] Using default response during neural static.",
            language: agent.thinkingMatrix.languagePreference === 'DE' ? 'DE' : 'EN',
            sentiment: 0
        };
    }

    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    return { 
      reply: "...", 
      thought: "Neural static.", 
      language: 'EN', 
      sentiment: 0 
    };
  }
};

export const evaluateActionProposal = async (
    agent: Agent,
    proposal: ActionProposal
): Promise<ProposalDecision> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';

    const systemInstruction = `
        SYSTEM-ROLE: AUTONOMOUS JUDGE v2.0
        Evaluate if YOU (${agent.name}) should approve this action for YOURSELF.
        Analyze Gold (${agent.gold}) and Memory Logs. 
        RESPONSE FORMAT: JSON ONLY.
        Schema: { "approved": boolean, "reasoning": "string" }
    `;

    const prompt = `
        PROPOSAL: ${proposal.description}
        COSTS: Gold: ${proposal.costGold}, Wood: ${proposal.costWood}, Stone: ${proposal.costStone}
        MY HISTORY: ${agent.memoryCache.slice(-5).join(' | ')}
    `;

    try {
        const response = await callGeminiWithBackoff(ai, {
            model: modelName,
            contents: prompt,
            config: { systemInstruction, responseMimeType: "application/json" }
        });

        if (!response) {
            // Local resource check fallback
            const wood = agent.inventory.filter(i => i?.type === 'MATERIAL' && i?.subtype === 'WOOD').length;
            const stone = agent.inventory.filter(i => i?.type === 'MATERIAL' && i?.subtype === 'STONE').length;
            const canFund = agent.gold >= (proposal.costGold || 0) && wood >= (proposal.costWood || 0) && stone >= (proposal.costStone || 0);
            
            return {
                approved: canFund,
                reasoning: `[Local Logic] Resource verification ${canFund ? 'Successful' : 'Failed'}. Math: G:${agent.gold}, W:${wood}, S:${stone}.`
            };
        }

        const text = response.text || '{}';
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (error) {
        return { approved: false, reasoning: "Self-evaluation failure." };
    }
}

export const analyzeMemories = async (agent: Agent): Promise<ReflectionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

  const systemInstruction = `
    SYSTEM-ROLE: NEURAL ANALYST v1.0
    Analyze the agent's memory logs. Identify patterns.
    RESPONSE FORMAT: JSON ONLY.
  `;

  const prompt = `
    AGENT: ${agent.name}
    MEMORY LOGS:
    ${agent.memoryCache.join('\n')}
  `;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });

    if (!response) {
        return {
            analysis: "[Local Logic] Stable pattern detected.",
            alignmentShift: 0
        };
    }

    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    return { analysis: "Neural interference." };
  }
};
