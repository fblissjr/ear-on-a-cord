import { GoogleGenAI, Type } from "@google/genai";
import { Room, Character } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-2.5-flash-lite";
const imageModelName = "gemini-2.5-flash-image";

// Helper to prevent rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for retry logic on 429 errors
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED'))) {
      console.warn(`Rate limit 429 hit. Retrying in ${delayMs}ms...`);
      await delay(delayMs);
      return callWithRetry(fn, retries - 1, delayMs * 2); // Exponential backoff
    }
    throw error;
  }
}

// Helper to load local reference image if it exists
const loadReferenceImage = async (filename: string): Promise<string | null> => {
    try {
        const response = await fetch(`/assets/${filename}`);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                // remove data:image/xxx;base64, prefix for API usage if needed, 
                // but @google/genai usually takes raw base64 without prefix in inlineData.data
                const rawBase64 = base64.split(',')[1];
                resolve(rawBase64);
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return null;
    }
};

// -- Image Generation --

export const generateImage = async (prompt: string, referenceBase64?: string | null): Promise<string | undefined> => {
  try {
    const parts: any[] = [];
    
    // Add reference image first if available
    if (referenceBase64) {
        parts.push({
            inlineData: {
                mimeType: "image/png",
                data: referenceBase64
            }
        });
        // Strengthen prompt to use reference
        prompt = `Strictly based on the attached reference image. ${prompt}`;
    }

    parts.push({ text: prompt });

    const response = await callWithRetry(() => ai.models.generateContent({
      model: imageModelName,
      contents: { parts }
    }), 3, 4000); 
    
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

// Updated to request Spritesheets
export const generateSprite = async (description: string, referenceFilename?: string): Promise<string | undefined> => {
    const refBase64 = referenceFilename ? await loadReferenceImage(referenceFilename) : null;
    
    // We request a 3-pose sheet: Front, Side, Back.
    // The renderer will handle cropping.
    return generateImage(`
        Character Sheet of ${description}. 
        Style: Pop Art, Comic Book, Roy Lichtenstein style. 
        Format: Three distinct full-body poses arranged horizontally in a row.
        1. Front View (facing camera).
        2. Side View (walking right).
        3. Back View (facing away).
        Details: Thick black outlines, flat colors, Ben-Day dots.
        Background: Transparent or solid white (isolated).
        Do not crop heads or feet. Keep scale consistent.
    `, refBase64);
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
    return generateSprite(
        "a young woman with blonde hair in a bun wearing a green zip-up hoodie holding a plastic ear", 
        "player_ref.png"
    );
}

// -- Text/Logic Generation --

export const generateRoom = async (level: number): Promise<Room> => {
  // Hardcoded structure for Level 1 to match the user's specific story request
  if (level === 1) {
      const description = "A stylized blue and grey jazz club with heavy curtains and stage lights. Pop art style.";
      
      const bgUrl = await generateBackground(description);
      await delay(2000); 

      // Attempt to use reference images if they exist in /assets/
      const saxManImg = await generateSprite(
          "a heavy set man playing a gold saxophone, wearing a white shirt and tie", 
          "sax_ref.png"
      );
      await delay(2000);
      
      const baldManImg = await generateSprite(
          "a tall bald man in a blue suit standing menacingly", 
          "bald_ref.png"
      );
      await delay(2000);
      
      const guitarManImg = await generateSprite(
          "a young man playing electric guitar sitting down", 
          "guitar_ref.png"
      );
      await delay(2000);
      
      const itemImg = await generateSprite(
          "a retro microphone stand", 
          "mic_ref.png"
      );

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
                x: 15, y: 75, width: 8,
                soundSecret: 'Feedback loop.', isKey: false, isTaken: false
            }
        ],
        characters: [
            {
                id: 'char-sax', name: 'Saxophonist', emoji: '🎷',
                description: 'He is lost in the music.', personality: 'Soulful but busy.',
                imageUrl: saxManImg,
                x: 80, y: 70, width: 22 
            },
            {
                id: 'char-bald', name: 'The Bodyguard', emoji: '🕴️',
                description: 'He watches your every move.', personality: 'Stoic, threatening.',
                imageUrl: baldManImg,
                x: 50, y: 65, width: 18
            },
            {
                id: 'char-guitar', name: 'Guitarist', emoji: '🎸',
                description: 'Strumming quietly in the corner.', personality: 'Chill.',
                imageUrl: guitarManImg,
                x: 25, y: 65, width: 18
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
    const response = await callWithRetry(() => ai.models.generateContent({
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
    }), 3, 2000);

    if (response.text) {
      const data = JSON.parse(response.text);
      
      const bgUrl = await generateBackground(data.description);
      await delay(2000);

      const items = [];
      for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const img = await generateSprite(item.description);
          await delay(2000);
          items.push({
            ...item,
            id: `item-${i}`,
            emoji: '📦',
            imageUrl: img,
            x: 20 + (i * 30),
            y: 70 + (Math.random() * 10),
            width: 12,
            isTaken: false
          });
      }

      const characters = [];
      for (let i = 0; i < data.characters.length; i++) {
          const char = data.characters[i];
          const img = await generateSprite(char.description);
          await delay(2000);
          characters.push({
            ...char,
            id: `char-${i}`,
            emoji: '👤',
            imageUrl: img,
            x: 60,
            y: 70,
            width: 20
          });
      }

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
        const result = await callWithRetry(() => ai.models.generateContent({
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
        }), 3, 2000);
        
        if (result.text) {
            const data = JSON.parse(result.text);
            return { text: data.response, options: data.options };
        }
    } catch (e) {
        console.error("Dialogue Gen Error", e);
    }
    
    return { text: "...", options: ["Leave"] };
}