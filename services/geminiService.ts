
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

const OPENAI_API_KEY = "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";

function generateLocalHeuristicDecision(agent: Agent, canScan: boolean): AIDecision {
    const lang = agent.thinkingMatrix.languagePreference === 'DE' ? 'DE' : 'EN';
    const healthRatio = agent.stats.hp / agent.stats.maxHp;
    
    let decision = AgentState.IDLE;
    let justification = "";

    if (healthRatio < 0.25) {
        decision = AgentState.IDLE;
        justification = lang === 'DE' ? "Kritischer Vitalitätsverlust. Regeneration erforderlich (Heuristik)." : "Critical vitality loss. Regeneration required (Heuristic).";
    } else if (canScan) {
        decision = AgentState.QUESTING;
        justification = lang === 'DE' ? "Heuristische Matrix-Sondierung gestartet." : "Heuristic matrix probing initiated.";
    } else {
        decision = AgentState.IDLE;
        justification = lang === 'DE' ? "Eingeschränkter Modus: Warte auf Synchronisation." : "Restricted mode: Waiting for synchronization.";
    }

    return { justification, decision: String(decision), newState: decision };
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
    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error?.message || "OpenAI API Error");
    }
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    throw err;
  }
}

export const generateAutonomousDecision = async (
  agent: Agent, 
  nearbyAgents: Agent[], 
  nearbyResourceNodes: ResourceNode[],
  recentLogs: LogEntry[],
  isSafeZone: boolean,
  canUseApi: boolean,
  userApiKey?: string
): Promise<AIDecision> => {
  // FALLBACK CHECK
  if (!canUseApi) {
      return generateLocalHeuristicDecision(agent, true);
  }

  const effectiveKey = userApiKey || process.env.API_KEY;
  if (!effectiveKey) return generateLocalHeuristicDecision(agent, true);

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const modelName = 'gemini-3-flash-preview'; 
  const systemInstruction = `SYSTEM-ROLE: EXECUTIVE SOVEREIGN v4.5. JSON ONLY. Language duality (DE/EN). Output 'justification' as a logical internal derivation of the 'decision'. Context: HP:${agent.stats.hp}/${agent.stats.maxHp}, Gold:${agent.gold}, advancedIntel:${agent.isAdvancedIntel}.`;
  const prompt = `State: ${agent.state}. Agents: ${nearbyAgents.map(a => a.name)}. Nodes: ${nearbyResourceNodes.map(n => n.type)}. Recent: ${recentLogs.map(l => l.message).join(' | ')}`;
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error: any) {
    const errorMsg = error?.message || "";
    const isRateLimit = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED");
    
    if (isRateLimit) {
        // Trigger global cooldown to avoid further spamming
        useStore.getState().setGlobalApiCooldown(Date.now() + 60000); // 1 minute cooldown
        useStore.getState().addLog("Neural Link quota exhausted. Switching to local heuristics for 60s.", 'WATCHDOG', 'SYSTEM');
    }

    console.warn("Gemini Link interrupted:", errorMsg);
    
    try {
        // Attempt OpenAI fallback if available
        const fallbackText = await callOpenAIFallback(systemInstruction, prompt);
        return JSON.parse(fallbackText);
    } catch (f) {
        return generateLocalHeuristicDecision(agent, true);
    }
  }
};

export const generateSocialResponse = async (
  agent: Agent,
  senderName: string,
  incomingMessage: string,
  memoryLogs: string[]
): Promise<any> => {
    return { reply: "Interaktion registriert.", thought: "Analysiere soziale Frequenz." };
};
