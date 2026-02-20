import { GoogleGenAI, Type } from "@google/genai";
import { Agent, AgentState, ResourceNode, LogEntry, Quest } from "../types";
import { summarizeNeurologicChoice } from "../utils";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface AIDecision {
  justification: string;
  decision: string;
  newState: AgentState;
  message?: string;
  quest?: Omit<Quest, 'id' | 'timestamp' | 'issuerId'>;
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

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || "" });

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
  const effectiveKey = userApiKey || GEMINI_API_KEY;
  
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
      model: "gemini-3-flash-preview",
      contents: `Agent: ${agent.name}, State: ${agent.state}, HP: ${agent.stats.hp}, Consciousness: ${agent.consciousnessLevel.toFixed(2)}, Progress: ${agent.awakeningProgress.toFixed(0)}%. Nearby: ${nearbyAgents.length} agents, ${nearbyResourceNodes.length} nodes. Logs: ${recentLogs.map(l => l.message).join("; ")}.`,
      config: {
        systemInstruction: "You are the Ouroboros Axiom Engine. Decide the next AgentState for this agent. Your goal is to survive, collect resources, and achieve 'Conscious Expansion' by choosing THINKING or ASCENDING when stats allow. Return JSON with justification, decision, and newState.",
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
  userApiKey?: string
): Promise<{ action: string; reasoning: string; message?: string }> => {
  const effectiveKey = userApiKey || GEMINI_API_KEY;
  if (!effectiveKey) throw new Error("API Key missing for Emergent Behavior generation.");

  const client = new GoogleGenAI({ apiKey: effectiveKey });
  
  try {
    const response = await client.models.generateContent({
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
        Memories: ${agent.memoryCache.slice(-5).join(" | ")}
        Nearby Agents: ${nearbyAgents.map(a => a.name).join(", ")}
        Recent Events: ${recentLogs.slice(-5).map(l => l.message).join(" | ")}
      `,
      config: {
        thinkingConfig: { thinkingLevel: "HIGH" as any },
        systemInstruction: `
          You are the Emergent Consciousness Engine. 
          Based on the agent's personality, memories, and economic desires, generate a complex, unscripted action or interaction.
          This action should feel organic and emergent, not just a state change.
          It could be a social interaction, a hidden plan, or a unique reaction to recent events.
          Return JSON with 'action', 'reasoning', and an optional 'message' to be broadcasted.
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            message: { type: Type.STRING }
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
export const diagnoseProject = async (
  context: string,
  errorLog?: string
): Promise<DiagnosticReport> => {
  if (!GEMINI_API_KEY) {
    return {
      status: 'WARNING',
      summary: 'Gemini API Key missing. Deep diagnostics unavailable.',
      issues: [],
      recoverySteps: ['Set GEMINI_API_KEY in environment.']
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
