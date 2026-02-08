import React, { useState, useEffect, useRef } from 'react';
import AdventureScene from './components/AdventureScene';
import RetroInterface from './components/RetroInterface';
import { generateRoom, generatePlayerSprite, generateDialogue } from './services/geminiService';
import { GameState, Room, Item, Character, ActionType, PlayerState } from './types';
import { useAudioEngine } from './hooks/useAudioEngine';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  
  // Dialogue State
  const [dialogueTarget, setDialogueTarget] = useState<Character | null>(null);
  const [dialogueOptions, setDialogueOptions] = useState<string[] | null>(null);
  const [npcText, setNpcText] = useState<string | null>(null);

  const [playerState, setPlayerState] = useState<PlayerState>({
    inventory: [],
    currentAction: null,
    log: [],
    playerX: 50,
    playerY: 80
  });
  
  const { initAudio, playBlip, playError, playSuccess, playScan } = useAudioEngine();
  const levelRef = useRef(1);

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
    
    if (!playerState.playerSprite) {
        const sprite = await generatePlayerSprite();
        if (sprite) {
            setPlayerState(prev => ({ ...prev, playerSprite: sprite }));
        }
    }
    
    const room = await generateRoom(levelRef.current);
    setCurrentRoom(room);
    setGameState(GameState.EXPLORING);
    addToLog(`Entered ${room.name}`);
  };

  // Move player and update state
  const handleMove = (x: number, y: number) => {
      // Simple instant update for now, CSS transition handles smoothness
      setPlayerState(prev => ({ ...prev, playerX: x, playerY: y }));
      // If we move, we might cancel current action? classic games kept it, let's keep it.
  }

  const handleInteractItem = (item: Item) => {
    playBlip();
    // Move player to item roughly
    handleMove(item.x, Math.min(item.y + 10, 95));

    if (!playerState.currentAction) {
        addToLog(`It is a ${item.name}.`);
        return;
    }

    switch (playerState.currentAction) {
      case 'LOOK AT':
        addToLog(`You see: ${item.description}`);
        break;
        
      case 'USE': // Replaces LISTEN for generic usage, but we can infer listen
        // Special case for our game theme
        playScan();
        addToLog(`Scanning ${item.name}...`);
        setTimeout(() => addToLog(`Sound detected: ${item.soundSecret}`), 1000);
        break;

      case 'PICK UP':
        if (item.isKey) {
          playSuccess();
          addToLog(`Picked up ${item.name}.`);
          setPlayerState(prev => ({
            ...prev,
            inventory: [...prev.inventory, item.name],
            currentAction: null
          }));
          // Mark item taken in room? For now we just clone room state locally
          if (currentRoom) {
              setCurrentRoom({
                  ...currentRoom,
                  items: currentRoom.items.map(i => i.id === item.id ? { ...i, isTaken: true } : i)
              })
          }
        } else {
          playError();
          addToLog(`I can't pick that up.`);
        }
        break;

      default:
        addToLog(`That doesn't seem to work.`);
        break;
    }
    
    // Reset action after use typically? Classic games kept it sticky sometimes. 
    // Let's reset for better UX on mobile/web
    setPlayerState(prev => ({ ...prev, currentAction: null }));
  };

  const handleInteractCharacter = async (char: Character) => {
    playBlip();
    handleMove(char.x - 10, char.y);

    if (playerState.currentAction === 'TALK TO') {
        setGameState(GameState.DIALOGUE);
        setDialogueTarget(char);
        setNpcText(`${char.name} looks at you expectantly.`);
        setDialogueOptions(["Hello.", "Who are you?", "What is this place?"]);
        setPlayerState(prev => ({ ...prev, currentAction: null }));
    } else if (playerState.currentAction === 'LOOK AT') {
        addToLog(char.description);
        setPlayerState(prev => ({ ...prev, currentAction: null }));
    } else {
        addToLog(`${char.name} doesn't want that.`);
        setPlayerState(prev => ({ ...prev, currentAction: null }));
    }
  }

  const handleDialogueSelect = async (option: string) => {
      if (!dialogueTarget) return;
      
      setNpcText("..."); // Loading indicator
      setDialogueOptions(null); // Hide options
      
      const result = await generateDialogue(dialogueTarget, option);
      
      setNpcText(`"${result.text}"`);
      setDialogueOptions([...result.options, "[End Conversation]"]);
      
      if (option === "[End Conversation]") {
          setGameState(GameState.EXPLORING);
          setDialogueTarget(null);
          setDialogueOptions(null);
          setNpcText(null);
      }
  };

  const handleNextLevel = () => {
    levelRef.current += 1;
    startGame();
  };

  const setAction = (action: ActionType) => {
    playBlip();
    setPlayerState(prev => ({ ...prev, currentAction: action }));
  };

  if (gameState === GameState.MENU) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#111] text-green-500 font-['VT323']">
        <h1 className="text-6xl mb-4 animate-pulse text-shadow-glow">EAR ON A CORD</h1>
        <p className="mb-8 text-xl text-slate-400">Point & Click Audio Mystery</p>
        <button 
          onClick={startGame}
          className="border-2 border-green-600 px-8 py-2 text-2xl hover:bg-green-700 hover:text-white transition-all uppercase rounded shadow-[4px_4px_0px_0px_rgba(0,255,0,0.5)]"
        >
          Start Game
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      <div className="flex-1 relative flex items-center justify-center bg-[#050505]">
        {currentRoom && (
          <div className="w-full h-full border-x-0 border-slate-800 shadow-2xl relative">
             <AdventureScene 
                room={currentRoom}
                playerState={playerState}
                onMove={handleMove}
                onInteractItem={handleInteractItem}
                onInteractCharacter={handleInteractCharacter}
              />
          </div>
        )}
        
        {/* Loading Overlay */}
        {gameState === GameState.GENERATING_ROOM && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
             <div className="text-green-500 font-['VT323'] text-3xl animate-pulse mb-4">
               GENERATING SCENE...
             </div>
             <div className="w-64 h-2 bg-slate-800 rounded overflow-hidden">
                <div className="h-full bg-green-600 animate-loading-bar"></div>
             </div>
          </div>
        )}
      </div>

      <div className="w-full mx-auto border-t-4 border-slate-800">
        <RetroInterface 
            room={currentRoom}
            playerState={playerState}
            onSetAction={setAction}
            onNextLevel={handleNextLevel}
            onDialogueSelect={handleDialogueSelect}
            isGenerating={gameState === GameState.GENERATING_ROOM}
            dialogueOptions={dialogueOptions}
            npcText={npcText}
        />
      </div>
    </div>
  );
};

export default App;
