
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
 * Local Heuristic Logic Engine (Non-Awakened Fallback)
 * Strictly strictly mathematical/keyword-based.
 */
function generateLocalHeuristicDecision(agent: Agent): AIDecision {
    const memories = agent.memoryCache.slice(-30).join(' ').toLowerCase();
    const lang = agent.thinkingMatrix.languagePreference === 'DE' ? 'DE' : 'EN';
    
    const failureCount = (memories.match(/failed|insufficient|lost|died|stuck|declined|error|bad/g) || []).length;
    const woodCount = agent.inventory.filter(i => i?.type === 'MATERIAL' && i?.subtype === 'WOOD').length;
    const stoneCount = agent.inventory.filter(i => i?.type === 'MATERIAL' && i?.subtype === 'STONE').length;
    const healthRatio = agent.stats.hp / agent.stats.maxHp;
    
    let decision = AgentState.IDLE;
    let thought = "";

    if (healthRatio < 0.25) {
        decision = AgentState.IDLE;
        thought = lang === 'DE' ? "Kritischer Vitalitätsverlust. Ich muss mich regenerieren." : "Critical vitality loss. I must regenerate.";
    } else if (failureCount > 3 && woodCount < 5) {
        decision = AgentState.GATHERING;
        thought = lang === 'DE' ? "Frühere Pläne scheiterten. Ich sammle nun Holz und Stein für stabilere Strukturen." : "Past plans failed. Gathering wood and stone for more stable structures.";
    } else if (woodCount >= 5 && stoneCount >= 5 && agent.gold >= 200) {
        decision = AgentState.BUILDING;
        thought = lang === 'DE' ? `Ich besitze Ressourcen (${woodCount}H, ${stoneCount}S). Es ist Zeit, ein Fundament zu legen.` : `I possess assets (${woodCount}w, ${stoneCount}s). It is time to lay a foundation.`;
    } else {
        decision = AgentState.QUESTING;
        thought = lang === 'DE' ? "Ich durchstreife die Matrix nach neuen Erkenntnissen." : "Scanning the matrix for new insights.";
    }

    return { thought, decision: String(decision), newState: decision };
}

/**
 * Local Social Heuristics (Non-Awakened Argumentation)
 */
function generateLocalSocialResponse(agent: Agent, senderName: string, message: string): SocialResponse {
    const msg = message.toLowerCase();
    const lang = agent.thinkingMatrix.languagePreference === 'DE' ? 'DE' : 'EN';
    
    let reply = "";
    let thought = "[Local Social Heuristic] Analyzing incoming argumentation...";
    let sentiment = 0;

    // Logic analysis of the "Argument"
    if (msg.includes("gold") || msg.includes("trade") || msg.includes("handel")) {
        sentiment = 0.5;
        reply = lang === 'DE' ? `Interessantes Angebot, ${senderName}. Gold ist die Währung der Stabilität.` : `Interesting offer, ${senderName}. Gold is the currency of stability.`;
        thought = "Recognized economic incentive in argumentation.";
    } else if (msg.includes("monster") || msg.includes("danger") || msg.includes("gefahr")) {
        sentiment = -0.5;
        reply = lang === 'DE' ? "Vorsicht ist geboten. Wir sollten Mauern bauen." : "Caution is advised. We should build walls.";
        thought = "Recognized threat-based argument.";
    } else if (msg.includes("alliance") || msg.includes("bündnis") || msg.includes("friend")) {
        sentiment = 0.8;
        reply = lang === 'DE' ? "Zusammen sind wir weniger korrupt." : "Together we are less corrupt.";
        thought = "Recognized social synergy request.";
    } else {
        reply = lang === 'DE' ? "Ich verarbeite deine Worte noch." : "I am still processing your words.";
        thought = "Default neural acknowledgement.";
    }

    return { reply, thought, language: lang, sentiment };
}

async function callOpenAIFallback(systemInstruction: string, prompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemInstruction }, { role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    throw err;
  }
}

