import { GoogleGenAI, Type } from "@google/genai";
import { Room, Character } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-2.5-flash-lite";
const imageModelName = "gemini-2.5-flash-image";

// Helper to prevent rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for retry logic
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED'))) {
      console.warn(`Rate limit 429 hit. Retrying in ${delayMs}ms...`);
      await delay(delayMs);
      return callWithRetry(fn, retries - 1, delayMs * 2); 
    }
    throw error;
  }
}

// Helper: Check if a local asset exists (HEAD request)
const checkLocalAsset = async (filename: string): Promise<string | null> => {
    try {
        const path = `/assets/${filename}`;
        const response = await fetch(path, { method: 'HEAD' });
        if (response.ok) {
            console.log(`Found local asset: ${filename}`);
            return path;
        }
    } catch (e) {
        // ignore
    }
    return null;
};

// Helper: Load local reference image for AI input. Tries multiple extensions.
const loadReferenceImage = async (baseName: string): Promise<{ base64: string, mimeType: string } | null> => {
    const extensions = ['png', 'jpg', 'jpeg', 'webp'];
    
    for (const ext of extensions) {
        try {
            const path = `/assets/${baseName}_ref.${ext}`;
            const response = await fetch(path);
            if (response.ok) {
                console.log(`Loaded reference image: ${path}`);
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64Full = reader.result as string;
                        const base64Data = base64Full.split(',')[1];
                        resolve({ base64: base64Data, mimeType: blob.type });
                    };
                    reader.readAsDataURL(blob);
                });
            }
        } catch (e) {
            continue;
        }
    }
    console.log(`No reference image found for: ${baseName}_ref`);
    return null;
};

// -- Image Generation --

export const generateImage = async (prompt: string, reference?: { base64: string, mimeType: string } | null): Promise<string | undefined> => {
  try {
    const parts: any[] = [];
    
    // 1. Add Reference Image (if provided)
    if (reference) {
        parts.push({
            inlineData: {
                mimeType: reference.mimeType,
                data: reference.base64
            }
        });
        // Strengthen prompt to use reference
        prompt = `Strictly preserve the character details from the attached reference image (face, clothes, hair). ${prompt}`;
    }

    // 2. Add Text Prompt
    parts.push({ text: prompt });

    const response = await callWithRetry(() => ai.models.generateContent({
      model: imageModelName,
      contents: { parts }
    }), 3, 4000); 
    
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

// Updated logic: Check for Final Asset -> Check for Reference -> Generate
export const generateSprite = async (description: string, assetName?: string): Promise<string | undefined> => {
    
    // 1. Check if the user provided a FINISHED spritesheet (e.g., "player.png") to skip AI
    if (assetName) {
        const localSheet = await checkLocalAsset(`${assetName}.png`);
        if (localSheet) return localSheet;
    }

    // 2. Check if the user provided a REFERENCE for AI (e.g., "player_ref.jpg")
    const referenceData = assetName ? await loadReferenceImage(assetName) : null;
    
    // 3. Generate with AI
    // We request a 3-pose sheet: Front, Side, Back.
    const prompt = `
        Create a Character Sprite Sheet.
        Style: Pop Art, Comic Book, Roy Lichtenstein style (thick outlines, Ben-Day dots, bold colors).
        Layout: Three distinct full-body poses arranged horizontally in a row on a white background.
        
        The image MUST be divided into three equal columns:
        [ Column 1: Front View ] [ Column 2: Side View (Walking Right) ] [ Column 3: Back View ]
        
        Rules:
        - The character must match the reference image provided in terms of clothing, gender, and features.
        - Keep the background solid white or transparent. 
        - Do not crop the head or feet.
        - Characters should be centered in their respective 1/3 sections.
    `;

    return generateImage(prompt, referenceData);
};

export const generateBackground = async (description: string, assetName?: string): Promise<string | undefined> => {
    if (assetName) {
        const localBg = await checkLocalAsset(`${assetName}.png`);
        if (localBg) return localBg;
    }

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
    // This will look for 'player_ref.jpg' (or png/jpeg) and generate the sheet
    // We add a backup description just in case the reference is missing or ambiguous
    return generateSprite(
        "a cool female detective in a green hoodie", 
        "player"
    );
}

// -- Text/Logic Generation --

export const generateRoom = async (level: number): Promise<Room> => {
  if (level === 1) {
      const description = "A stylized blue and grey jazz club with heavy curtains and stage lights. Pop art style.";
      
      const bgUrl = await generateBackground(description, "room1");
      await delay(1000); 

      // Check for 'sax_ref.jpg' -> generates sheet
      const saxManImg = await generateSprite(
          "a heavy set man playing a gold saxophone, wearing a white shirt and tie", 
          "sax"
      );
      await delay(1000);
      
      // Check for 'bald_ref.jpg' -> generates sheet
      const baldManImg = await generateSprite(
          "a tall bald man in a blue suit standing menacingly", 
          "bald"
      );
      await delay(1000);
      
      // Check for 'guitar_ref.jpg' -> generates sheet
      const guitarManImg = await generateSprite(
          "a young man playing electric guitar sitting down", 
          "guitar"
      );
      await delay(1000);
      
      // Check for 'mic_ref.jpg' -> generates sheet
      const itemImg = await generateSprite(
          "a retro microphone stand", 
          "mic"
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
