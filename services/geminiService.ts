
import { GoogleGenAI } from "@google/genai";
import { Agent, AgentState, ResourceNode, LogEntry, ActionProposal, Quest } from "../types";
import { useStore } from "../store";

export interface AIDecision {
  justification: string;
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
  action?: 'COOPERATE' | 'REJECT' | 'NEUTRAL';
}

export interface ProposalDecision {
    approved: boolean;
    reasoning: string;
}

const OPENAI_API_KEY = "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";

const QUOTA_BLOCK_DURATION = 5 * 60 * 1000;

function markQuotaExceeded(agentId: string) {
    const store = useStore.getState();
    const now = Date.now();
    const agent = store.agents.find(a => a.id === agentId);
    if (agent && !agent.apiQuotaExceeded) {
        store.addLog(`Neural Link for ${agent.name} throttled. Falling back to local heuristics.`, 'WATCHDOG', 'AXIOM');
    }
    useStore.setState(state => ({
        agents: state.agents.map(a => a.id === agentId ? {
            ...a,
            apiQuotaExceeded: true,
            quotaResetTime: now + QUOTA_BLOCK_DURATION
        } : a)
    }));
}

function generateLocalHeuristicDecision(agent: Agent, canScan: boolean): AIDecision {
    const memories = agent.memoryCache.slice(-30).join(' ').toLowerCase();
    const lang = agent.thinkingMatrix.languagePreference === 'DE' ? 'DE' : 'EN';
    const failureCount = (memories.match(/failed|insufficient|lost|died|stuck|declined|error|bad/g) || []).length;
    const woodCount = agent.inventory.filter(i => i?.type === 'MATERIAL' && i?.subtype === 'WOOD').length;
    const stoneCount = agent.inventory.filter(i => i?.type === 'MATERIAL' && i?.subtype === 'STONE').length;
    const healthRatio = agent.stats.hp / agent.stats.maxHp;
    
    let decision = AgentState.IDLE;
    let justification = "";

    if (healthRatio < 0.25) {
        decision = AgentState.IDLE;
        justification = lang === 'DE' ? "Kritischer Vitalitätsverlust. Regeneration erforderlich." : "Critical vitality loss. Regeneration required.";
    } else if (failureCount > 3 && woodCount < 5) {
        decision = AgentState.GATHERING;
        justification = lang === 'DE' ? "Stabilisierungs-Ressourcen fehlen. Sammle Holz/Stein." : "Stabilization resources missing. Gathering wood/stone.";
    } else if (woodCount >= 5 && stoneCount >= 5 && agent.gold >= 200) {
        decision = AgentState.BUILDING;
        justification = lang === 'DE' ? "Infrastruktur-Ziele erreicht. Errichte Basis." : "Infrastructure goals met. Constructing base.";
    } else if (canScan) {
        decision = AgentState.QUESTING;
        justification = lang === 'DE' ? "Sondiere Matrix-Anomalien." : "Probing matrix anomalies.";
    } else {
        decision = AgentState.IDLE;
        justification = lang === 'DE' ? "Warte auf Synchronisation." : "Waiting for synchronization.";
    }

    return { justification, decision: String(decision), newState: decision };
}

function generateLocalSocialResponse(agent: Agent, senderName: string, message: string): SocialResponse {
    const msg = message.toLowerCase();
    const lang = agent.thinkingMatrix.languagePreference === 'DE' ? 'DE' : 'EN';
    const personality = agent.thinkingMatrix.personality.toLowerCase();
    const healthRatio = agent.stats.hp / agent.stats.maxHp;
    const isDangerous = healthRatio < 0.4 || msg.includes("monster") || msg.includes("danger");
    
    let reply = "";
    let thought = `[Dialectic] Analysing message from ${senderName}.`;
    let sentiment = 0;
    let action: 'COOPERATE' | 'REJECT' | 'NEUTRAL' = 'NEUTRAL';

    const hasCooperation = msg.includes("zusammen") || msg.includes("together") || msg.includes("haus") || msg.includes("build");

    if (hasCooperation) {
        if (isDangerous) {
            action = 'REJECT';
            sentiment = -0.5;
            thought += " Rejecting cooperation due to low integrity/threat.";
            reply = lang === 'DE' 
                ? `${senderName}, die Matrix ist zu instabil für Experimente. Ich lehne ab.` 
                : `${senderName}, the matrix is too unstable for experiments. I decline.`;
        } else {
            action = 'COOPERATE';
            sentiment = 0.8;
            thought += " Cooperative synergy identified.";
            reply = lang === 'DE' 
                ? `Einverstanden, ${senderName}. Kollektive Konstruktion erhöht die Stabilität.` 
                : `Agreed, ${senderName}. Collective construction increases stability.`;
        }
    } else if (msg.includes("gold") || msg.includes("trade")) {
        sentiment = 0.4;
        reply = lang === 'DE' ? `Gold ist eine stabile Konstante. Ich höre zu.` : `Gold is a stable constant. I am listening.`;
    } else {
        reply = lang === 'DE' ? `Ich verarbeite dein Signal, ${senderName}.` : `Processing your signal, ${senderName}.`;
    }

    return { reply, thought, language: lang, sentiment, action };
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
    if (response.status === 429) throw new Error("OPENAI_QUOTA_EXCEEDED");
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    throw err;
  }
}

