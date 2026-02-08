export enum GameState {
  MENU = 'MENU',
  GENERATING_ROOM = 'GENERATING_ROOM',
  EXPLORING = 'EXPLORING',
  DIALOGUE = 'DIALOGUE',
  GAME_OVER = 'GAME_OVER'
}

export type ActionType = 'GIVE' | 'PICK UP' | 'USE' | 'OPEN' | 'LOOK AT' | 'PUSH' | 'CLOSE' | 'TALK TO' | 'PULL';

export interface Item {
  id: string;
  name: string;
  emoji: string;
  imageUrl?: string; // Base64 image
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width?: number; // scale
  description: string; // What you see
  soundSecret: string; // What you hear (clue)
  isKey: boolean; // Does this unlock the next room?
  isTaken: boolean;
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  imageUrl?: string; // Base64 image
  x: number;
  y: number;
  width?: number;
  description: string;
  personality: string; // Context for AI generation
}

export interface Room {
  id: string;
  name: string;
  description: string;
  backgroundImageUrl?: string; // The main scene
  items: Item[];
  characters: Character[];
  themeColor: string;
}

export interface PlayerState {
  inventory: string[];
  currentAction: ActionType | null;
  log: string[]; 
  playerSprite?: string;
  playerX: number; // 0-100
  playerY: number; // 0-100
}

export interface DialogueOption {
  label: string;
  prompt: string;
}
