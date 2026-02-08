export enum GameState {
  MENU = 'MENU',
  GENERATING_ROOM = 'GENERATING_ROOM',
  EXPLORING = 'EXPLORING',
  GAME_OVER = 'GAME_OVER'
}

export type ActionType = 'LOOK' | 'LISTEN' | 'TAKE' | 'MOVE' | 'TALK';

export interface Item {
  id: string;
  name: string;
  emoji: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  description: string; // What you see
  soundSecret: string; // What you hear (clue)
  isKey: boolean; // Does this unlock the next room?
  isTaken: boolean;
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  description: string;
  dialogue: string; // What they say when you TALK
}

export interface Room {
  id: string;
  name: string;
  description: string;
  items: Item[];
  characters: Character[];
  themeColor: string; // Hex code for ambiance
}

export interface PlayerState {
  inventory: string[];
  currentAction: ActionType;
  log: string[]; // History of text
}
