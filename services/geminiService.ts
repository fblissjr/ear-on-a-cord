import { GoogleGenAI, Type } from "@google/genai";
import { SoundMystery, ValidationResult } from "../types";

// Initialize Gemini
// NOTE: API Key is handled via process.env.API_KEY as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = "gemini-3-flash-preview";

export const generateMystery = async (): Promise<SoundMystery> => {
  const prompt = `
    Generate a "Sound Mystery" for a game called "Ear on a Cord".
    The player has to guess an object or event based on a description of the sound it makes.
    
    Return a JSON object with:
    - 'category': A broad category (e.g., Nature, Industrial, Kitchen, Office).
    - 'clue': A vivid, sensory description of the sound WITHOUT naming the object. Focus on texture, rhythm, and pitch.
    - 'hiddenObject': The specific object or action producing the sound.
    - 'difficulty': One of 'easy', 'medium', 'hard'.
    
    Make the 'clue' poetic and slightly surreal, fitting an art-house aesthetic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            clue: { type: Type.STRING },
            hiddenObject: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
          },
          required: ["category", "clue", "hiddenObject", "difficulty"],
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        ...data,
        id: Math.random().toString(36).substring(7),
      };
    }
    throw new Error("No response text from Gemini");
  } catch (error) {
    console.error("Gemini generation error:", error);
    // Fallback for demo stability if API fails
    return {
      id: "fallback",
      category: "Nature",
      clue: "A rhythmic, hollow tapping that echoes through a wooden chamber, accelerating into a rapid drumroll.",
      hiddenObject: "Woodpecker",
      difficulty: "medium",
    };
  }
};

export const validateGuess = async (mystery: SoundMystery, userGuess: string): Promise<ValidationResult> => {
  const prompt = `
    The hidden object is: "${mystery.hiddenObject}".
    The user guessed: "${userGuess}".
    
    Determine if the user's guess is correct or very close (synonyms are okay).
    
    Return JSON:
    - isCorrect: boolean
    - feedback: A short, slightly cryptic sentence explaining why it is right or wrong.
    - similarityScore: A number 0-100 indicating how close they were.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
            similarityScore: { type: Type.INTEGER },
          },
          required: ["isCorrect", "feedback", "similarityScore"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as ValidationResult;
    }
    throw new Error("No validation response");
  } catch (error) {
    console.error("Gemini validation error:", error);
    return {
      isCorrect: false,
      feedback: "The connection to the ether was lost. Try again.",
      similarityScore: 0,
    };
  }
};
