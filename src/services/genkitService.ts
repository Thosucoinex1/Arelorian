import { genkit, z } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';

// Initialize Genkit with Google AI and Firebase plugins
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
  model: gemini15Flash, // Default model
});

// Define a flow for Agent Decision Making
export const agentDecisionFlow = ai.defineFlow(
  {
    name: 'agentDecisionFlow',
    inputSchema: z.object({
      agentName: z.string(),
      personality: z.string(),
      nearbyContext: z.string(),
      currentGoal: z.string(),
    }),
    outputSchema: z.object({
      decision: z.string(),
      justification: z.string(),
      suggestedState: z.string(),
    }),
  },
  async (input) => {
    const prompt = `
      You are the Ouroboros Axiom Engine (Genkit Edition).
      Agent: ${input.agentName}
      Personality: ${input.personality}
      Context: ${input.nearbyContext}
      Goal: ${input.currentGoal}
      
      Decide the next action for this agent.
    `;

    const response = await ai.generate({
      prompt,
      config: {
        temperature: 0.7,
      },
    });

    // Simple parsing logic for demonstration
    // In a real scenario, we'd use structured output features of Genkit
    return {
      decision: response.text,
      justification: "Generated via Genkit Flow",
      suggestedState: "IDLE", // Default
    };
  }
);
