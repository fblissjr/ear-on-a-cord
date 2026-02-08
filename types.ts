export enum GameState {
  INTRO = 'INTRO',
  LOADING_MYSTERY = 'LOADING_MYSTERY',
  PLAYING = 'PLAYING',
  VALIDATING = 'VALIDATING',
  SUCCESS = 'SUCCESS',
  GAME_OVER = 'GAME_OVER',
  ERROR = 'ERROR'
}

export interface SoundMystery {
  id: string;
  category: string;
  clue: string; // The "sound" description (e.g., "A rhythmic crunching on a forest floor")
  hiddenObject: string; // The answer (e.g., "Walking on dry leaves")
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ValidationResult {
  isCorrect: boolean;
  feedback: string;
  similarityScore: number; // 0 to 100
}

export interface PendulumState {
  angle: number;
  velocity: number;
  length: number;
}
