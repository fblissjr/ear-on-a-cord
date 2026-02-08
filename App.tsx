import React, { useState, useEffect, useRef } from 'react';
import AdventureScene from './components/AdventureScene';
import RetroInterface from './components/RetroInterface';
import { generateRoom } from './services/geminiService';
import { GameState, Room, Item, Character, ActionType, PlayerState } from './types';
import { useAudioEngine } from './hooks/useAudioEngine';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    inventory: [],
    currentAction: 'LOOK',
    log: ["System initialized...", "Awaiting connection."]
  });
  
  const { initAudio, playBlip, playError, playSuccess, playScan } = useAudioEngine();
  const levelRef = useRef(1);

  // Auto-scroll log
  useEffect(() => {
    const el = document.getElementById('log-end');
    el?.scrollIntoView({ behavior: 'smooth' });
  }, [playerState.log]);

  const addToLog = (text: string) => {
    setPlayerState(prev => ({
      ...prev,
      log: [...prev.log, text]
    }));
  };

  const startGame = async () => {
    initAudio();
    playBlip();
    setGameState(GameState.GENERATING_ROOM);
    addToLog("> CONNECTING TO NEURAL NET...");
    
    const room = await generateRoom(levelRef.current);
    setCurrentRoom(room);
    setGameState(GameState.EXPLORING);
    addToLog(`> LOADED: ${room.name}`);
    addToLog(room.description);
  };

  const handleInteractItem = (item: Item) => {
    playBlip();

    switch (playerState.currentAction) {
      case 'LOOK':
        addToLog(`> Looking at ${item.name}...`);
        addToLog(item.description);
        break;
        
      case 'LISTEN':
        playScan();
        addToLog(`> Tuning Ear to ${item.name}...`);
        setTimeout(() => {
          addToLog(`AUDIO DECRYPTED: "${item.soundSecret}"`);
        }, 500);
        break;

      case 'TAKE':
        if (item.isKey) {
          playSuccess();
          addToLog(`> You found the SIGNAL KEY inside the ${item.name}!`);
          addToLog("The exit resonates with a new frequency.");
          setPlayerState(prev => ({
            ...prev,
            inventory: [...prev.inventory, "Signal Key"]
          }));
          // Auto progress after delay
          setTimeout(() => {
            handleNextLevel();
          }, 3000);
        } else {
          playError();
          addToLog(`> You try to take the ${item.name}, but it's bolted down or useless.`);
        }
        break;

      case 'TALK':
        playError();
        addToLog(`> You speak to the ${item.name}. It ignores you, obviously.`);
        break;

      case 'MOVE':
        playError();
        addToLog("> Can't move there yet. Find the Signal Key first.");
        break;
    }
  };

  const handleInteractCharacter = (char: Character) => {
    playBlip();

    switch(playerState.currentAction) {
      case 'LOOK':
        addToLog(`> Observing ${char.name}...`);
        addToLog(char.description);
        break;

      case 'TALK':
        addToLog(`> You greet ${char.name}.`);
        setTimeout(() => {
          addToLog(`"${char.dialogue}"`);
        }, 500);
        break;
      
      case 'LISTEN':
        playScan();
        addToLog(`> Listening to the thoughts of ${char.name}...`);
        setTimeout(() => {
          addToLog(`...Static... Fear... Hunger...`);
        }, 800);
        break;

      default:
        playError();
        addToLog("> Not possible.");
        break;
    }
  }

  const handleNextLevel = () => {
    levelRef.current += 1;
    setPlayerState(prev => ({
      ...prev,
      inventory: [], 
      log: [`> JUMPING TO SECTOR ${levelRef.current}...`]
    }));
    startGame();
  };

  const setAction = (action: ActionType) => {
    playBlip();
    setPlayerState(prev => ({ ...prev, currentAction: action }));
    addToLog(`> MODE: ${action}`);
  };

  if (gameState === GameState.MENU) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-green-500 font-['VT323']">
        <h1 className="text-6xl mb-4 animate-pulse">EAR ON A CORD</h1>
        <p className="mb-8 text-xl">A Cyber-Noir Audio Adventure</p>
        <button 
          onClick={startGame}
          className="border-2 border-green-500 px-8 py-2 text-2xl hover:bg-green-900 hover:text-white transition-all uppercase"
        >
          Insert Coin (Start)
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      <div className="flex-1 relative">
        {currentRoom && (
          <AdventureScene 
            room={currentRoom}
            currentAction={playerState.currentAction}
            onInteractItem={handleInteractItem}
            onInteractCharacter={handleInteractCharacter}
          />
        )}
        
        {/* Loading Overlay */}
        {gameState === GameState.GENERATING_ROOM && (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
            <div className="text-green-500 font-['VT323'] text-2xl animate-pulse">
              GENERATING REALITY...
            </div>
          </div>
        )}
      </div>

      <RetroInterface 
        room={currentRoom}
        playerState={playerState}
        onSetAction={setAction}
        onNextLevel={handleNextLevel}
        isGenerating={gameState === GameState.GENERATING_ROOM}
      />
    </div>
  );
};

export default App;
