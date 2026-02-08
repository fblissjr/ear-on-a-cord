import React, { useState } from 'react';
import { GameState, SoundMystery } from '../types';

interface InterfaceProps {
  gameState: GameState;
  mystery: SoundMystery | null;
  signalStrength: number; // 0 to 1
  onStart: () => void;
  onGuess: (guess: string) => void;
  onReset: () => void;
  validationFeedback: string | null;
}

const Interface: React.FC<InterfaceProps> = ({ 
  gameState, 
  mystery, 
  signalStrength, 
  onStart, 
  onGuess,
  onReset,
  validationFeedback
}) => {
  const [guessInput, setGuessInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guessInput.trim()) {
      onGuess(guessInput);
      setGuessInput('');
    }
  };

  // Signal noise visualizer based on strength
  // In dark mode, we use blur and opacity differently
  const textBlur = Math.max(0, (1 - signalStrength) * 12);
  const textOpacity = Math.max(0.1, signalStrength);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-8 z-30 text-slate-100">
      
      {/* HUD Header */}
      <div className="w-full flex justify-between items-start opacity-80 mix-blend-difference">
        <div className="border-l-2 border-white pl-3">
          <h1 className="text-xs font-bold tracking-[0.3em] uppercase mb-1">Subject 001</h1>
          <h2 className="text-xl font-light tracking-tighter uppercase">Ear on a Cord</h2>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">Reception</span>
             <span className={`text-xs font-mono font-bold ${signalStrength > 0.8 ? 'text-green-400' : 'text-red-500'}`}>
               {(signalStrength * 100).toFixed(1)}%
             </span>
          </div>
          {/* Signal Bar */}
          <div className="flex gap-1 mt-2">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1 h-3 transition-colors duration-100 ${i < signalStrength * 10 ? 'bg-white' : 'bg-slate-800'}`}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center pointer-events-auto perspective-1000">
        
        {/* INTRO */}
        {gameState === GameState.INTRO && (
          <div className="bg-black/40 backdrop-blur-xl p-10 border border-white/10 text-center max-w-md shadow-2xl">
            <div className="mb-6 opacity-80">
              <svg className="w-8 h-8 mx-auto text-white mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className="text-xl font-light mb-6 tracking-wide">
              "The air is thick. The cord is live."
            </p>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">
              Drag the ear to catch the signal.<br/>Listen to the description.<br/>Identify the sound.
            </p>
            <button 
              onClick={onStart}
              className="group relative px-8 py-3 bg-white text-black font-bold tracking-widest text-xs uppercase hover:bg-slate-200 transition-all overflow-hidden"
            >
              <span className="relative z-10">Initialize Connection</span>
              <div className="absolute inset-0 bg-white/50 blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        )}

        {/* LOADING */}
        {(gameState === GameState.LOADING_MYSTERY || gameState === GameState.VALIDATING) && (
          <div className="flex flex-col items-center justify-center">
             <div className="w-16 h-16 border border-white/20 border-t-white rounded-full animate-spin duration-700 mb-6"></div>
             <p className="text-xs font-mono uppercase tracking-[0.2em] animate-pulse">
               {gameState === GameState.LOADING_MYSTERY ? 'Scanning Frequencies...' : 'Analyzing Audio Pattern...'}
             </p>
          </div>
        )}

        {/* PLAYING - THE CLUE */}
        {gameState === GameState.PLAYING && mystery && (
          <div 
            className="text-center max-w-2xl px-4 transition-all duration-300 ease-out mix-blend-screen"
            style={{ 
              filter: `blur(${textBlur}px)`,
              opacity: textOpacity,
              transform: `scale(${0.95 + signalStrength * 0.05})`
            }}
          >
            <h3 className="text-3xl md:text-5xl font-light leading-snug text-white shadow-black drop-shadow-2xl">
              "{mystery.clue}"
            </h3>
            
            {signalStrength < 0.3 && (
              <p className="text-red-500 font-mono text-[10px] mt-8 uppercase tracking-widest animate-flash">
                ⚠ Signal Weak - Oscillate the Receiver
              </p>
            )}
          </div>
        )}

        {/* SUCCESS / FAIL */}
        {(gameState === GameState.SUCCESS || gameState === GameState.GAME_OVER) && (
          <div className="bg-black/60 backdrop-blur-md p-10 border-y border-white/20 text-center w-full max-w-xl">
            <h2 className={`text-4xl font-light mb-4 tracking-tighter uppercase ${gameState === GameState.SUCCESS ? 'text-white' : 'text-red-500'}`}>
              {gameState === GameState.SUCCESS ? 'Identity Confirmed' : 'Transmission Lost'}
            </h2>
            <div className="w-12 h-0.5 bg-white/30 mx-auto mb-6"></div>
            <p className="text-lg text-slate-300 mb-2 font-light">Subject Identified As:</p>
            <p className="text-2xl text-white font-bold mb-6 uppercase tracking-widest">{mystery?.hiddenObject}</p>
            
            <p className="text-sm font-mono text-slate-400 mb-8 border-l-2 border-slate-700 pl-4 text-left mx-auto max-w-xs">
              {validationFeedback}
            </p>
            
            <button 
              onClick={onReset}
              className="px-6 py-2 border border-white/40 text-white hover:bg-white hover:text-black transition-colors text-xs uppercase tracking-widest"
            >
              Resume Monitoring
            </button>
          </div>
        )}
      </div>

      {/* Footer / Input */}
      <div className="w-full pointer-events-auto flex justify-center pb-8">
        {gameState === GameState.PLAYING && (
          <form onSubmit={handleSubmit} className="w-full max-w-lg relative">
            <div className={`absolute -top-10 w-full text-center transition-opacity duration-300 ${signalStrength > 0.4 ? 'opacity-100' : 'opacity-0'}`}>
               <span className="text-[10px] uppercase tracking-widest text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                 Input Channel Open
               </span>
            </div>
            
            <input
              type="text"
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              placeholder="IDENTIFY THE SOUND SOURCE"
              className="w-full bg-black/40 backdrop-blur border-b border-white/30 focus:border-white px-6 py-4 text-xl outline-none placeholder:text-white/20 text-center text-white font-light tracking-wide transition-all uppercase"
              autoFocus
            />
            
            <button 
              type="submit" 
              className="absolute right-0 top-0 h-full px-6 text-white/50 hover:text-white transition-colors"
              disabled={!guessInput}
            >
              ➝
            </button>
          </form>
        )}
      </div>

      {/* Corner Accents */}
      <div className="absolute top-8 left-8 w-4 h-4 border-t border-l border-white/30"></div>
      <div className="absolute top-8 right-8 w-4 h-4 border-t border-r border-white/30"></div>
      <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-white/30"></div>
      <div className="absolute bottom-8 right-8 w-4 h-4 border-b border-r border-white/30"></div>
    </div>
  );
};

export default Interface;
