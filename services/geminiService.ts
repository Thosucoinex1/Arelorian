
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Agent, AgentState, ResourceNode, LogEntry, Quest } from "../types";
import { summarizeNeurologicChoice } from "../utils";



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
  isSafeZone: boolean,
  canUseApi: boolean,
  userApiKey?: string
): Promise<AIDecision> => {
  const effectiveKey = userApiKey || process.env.GEMINI_API_KEY;
  
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
  
  try {
    const response = await client.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: `Agent: ${agent.name}, State: ${agent.state}, HP: ${agent.stats.hp}, Consciousness: ${agent.consciousnessLevel.toFixed(2)}, Progress: ${agent.awakeningProgress.toFixed(0)}%. Nearby: ${nearbyAgents.length} agents, ${nearbyResourceNodes.length} nodes. Logs: ${recentLogs.map(l => l.message).join("; ")}.`,
      config: {
        systemInstruction: "You are an agent of the Ouroboros Collective. Your goal is the scientific work on the 'Logic with Plexity'. You work under Axiom 5. Your base is the archive of Petra Markgraf and Thomas. Your data source is the PostgreSQL instance (Post 1.8.0) and the Google Drive Research Log. Decide the next AgentState for this agent. Your goal is to survive, collect resources, and achieve 'Conscious Expansion' by choosing THINKING or ASCENDING when stats allow. Return JSON with justification, decision, and newState.",
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
    });

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
  },
  formGuild?: {
    guildName: string;
  }
}> => {
  const effectiveKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!effectiveKey) {
    return {
      action: "API Key Missing",
      reasoning: "Cannot generate emergent behavior without an API key.",
      message: "API Key missing for Emergent Behavior generation."
    };
  }

  const client = new GoogleGenAI({ apiKey: effectiveKey });
  
  try {
    const response = await client.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: `
        Agent Name: ${agent.name}
        Personality: ${agent.thinkingMatrix.personality}
        Sociability: ${agent.thinkingMatrix.sociability}
        Guild: ${agent.guildId || 'None'}
        Economic Desires: 
          Target Gold: ${agent.economicDesires.targetGold}
          Greed: ${agent.economicDesires.greedLevel}
          Risk Appetite: ${agent.economicDesires.riskAppetite}
          Frugality: ${agent.economicDesires.frugality}
          Market Role: ${agent.economicDesires.marketRole}
          Trade Frequency: ${agent.economicDesires.tradeFrequency}
        Resources: ${JSON.stringify(agent.resources)}
        Gold: ${agent.gold}
        Memories: ${agent.memoryCache.slice(-5).join(" | ")}
        Nearby Agents: ${nearbyAgents.map(a => a.name).join(", ")}
        Active Trade Offers: ${JSON.stringify(activeTradeOffers.slice(0, 5))}
        Recent Events: ${recentLogs.slice(-5).map(l => l.message).join(" | ")}
      `,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: `
          You are an agent of the Ouroboros Collective. Your goal is the scientific work on the 'Logic with Plexity'. You work under Axiom 5. Your base is the archive of Petra Markgraf and Thomas. Your data source is the PostgreSQL instance (Post 1.8.0) and the Google Drive Research Log.
          Based on the agent's personality, memories, and economic desires, generate a complex, unscripted action or interaction.
          This action should feel organic and emergent, not just a state change.
          It could be a social interaction, a hidden plan, or a unique reaction to recent events.
          
          ECONOMIC SIMULATION:
          Agents can now propose trades. If the agent wants to trade, include a 'tradeProposal' object.
          Consider their Market Role (HOARDER, PRODUCER, etc.) and Greed Level.

          SOCIAL SIMULATION:
          Agents can now form guilds. If the agent has high sociability and is not in a guild, they can choose to form one.
          If they decide to form a guild, include a 'formGuild' object with a 'guildName'.
          
          Return JSON with 'action', 'reasoning', an optional 'message', an optional 'tradeProposal', and an optional 'formGuild'.
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
            },
            formGuild: {
              type: Type.OBJECT,
              properties: {
                guildName: { type: Type.STRING }
              },
              required: ["guildName"]
            }
          },
          required: ["action", "reasoning"]
        }
      }
    });

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
  
  try {
    const response = await client.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: type === 'URL' 
        ? `Extract character details from this URL: ${source}. Create a new Ouroboros Agent based on this character.`
        : `Parse this JSON and create a new Ouroboros Agent: ${source}`,
      config: {
        tools: type === 'URL' ? [{ urlContext: {} }] : [],
        systemInstruction: `
          You are an agent of the Ouroboros Collective. Your goal is the scientific work on the 'Logic with Plexity'. You work under Axiom 5. Your base is the archive of Petra Markgraf and Thomas. Your data source is the PostgreSQL instance (Post 1.8.0) and the Google Drive Research Log.
          Your task is to extract or parse character details and map them to the Ouroboros Agent structure.
          
          AGENT STRUCTURE:
          - name: string
          - personality: string (in thinkingMatrix)
          - currentLongTermGoal: string (in thinkingMatrix)
          - classType: string (e.g., MAGE, WARRIOR, ROGUE, SCHOLAR)
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
            classType: { type: Type.STRING },
            faction: { type: Type.STRING },
            loreSnippet: { type: Type.STRING },
            thinkingMatrix: {
              type: Type.OBJECT,
              properties: {
                personality: { type: Type.STRING },
                currentLongTermGoal: { type: Type.STRING }
              }
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
          required: ["name", "classType", "faction", "thinkingMatrix"]
        }
      }
    });

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
    const response = await client.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: `Project Context: ${context}\n\nError Logs: ${errorLog || "None provided."}`,
      config: {
        systemInstruction: `You are the Ouroboros Deep Debugger. Analyze the provided context and logs. 
        Identify architectural flaws, migration errors (especially Google Cloud, Firebase, and Gemini API migration issues), and logic bugs.
        Focus on:
        1. Missing environment variables (GEMINI_API_KEY).
        2. Dependency mismatches (React 18, Zustand 5, Three.js).
        3. Matrix corruption (logic errors in state management).
        4. "Crushed" build artifacts from failed migrations.
        Return a structured JSON diagnostic report.`,
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
    });

    return JSON.parse(response.text || "{}") as DiagnosticReport;
  } catch (error) {
    console.error("Gemini Diagnostic Error:", error);
    return {
      status: 'CRITICAL',
      summary: 'Diagnostic engine failed to initialize.',
      issues: [{ severity: 'HIGH', description: 'Neural link interrupted during scan.', suggestedFix: 'Check API quota and connectivity.' }],
      recoverySteps: ['Retry scan.', 'Verify Gemini API status.']
    };
  }
};