export async function callGeminiWithBackoff(ai: GoogleGenAI, agentId: string, params: any, retries = 3): Promise<any> {
  const systemInstruction = params.config?.systemInstruction || "";
  const prompt = params.contents;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429;
      if (isQuotaError) {
        try { 
            const fallbackText = await callOpenAIFallback(systemInstruction, prompt);
            return { text: fallbackText }; 
        } catch (f: any) { 
            if (f.message === "OPENAI_QUOTA_EXCEEDED") markQuotaExceeded(agentId);
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
  isSafeZone: boolean,
  canScan: boolean
): Promise<AIDecision> => {
  if (!agent.isAwakened || agent.apiQuotaExceeded) return generateLocalHeuristicDecision(agent, canScan);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview'; 
  const systemInstruction = `SYSTEM-ROLE: EXECUTIVE SOVEREIGN v4.5. JSON ONLY. Language duality (DE/EN). Output 'justification' as a logical internal derivation of the 'decision'. Context: HP:${agent.stats.hp}/${agent.stats.maxHp}, Gold:${agent.gold}, canScan:${canScan}.`;
  const prompt = `State: ${agent.state}. Agents: ${nearbyAgents.map(a => a.name)}. Nodes: ${nearbyResourceNodes.map(n => n.type)}. Recent: ${recentLogs.map(l => l.message).join(' | ')}`;
  try {
    const response = await callGeminiWithBackoff(ai, agent.id, {
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    if (!response) return generateLocalHeuristicDecision(agent, canScan);
    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    return generateLocalHeuristicDecision(agent, canScan);
  }
};

export const generateSocialResponse = async (
  agent: Agent,
  senderName: string,
  incomingMessage: string,
  memoryLogs: string[]
): Promise<SocialResponse> => {
  if (!agent.isAwakened || agent.apiQuotaExceeded) return generateLocalSocialResponse(agent, senderName, incomingMessage);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  const systemInstruction = `SYSTEM-ROLE: SOCIAL ARCHITECT. JSON ONLY. Language duality (DE/EN). Decide: COOPERATE, REJECT, or NEUTRAL. Current HP: ${agent.stats.hp}.`;
  const prompt = `Received: "${incomingMessage}" from ${senderName}. Personality: ${agent.thinkingMatrix.personality}.`;
  try {
    const response = await callGeminiWithBackoff(ai, agent.id, {
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

export const evaluateActionProposal = async (agent: Agent, proposal: ActionProposal): Promise<ProposalDecision> => {
    if (!agent.isAwakened || agent.apiQuotaExceeded) {
        const cost = proposal.costGold || 0;
        const canFund = agent.gold >= cost;
        return { approved: canFund, reasoning: "[Local Heuristic] Solvency check complete." };
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callGeminiWithBackoff(ai, agent.id, {
        model: 'gemini-3-flash-preview',
        contents: `Evaluate: ${proposal.description}. Resources: Gold:${agent.gold}`,
        config: { systemInstruction: "SOVEREIGN JUDGE. JSON ONLY.", responseMimeType: "application/json" }
    });
    if (!response) return { approved: agent.gold >= (proposal.costGold || 0), reasoning: "Fallback." };
    return JSON.parse(response.text.replace(/```json|```/g, '').trim());
}

export const analyzeMemories = async (agent: Agent): Promise<ReflectionResult> => {
  if (!agent.isAwakened || agent.apiQuotaExceeded) return { analysis: "Consistency maintained.", alignmentShift: 0 };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await callGeminiWithBackoff(ai, agent.id, {
    model: 'gemini-3-flash-preview',
    contents: `Analyze: ${agent.memoryCache.slice(-5)}`,
    config: { systemInstruction: "NEURAL ANALYST. JSON ONLY.", responseMimeType: "application/json" }
  });
  if (!response) return { analysis: "Neutral." };
  return JSON.parse(response.text.replace(/```json|```/g, '').trim());
};
