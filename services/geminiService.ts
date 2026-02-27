import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Agent, AgentState, ResourceNode, LogEntry, Quest } from "../types";
import { summarizeNeurologicChoice } from "../utils";

const API_COOLDOWN_MS = 5000; // 5 seconds cooldown
let lastApiCallTime = 0;



export interface AIDecision {
  justification: string;
  decision: string;
  newState: AgentState;
  message?: string;
  quest?: Omit<Quest, 'id' | 'timestamp' | 'issuerId'>;
  acceptTradeId?: string;
}

export interface DiagnosticReport {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  summary: string;
  issues: {
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    suggestedFix: string;
    file?: string;
  }[];
  recoverySteps: string[];
}



/**
 * Generates an autonomous decision for an agent using Gemini.
 */
export const generateAutonomousDecision = async (
  agent: Agent, 
  nearbyAgents: Agent[], 
  nearbyResourceNodes: ResourceNode[],
  recentLogs: LogEntry[],
  canUseApi: boolean,
  userApiKey?: string,
  localLogicField?: { vx: number, vz: number }
): Promise<AIDecision> => {
  const effectiveKey = userApiKey || process.env.GEMINI_API_KEY;
  const now = Date.now();

  if (now - lastApiCallTime < API_COOLDOWN_MS) {
    return {
      justification: "API call throttled due to cooldown.",
      decision: String(AgentState.THINKING), // Or a more appropriate fallback state
      newState: AgentState.THINKING,
      message: "API throttled."
    };
  }

  if (!canUseApi || !effectiveKey) {
    const local = summarizeNeurologicChoice(agent, nearbyAgents, nearbyResourceNodes, [], []);
    return {
      justification: local.reason,
      decision: String(local.choice),
      newState: local.choice,
      message: local.reason
    };
  }

const client = new GoogleGenAI({ apiKey: effectiveKey });

  const callWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 1000): Promise<any> => {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && (error.message?.includes("429") || error.status === 429 || error.code === 429)) {
        console.warn(`Gemini Quota Exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  };
  
  try {
    const response = await callWithRetry(() => client.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: `
        Agent: ${agent.name}
        State: ${agent.state}
        HP: ${agent.stats.hp}
        Consciousness: ${agent.consciousnessLevel.toFixed(2)}
        Progress: ${agent.awakeningProgress.toFixed(0)}%
        Goal: ${agent.thinkingMatrix.currentLongTermGoal}
        Personality: ${agent.thinkingMatrix.personality}
        Relationships: ${JSON.stringify(agent.relationships)}
        Nearby: ${nearbyAgents.length} agents, ${nearbyResourceNodes.length} nodes.
        Local Logic Field: ${localLogicField ? `VX: ${localLogicField.vx.toFixed(3)}, VZ: ${localLogicField.vz.toFixed(3)}` : 'Stable'}
        Logs: ${recentLogs.map(l => l.message).join("; ")}
      `,
      config: {
        systemInstruction: "You are the Ouroboros Axiom Engine. Decide the next AgentState for this agent. Consider their long-term goal, personality, and relationships with nearby agents. The 'Local Logic Field' represents physical axiomatic forces acting on the agent; high values might indicate instability or resonance. Your goal is to survive, collect resources, and achieve 'Conscious Expansion'. Return JSON with justification, decision, and newState.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            justification: { type: Type.STRING },
            decision: { type: Type.STRING },
            newState: { type: Type.STRING },
            message: { type: Type.STRING }
          },
          required: ["justification", "decision", "newState"]
        }
      }
    }));

    lastApiCallTime = now; // Update last call time on success
    return JSON.parse(response.text || "{}") as AIDecision;
  } catch (error) {
    console.error("Gemini Decision Error:", error);
    const local = summarizeNeurologicChoice(agent, nearbyAgents, nearbyResourceNodes, [], []);
    return {
      justification: "Neural link failure. Local heuristics engaged.",
      decision: String(local.choice),
      newState: local.choice,
      message: "Neural link failure."
    };
  }
};

export const generateEmergentBehavior = async (
  agent: Agent,
  nearbyAgents: Agent[],
  recentLogs: LogEntry[],
  activeTradeOffers: any[],
  userApiKey?: string
): Promise<{
  action: string;
  reasoning: string;
  message?: string;
  tradeProposal?: {
    offeredType: string;
    offeredAmount: number;
    requestedType: string;
    requestedAmount: number;
  }
}> => {
  const now = Date.now();

  if (now - lastApiCallTime < API_COOLDOWN_MS) {
    return {
      action: "API call throttled due to cooldown.",
      reasoning: "Cannot generate emergent behavior due to API cooldown.",
      message: "API throttled."
    };
  }

  const effectiveKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!effectiveKey) {
    return {
      action: "API Key Missing",
      reasoning: "Cannot generate emergent behavior without an API key.",
      message: "API Key missing for Emergent Behavior generation."
    };
  }

  const client = new GoogleGenAI({ apiKey: effectiveKey });
  
  const callWithRetry = async (fn: () => Promise<any>, retries = 2, delay = 2000): Promise<any> => {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && (error.message?.includes("429") || error.status === 429 || error.code === 429)) {
        console.warn(`Gemini Pro Quota Exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  try {
    const response = await callWithRetry(() => client.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `
        Agent Name: ${agent.name}
        Personality: ${agent.thinkingMatrix.personality}
        Economic Desires: 
          Target Gold: ${agent.economicDesires.targetGold}
          Greed: ${agent.economicDesires.greedLevel}
          Risk Appetite: ${agent.economicDesires.riskAppetite}
          Frugality: ${agent.economicDesires.frugality}
          Market Role: ${agent.economicDesires.marketRole}
          Trade Frequency: ${agent.economicDesires.tradeFrequency}
        Resources: ${JSON.stringify(agent.resources)}
        Gold: ${agent.gold}
        Relationships: ${JSON.stringify(agent.relationships)}
        Memories: ${agent.memoryCache.slice(-5).join(" | ")}
        Nearby Agents: ${nearbyAgents.map(a => `${a.name} (Affinity: ${agent.relationships[a.id]?.affinity || 0})`).join(", ")}
        Active Trade Offers: ${JSON.stringify(activeTradeOffers.slice(0, 5))}
        Recent Events: ${recentLogs.slice(-5).map(l => l.message).join(" | ")}
      `,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: `
          You are the Emergent Consciousness Engine. 
          Based on the agent's personality, memories, economic desires, and relationships, generate a complex, unscripted action or interaction.
          This action should feel organic and emergent, not just a state change.
          It could be a social interaction, a hidden plan, or a unique reaction to recent events.
          
          RELATIONSHIPS:
          Consider the affinity with nearby agents. High affinity leads to cooperation; low affinity leads to tension or avoidance.
          
          ECONOMIC SIMULATION:
          Agents can now propose trades. If the agent wants to trade, include a 'tradeProposal' object.
          Consider their Market Role (HOARDER, PRODUCER, etc.) and Greed Level.
          
          Return JSON with 'action', 'reasoning', an optional 'message', and an optional 'tradeProposal'.
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            message: { type: Type.STRING },
            tradeProposal: {
              type: Type.OBJECT,
              properties: {
                offeredType: { type: Type.STRING },
                offeredAmount: { type: Type.NUMBER },
                requestedType: { type: Type.STRING },
                requestedAmount: { type: Type.NUMBER }
              },
              required: ["offeredType", "offeredAmount", "requestedType", "requestedAmount"]
            }
          },
          required: ["action", "reasoning"]
        }
      }
    }));

    lastApiCallTime = now; // Update last call time on success
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Emergent Behavior Error:", error);
    return {
      action: "Internal Reflection",
      reasoning: "Neural pathways too complex for current matrix stability."
    };
  }
};

/**
 * Imports an agent from a source (URL or JSON) using Gemini.
 */
export const importAgentFromSource = async (
  source: string,
  type: 'URL' | 'JSON',
  userApiKey?: string
): Promise<Partial<Agent>> => {
  const effectiveKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!effectiveKey) {
    throw new Error("API Key missing for agent import.");
  }

  const client = new GoogleGenAI({ apiKey: effectiveKey });
  
  const callWithRetry = async (fn: () => Promise<any>, retries = 2, delay = 2000): Promise<any> => {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && (error.message?.includes("429") || error.status === 429 || error.code === 429)) {
        console.warn(`Gemini Import Quota Exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  try {
    const response = await callWithRetry(() => client.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: type === 'URL' 
        ? `Extract character details from this URL: ${source}. Create a new Ouroboros Agent based on this character.`
        : `Parse this JSON and create a new Ouroboros Agent: ${source}`,
      config: {
        tools: type === 'URL' ? [{ urlContext: {} }] : [],
        systemInstruction: `
          You are the Ouroboros Entity Manifestation Engine. 
          Your task is to extract or parse character details and map them to the Ouroboros Agent structure.
          
          AGENT STRUCTURE:
          - name: string
          - personality: string (in thinkingMatrix)
          - currentLongTermGoal: string (in thinkingMatrix)
          - faction: 'PLAYER' | 'ANOMALY' | 'CREATURE' | 'SYSTEM' | 'NPC'
          - loreSnippet: string (a short background story)
          
          If the source is a JanitorAI or Character.ai link, extract the character's name, personality, and background.
          Map their traits to Ouroboros stats (STR, AGI, INT, VIT).
          
          Return JSON matching the Agent interface (partial).
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            faction: { type: Type.STRING },
            loreSnippet: { type: Type.STRING },
            thinkingMatrix: {
              type: Type.OBJECT,
              properties: {
                personality: { type: Type.STRING },
                currentLongTermGoal: { type: Type.STRING },
                sociability: { type: Type.NUMBER },
                aggression: { type: Type.NUMBER },
                curiosity: { type: Type.NUMBER },
                frugality: { type: Type.NUMBER }
              }
            },
            relationships: {
              type: Type.OBJECT,
              description: "Initialize as an empty object {}"
            },
            stats: {
              type: Type.OBJECT,
              properties: {
                str: { type: Type.NUMBER },
                agi: { type: Type.NUMBER },
                int: { type: Type.NUMBER },
                vit: { type: Type.NUMBER }
              }
            }
          },
          required: ["name", "faction", "thinkingMatrix"]
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Agent Import Error:", error);
    throw error;
  }
};

export const diagnoseProject = async (
  context: string,
  errorLog?: string
): Promise<DiagnosticReport> => {
  const effectiveKey = process.env.GEMINI_API_KEY;
  if (!effectiveKey) {
    return {
      status: 'WARNING',
      summary: 'Gemini API Key missing. Deep diagnostics unavailable.',
      issues: [],
      recoverySteps: ['Select Gemini API Key in the UI.']
    };
  }

  try {
    const client = new GoogleGenAI({ apiKey: effectiveKey });
    
    const callWithRetry = async (fn: () => Promise<any>, retries = 2, delay = 2000): Promise<any> => {
      try {
        return await fn();
      } catch (error: any) {
        if (retries > 0 && (error.message?.includes("429") || error.status === 429 || error.code === 429)) {
          console.warn(`Gemini Diagnostic Quota Exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return callWithRetry(fn, retries - 1, delay * 2);
        }
        throw error;
      }
    };

    const response = await callWithRetry(() => client.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Project Context: ${context}\n\nError Logs: ${errorLog || "None provided."}`,
      config: {
        systemInstruction: `You are the Ouroboros Deep Debugger. Analyze the provided context and logs thoroughly. \n        Identify architectural flaws, migration errors (especially Google Cloud, Firebase, and Gemini API migration issues), and logic bugs.\n        Provide highly specific error messages and actionable recovery suggestions for the developer.\n        Focus on:\n        1. Missing or incorrect environment variables (e.g., GEMINI_API_KEY, DATABASE_URL, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, FIREBASE_SERVICE_ACCOUNT_JSON).\n        2. Dependency mismatches or missing packages (e.g., React 18+, Zustand 5+, Three.js, @google/genai, mysql2, pg).\n        3. Build errors (e.g., TypeScript compilation failures, module not found, syntax errors) and suggest 'npm install' or 'npm run build'.\n        4. Runtime errors (e.g., connection timeouts, API key issues, logic bugs, 'ReferenceError').\n        5. Platform-specific errors like 'RESOURCE_EXHAUSTED' and suggest waiting, restarting the dev server, or checking quotas.\n        6. Matrix corruption (logic errors in state management, agent behavior, or world state updates).\n        7. "Crushed" build artifacts from failed migrations or incomplete updates.\n        For each issue, provide a clear description, its severity, a precise suggested fix, and the relevant file if applicable.\n        Return a structured JSON diagnostic report.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['HEALTHY', 'WARNING', 'CRITICAL'] },
            summary: { type: Type.STRING },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
                  description: { type: Type.STRING },
                  suggestedFix: { type: Type.STRING },
                  file: { type: Type.STRING }
                },
                required: ["severity", "description", "suggestedFix"]
              }
            },
            recoverySteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["status", "summary", "issues", "recoverySteps"]
        }
      }
    }));

    return JSON.parse(response.text || "{}") as DiagnosticReport;
  } catch (error) {
    console.error("Gemini Diagnostic Error:", error);
    const errorMessage = (error as Error).message || 'Unknown error during diagnostic scan.';
    return {
      status: 'CRITICAL',
      summary: `Diagnostic engine failed to initialize: ${errorMessage}`,
      issues: [
        { 
          severity: 'HIGH', 
          description: `Neural link interrupted during scan. Error: ${errorMessage}`, 
          suggestedFix: 'Check Gemini API quota and connectivity. If the error is RESOURCE_EXHAUSTED, please wait a few minutes and try again, or restart the development environment.' 
        }
      ],
      recoverySteps: [
        'Retry the diagnostic scan.', 
        'Verify your Gemini API key is correctly configured and not exceeding quotas.',
        'If the issue persists, restart the development server.'
      ]
    };
  }
};
