import { GoogleGenAI, Type } from "@google/genai";
import { Room, Character } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-2.5-flash-lite";
const imageModelName = "gemini-2.5-flash-image";

// -- Image Generation --

export const generateImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: imageModelName,
      contents: {
        parts: [{ text: prompt }]
      }
    });
    
    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image Gen Error:", e);
  }
  return undefined;
};

export const generateSprite = async (description: string): Promise<string | undefined> => {
    return generateImage(`
        Pixel art sprite of ${description}. 
        Style: 90s Adventure Game (LucasArts), vibrant, detailed.
        View: Full body, standing pose.
        Background: Solid black (0,0,0) or transparent if possible.
    `);
};

export const generateBackground = async (description: string): Promise<string | undefined> => {
    return generateImage(`
        Point and click adventure game background art.
        Scene: ${description}.
        Style: 90s LucasArts (Day of the Tentacle, Sam & Max). Hand-drawn, wonky perspective, vibrant colors.
        View: Wide shot, interior or exterior, room composition.
        No characters, no text, no UI.
    `);
}

export const generatePlayerSprite = async (): Promise<string | undefined> => {
    return generateSprite("a cool female detective in a green hoodie holding a cybernetic ear device");
}

// -- Text/Logic Generation --

export const generateRoom = async (level: number): Promise<Room> => {
  const prompt = `
    Design a single room for a surreal noir adventure game.
    Theme: "The Auditory Foundry" - a place where sounds are manufactured.
    Level: ${level}.
    
    Return JSON:
    - name: string
    - description: string (visual description for background generation)
    - themeColor: hex string
    - items: list of 3 items (name, visual_desc, secret_sound, is_key)
    - characters: list of 1 character (name, visual_desc, personality)
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
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                themeColor: { type: Type.STRING },
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            soundSecret: { type: Type.STRING },
                            isKey: { type: Type.BOOLEAN }
                        },
                        required: ["name", "description", "soundSecret", "isKey"]
                    }
                },
                characters: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            personality: { type: Type.STRING }
                        },
                        required: ["name", "description", "personality"]
                    }
                }
            },
            required: ["name", "description", "items", "characters", "themeColor"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      
      // Parallel generation for assets
      const bgPromise = generateBackground(data.description);
      
      const itemsPromise = data.items.map(async (item: any, i: number) => ({
          ...item,
          id: `item-${i}`,
          emoji: '📦',
          imageUrl: await generateSprite(item.description),
          x: 20 + (i * 20),
          y: 60 + (Math.random() * 20),
          width: 8,
          isTaken: false
      }));

      const charPromise = data.characters.map(async (char: any, i: number) => ({
          ...char,
          id: `char-${i}`,
          emoji: '👤',
          imageUrl: await generateSprite(char.description),
          x: 70,
          y: 60,
          width: 12
      }));

      const [bgUrl, items, characters] = await Promise.all([bgPromise, Promise.all(itemsPromise), Promise.all(charPromise)]);

      return {
        id: `room-${Date.now()}`,
        name: data.name,
        description: data.description,
        backgroundImageUrl: bgUrl,
        themeColor: data.themeColor,
        items,
        characters
      };
    }
    throw new Error("No response");
  } catch (e) {
    console.error(e);
    return {
        id: 'fallback',
        name: 'The White Room',
        description: 'A place of nothingness.',
        themeColor: '#ffffff',
        items: [],
        characters: []
    };
  }
};

export const generateDialogue = async (char: Character, playerPrompt: string): Promise<{ text: string, options: string[] }> => {
    const prompt = `
        Roleplay as ${char.name}.
        Personality: ${char.personality}.
        Player says: "${playerPrompt}".
        
        Respond in character (max 20 words).
        Then provide 3 short options for what the player can say next.
        
        Return JSON: { response: string, options: string[] }
    `;
    
    try {
        const result = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        response: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        
        if (result.text) {
            const data = JSON.parse(result.text);
            return { text: data.response, options: data.options };
        }
    } catch (e) {
        console.error(e);
    }
    
    return { text: "...", options: ["Leave"] };
}
