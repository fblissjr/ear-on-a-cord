import { GoogleGenAI, Type } from "@google/genai";
import { Room } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-2.5-flash-lite";
const imageModelName = "gemini-2.5-flash-image";

// Helper to get random positions that don't overlap too much
const getRandomPosition = (idx: number, total: number) => {
  // Distribute items/chars across the screen width (10% to 90%)
  const step = 80 / (total || 1);
  const baseX = 10 + (idx * step);
  
  return {
    x: baseX + (Math.random() * 10 - 5),
    y: 40 + (Math.random() * 30) // Keep them in the "floor" area (40-70%)
  };
};

// Generate a sprite image
export const generateSprite = async (description: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: imageModelName,
      contents: {
        parts: [
          {
            text: `Generate a pixel art sprite of ${description}. 
                   Style: Retro comic book, paper cutout. 
                   View: Full body, front facing game asset.
                   Background: Solid black background (important for game transparency).
                   Colors: Vibrant, noir.`
          }
        ]
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Failed to generate sprite for", description, e);
  }
  return undefined;
};

export const generatePlayerSprite = async (): Promise<string | undefined> => {
    return generateSprite("a young woman in a green zip-up hoodie holding a plastic ear, cyber-noir style");
}

export const generateRoom = async (level: number): Promise<Room> => {
  const prompt = `
    Generate a level for a "Point and Click" adventure game called "Ear on a Cord".
    Theme: Surreal Industrial, Body Horror, Lo-fi Sci-Fi (Video style).
    Level Depth: ${level}.
    
    Return a JSON object with:
    - 'name': Room name (e.g., "The Flesh Hallway", "Cable Nest").
    - 'description': Atmospheric description (max 2 sentences).
    - 'themeColor': A hex color code matching the mood.
    - 'items': An array of 2-4 interactive objects.
      - 'name': Object name.
      - 'emoji': A single emoji representing the object.
      - 'description': Visual description.
      - 'soundSecret': Hidden audio clue. 
      - 'isKey': One object must be the key (boolean).
    - 'characters': An array of 1-2 strange inhabitants.
      - 'name': Character name (e.g., "The Observer", "Cable Man").
      - 'emoji': A single emoji.
      - 'description': Visual description (used for image generation).
      - 'dialogue': Cryptic message they say.
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
                  emoji: { type: Type.STRING },
                  description: { type: Type.STRING },
                  soundSecret: { type: Type.STRING },
                  isKey: { type: Type.BOOLEAN },
                },
                required: ["name", "emoji", "description", "soundSecret", "isKey"]
              }
            },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                  description: { type: Type.STRING },
                  dialogue: { type: Type.STRING },
                },
                required: ["name", "emoji", "description", "dialogue"]
              }
            }
          },
          required: ["name", "description", "items", "characters", "themeColor"],
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      
      const totalEntities = (data.items?.length || 0) + (data.characters?.length || 0);

      // Post-process items
      const itemsPromise = (data.items || []).map(async (item: any, idx: number) => {
        const imageUrl = await generateSprite(item.description);
        return {
          ...item,
          id: `item-${idx}-${Date.now()}`,
          imageUrl,
          isTaken: false,
          ...getRandomPosition(idx, totalEntities)
        };
      });

      // Post-process characters
      const charactersPromise = (data.characters || []).map(async (char: any, idx: number) => {
        const imageUrl = await generateSprite(char.description);
        return {
            ...char,
            id: `char-${idx}-${Date.now()}`,
            imageUrl,
            ...getRandomPosition((data.items?.length || 0) + idx, totalEntities)
        };
      });

      const items = await Promise.all(itemsPromise);
      const characters = await Promise.all(charactersPromise);

      return {
        id: `room-${Date.now()}`,
        name: data.name,
        description: data.description,
        themeColor: data.themeColor || '#00ff00',
        items,
        characters
      };
    }
    throw new Error("No response text");
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      id: "fallback",
      name: "Static Void",
      description: "The connection is weak. You see only ghosts.",
      themeColor: "#333333",
      items: [
        { 
          id: '1', name: 'Old Terminal', emoji: '📺', x: 50, y: 50, 
          description: 'It hums with ancient power.', 
          soundSecret: 'You hear the tapping of a thousand lost souls coding in COBOL.', 
          isKey: true, isTaken: false 
        }
      ],
      characters: []
    };
  }
};
