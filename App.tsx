import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import PendulumCanvas from './components/PendulumCanvas';
import Interface from './components/Interface';
import { generateMystery, validateGuess } from './services/geminiService';
import { GameState, SoundMystery } from './types';
import { useAudioEngine } from './hooks/useAudioEngine';
import { LiveMusicHelper } from './utils/live_music_helper';

// Global reference for the music helper to persist across re-renders
let lyriaHelper: LiveMusicHelper | null = null;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [mystery, setMystery] = useState<SoundMystery | null>(null);
  const [signalStrength, setSignalStrength] = useState(0);
  const [validationFeedback, setValidationFeedback] = useState<string | null>(null);
  
  // Local physics audio (Wind, Hum)
  const { initAudio, updateAudio, playSuccessSound, playFailureSound } = useAudioEngine();
  
  // We use refs for high-frequency updates to avoid React render cycles for audio
  const signalRef = useRef(0);

  // Initialize Lyria helper once
  useEffect(() => {
    if (!lyriaHelper) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Using the experimental realtime model
      lyriaHelper = new LiveMusicHelper(ai, 'lyria-realtime-exp');
    }
    
    // Cleanup on unmount
    return () => {
      lyriaHelper?.stop();
    };
  }, []);

  // Effect: Handle Game State changes for Music
  useEffect(() => {
    if (!lyriaHelper) return;

    if (gameState === GameState.PLAYING && mystery) {
      // Start the music stream when playing starts
      lyriaHelper.play().then(() => {
        // Set the prompt to match the mystery vibe
        // We mix a base industrial layer with the specific clue
        lyriaHelper?.setPrompts([
          { 
            text: "Dark industrial ambient drone, avant-garde, musique concrète, deep space silence, metallic textures", 
            weight: 0.5 
          },
          { 
            text: `Sound design of ${mystery.clue}. Experimental, cinematic, foley.`, 
            weight: 1.0 
          }
        ]);
      });
    } else if (gameState === GameState.GAME_OVER || gameState === GameState.SUCCESS) {
      // Fade out music on end
      lyriaHelper.setVolume(0);
      setTimeout(() => lyriaHelper?.pause(), 1000);
    }
  }, [gameState, mystery]);

  // Velocity comes from the canvas component (physics engine)
  const handleVelocityChange = useCallback((velocity: number) => {
    // 1. Calculate Signal Strength based on velocity
    let strength = 0;
    const v = velocity * 10; 

    if (v > 0.1 && v < 2.5) {
      // Sweet spot
      strength = Math.min(1, v / 0.5);
      if (v > 1.5) strength = Math.max(0, 1 - (v - 1.5)); // Drop off if too fast
    } else {
      strength = Math.max(0, signalRef.current - 0.015); // Decay
    }

    // Smooth dampening
    const prev = signalRef.current;
    const newStrength = prev + (strength - prev) * 0.1;
    signalRef.current = newStrength;
    
    // 2. Update React State (throttled visually via React batching usually, but good to be careful)
    setSignalStrength(newStrength);

    // 3. Update Audio Engines
    
    // Local Physics Audio (Wind/Hum) - Always active for tactile feel
    updateAudio(velocity, newStrength);

    // Lyria Music (The Mystery) - Volume controls "Tuning In"
    if (lyriaHelper && gameState === GameState.PLAYING) {
      // We map signal strength to volume. 
      // Non-linear curve: It stays quiet until you really get it right
      const volume = Math.pow(newStrength, 1.5); 
      lyriaHelper.setVolume(volume);
    }

  }, [gameState, updateAudio]);

  const startGame = async () => {
    initAudio(); // Initialize local audio context
    
    setGameState(GameState.LOADING_MYSTERY);
    try {
      const newMystery = await generateMystery();
      setMystery(newMystery);
      setGameState(GameState.PLAYING);
      signalRef.current = 0;
      setSignalStrength(0);
    } catch (e) {
      console.error(e);
      setGameState(GameState.ERROR);
    }
  };

  const handleGuess = async (guess: string) => {
    if (!mystery) return;
    
    setGameState(GameState.VALIDATING);
    try {
      const result = await validateGuess(mystery, guess);
      setValidationFeedback(result.feedback);
      
      if (result.isCorrect || result.similarityScore > 80) {
        playSuccessSound();
        setGameState(GameState.SUCCESS);
      } else {
        playFailureSound();
        setGameState(GameState.GAME_OVER);
      }
    } catch (e) {
      console.error(e);
      setGameState(GameState.ERROR);
    }
  };

  const resetGame = () => {
    setMystery(null);
    setValidationFeedback(null);
    signalRef.current = 0;
    setSignalStrength(0);
    startGame();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      
      {/* 3D/Physics Layer */}
      <PendulumCanvas 
        onVelocityChange={handleVelocityChange} 
        isActive={gameState === GameState.PLAYING}
      />

      {/* UI Overlay Layer */}
      <Interface 
        gameState={gameState}
        mystery={mystery}
        signalStrength={signalStrength}
        onStart={startGame}
        onGuess={handleGuess}
        onReset={resetGame}
        validationFeedback={validationFeedback}
      />
      
    </div>
  );
};

export default App;
