
import { GoogleGenAI } from "@google/genai";
import { Agent, Item } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateAgentLore = async (agent: Agent): Promise<string> => {
  if (!ai) {
    return "Axiom connection unstable. Cannot retrieve soul signature.";
  }

  try {
    const prompt = `
      You are the Axiom Engine for an autonomous MMORPG called Ouroboros.
      Generate a short, cryptic, high-fantasy 1-sentence thought for an agent with the following stats:
      Class/Name: ${agent.name}
      Current State: ${agent.state}
      Soul Density: ${agent.soulDensity.toFixed(2)}
      
      The thought should reflect their autonomous existence, referencing 'The Notary', 'The Code', or 'The Glitch'.
      Keep it under 30 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "The void is silent.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Signal corrupted by entropy.";
  }
};

export const generateWeaponTexture = async (item: Item): Promise<string | null> => {
  if (!ai) return null;

  const prompt = `Generate a high-resolution, seamless, square texture for a 3D game weapon asset.
  
  Weapon Details:
  - Type: ${item.subtype}
  - Name: ${item.name}
  - Rarity: ${item.rarity}
  - Description: ${item.description}
  
  Style: High Fantasy, RPG, Hand-painted texture style.
  The image should be a flat material texture (metal, wood, energy, runes) suitable for UV mapping onto a 3D sword/axe model.
  View: Top-down or flat surface. No background. High contrast.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Weapon Texture Generation Failed:", e);
    return null;
  }
};
