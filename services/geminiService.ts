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
        Character design sprite of ${description}. 
        Style: Pop Art, Comic Book, Roy Lichtenstein style. 
        Details: Thick black outlines, bold flat colors, Ben-Day dots shading.
        View: Full body, standing pose, facing forward, isolated on solid black background.
        Do not crop the head or feet.
    `);
};

export const generateBackground = async (description: string): Promise<string | undefined> => {
    return generateImage(`
        Point and click adventure game background art.
        Scene: ${description}.
        Style: Pop Art Comic Book style (like Roy Lichtenstein).
        Details: Halftone patterns, bold outlines, vibrant colors.
        Perspective: Cinematic wide shot, room interior.
        No characters, no text, no UI in the background.
    `);
}

export const generatePlayerSprite = async (): Promise<string | undefined> => {
    return generateSprite("a young woman with blonde hair in a bun wearing a green zip-up hoodie holding a plastic ear, side profile");
}

// -- Text/Logic Generation --

export const generateRoom = async (level: number): Promise<Room> => {
  // Hardcoded structure for Level 1 to match the user's specific story request
  if (level === 1) {
      const description = "A stylized blue and grey room with heavy curtains. A band is playing.";
      
      // Parallel generation for assets
      const bgPromise = generateBackground(description);
      
      const saxManImg = await generateSprite("a heavy set man playing a gold saxophone, wearing a white shirt and tie");
      const baldManImg = await generateSprite("a tall bald man in a blue suit standing menacingly");
      const guitarManImg = await generateSprite("a young man playing electric guitar sitting down");
      
      const itemImg = await generateSprite("a retro microphone stand");

      const bgUrl = await bgPromise;

      return {
        id: `room-1`,
        name: "The Jazz Room",
        description: description,
        backgroundImageUrl: bgUrl,
        themeColor: "#4f46e5",
        items: [
            {
                id: 'item-mic', name: 'Mic Stand', emoji: '🎤', 
                description: 'A chrome microphone stand.', 
                imageUrl: itemImg,
                x: 20, y: 80, width: 10,
                soundSecret: 'Feedback loop.', isKey: false, isTaken: false
            }
        ],
        characters: [
            {
                id: 'char-sax', name: 'Saxophonist', emoji: '🎷',
                description: 'He is lost in the music.', personality: 'Soulful but busy.',
                imageUrl: saxManImg,
                x: 75, y: 75, width: 25 // Large width
            },
            {
                id: 'char-bald', name: 'The Bodyguard', emoji: '🕴️',
                description: 'He watches your every move.', personality: 'Stoic, threatening.',
                imageUrl: baldManImg,
                x: 40, y: 65, width: 20
            },
            {
                id: 'char-guitar', name: 'Guitarist', emoji: '🎸',
                description: 'Strumming quietly in the corner.', personality: 'Chill.',
                imageUrl: guitarManImg,
                x: 15, y: 60, width: 15
            }
        ]
      };
  }

  // AI Generated levels for 2+
  const prompt = `
    Design a room for a Pop-Art Noir adventure game.
    Level: ${level}.
    
    Return JSON:
    - name: string
    - description: string
    - themeColor: hex string
    - items: list of 2 items (name, visual_desc, secret_sound, is_key)
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
      
      const bgPromise = generateBackground(data.description);
      
      const itemsPromise = data.items.map(async (item: any, i: number) => ({
          ...item,
          id: `item-${i}`,
          emoji: '📦',
          imageUrl: await generateSprite(item.description),
          x: 20 + (i * 30),
          y: 70 + (Math.random() * 10),
          width: 12,
          isTaken: false
      }));

      const charPromise = data.characters.map(async (char: any, i: number) => ({
          ...char,
          id: `char-${i}`,
          emoji: '👤',
          imageUrl: await generateSprite(char.description),
          x: 60,
          y: 70,
          width: 20
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
        name: 'Static Void',
        description: 'Connection lost.',
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