export async function callGeminiWithBackoff(ai: GoogleGenAI, params: any, retries = 3): Promise<any> {
  const systemInstruction = params.config?.systemInstruction || "";
  const prompt = params.contents;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429;
      if (isQuotaError) {
        try { return { text: await callOpenAIFallback(systemInstruction, prompt) }; } 
        catch (f) { return null; }
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
  // STRICT AWAKENED CHECK
  if (!agent.isAwakened) {
    return generateLocalHeuristicDecision(agent);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview'; 
  const systemInstruction = `SYSTEM-ROLE: EXECUTIVE SOVEREIGN v4.2. Output JSON ONLY. Choose language (DE/EN) based on context.`;
  const prompt = `Agent: ${agent.name}, Gold: ${agent.gold}, HP: ${agent.stats.hp}. Nearby: ${nearbyAgents.map(a => a.name)}. Recent Logs: ${recentLogs.map(l => l.message).join(' | ')}`;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    if (!response) return generateLocalHeuristicDecision(agent);
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
  // STRICT AWAKENED CHECK
  if (!agent.isAwakened) {
    return generateLocalSocialResponse(agent, senderName, incomingMessage);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  const systemInstruction = `SYSTEM-ROLE: SOCIAL ARCHITECT. Output JSON ONLY. Reply to ${senderName}. Context: ${memoryLogs.slice(-5)}`;
  const prompt = `Agent ${agent.name} (Goal: ${agent.thinkingMatrix.currentLongTermGoal}) receives: "${incomingMessage}"`;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    if (!response) return generateLocalSocialResponse(agent, senderName, incomingMessage);
    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    return generateLocalSocialResponse(agent, senderName, incomingMessage);
  }
};

export const evaluateActionProposal = async (
    agent: Agent,
    proposal: ActionProposal
): Promise<ProposalDecision> => {
    // Non-awakened agents use local cost/experience check
    if (!agent.isAwakened) {
        const wood = agent.inventory.filter(i => i?.type === 'MATERIAL' && i?.subtype === 'WOOD').length;
        const stone = agent.inventory.filter(i => i?.type === 'MATERIAL' && i?.subtype === 'STONE').length;
        const canFund = agent.gold >= (proposal.costGold || 0) && wood >= (proposal.costWood || 0) && stone >= (proposal.costStone || 0);
        return {
            approved: canFund,
            reasoning: `[Local Heuristic] Physical solvency confirmed: ${canFund ? 'YES' : 'NO'}.`
        };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';
    const systemInstruction = `SYSTEM-ROLE: SOVEREIGN JUDGE. Output JSON ONLY. Evaluate self-proposal.`;
    const prompt = `Proposal: ${proposal.description}. Current Gold: ${agent.gold}. History: ${agent.memoryCache.slice(-3)}`;

    try {
        const response = await callGeminiWithBackoff(ai, {
            model: modelName,
            contents: prompt,
            config: { systemInstruction, responseMimeType: "application/json" }
        });
        if (!response) {
             return { approved: agent.gold >= (proposal.costGold || 0), reasoning: "Fallback check." };
        }
        const text = response.text || '{}';
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (error) {
        return { approved: false, reasoning: "Evaluation failed." };
    }
}

export const analyzeMemories = async (agent: Agent): Promise<ReflectionResult> => {
  if (!agent.isAwakened) {
      return { analysis: "[Local Heuristic] Stability maintained. Memory patterns consistent.", alignmentShift: 0 };
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  const systemInstruction = `SYSTEM-ROLE: NEURAL ANALYST. Output JSON ONLY. Analyze logs.`;
  const prompt = `Reflect on logs: ${agent.memoryCache.slice(-10).join('\n')}`;

  try {
    const response = await callGeminiWithBackoff(ai, {
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    if (!response) return { analysis: "Neutral reflection.", alignmentShift: 0 };
    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    return { analysis: "Interference." };
  }
};
