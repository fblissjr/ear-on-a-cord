import React from 'react';
import { ActionType, PlayerState, Room, GameState } from '../types';

interface RetroInterfaceProps {
  room: Room | null;
  playerState: PlayerState;
  onSetAction: (action: ActionType) => void;
  onNextLevel: () => void;
  onDialogueSelect: (option: string) => void;
  isGenerating: boolean;
  dialogueOptions: string[] | null;
  npcText: string | null;
  gameState: GameState;
}

const RetroInterface: React.FC<RetroInterfaceProps> = ({ 
  room, 
  playerState, 
  onSetAction, 
  onNextLevel,
  onDialogueSelect,
  isGenerating,
  dialogueOptions,
  npcText,
  gameState
}) => {
  const verbs: ActionType[] = [
    'GIVE', 'PICK UP', 'USE',
    'OPEN', 'LOOK AT', 'PUSH',
    'CLOSE', 'TALK TO', 'PULL'
  ];

  // If in Dialogue Mode, render a different interface
  if (gameState === GameState.DIALOGUE) {
      return (
        <div className="h-[40vh] bg-[#1a1a1a] border-t-4 border-slate-600 p-6 flex flex-col font-['Space_Mono']">
            {/* NPC Portrait placeholder could go here */}
            <div className="flex-1 text-center mb-6">
                 <p className="text-yellow-400 text-xl mb-2 font-bold animate-pulse">{npcText}</p>
            </div>
            
            <div className="flex flex-col gap-2">
                {dialogueOptions && dialogueOptions.map((opt, i) => (
                    <button 
                        key={i}
                        onClick={() => onDialogueSelect(opt)}
                        className="text-left text-green-500 hover:text-green-300 hover:bg-slate-800 p-2 rounded text-lg transition-colors border border-transparent hover:border-green-800"
                    >
                        • "{opt}"
                    </button>
                ))}
                
                {(!dialogueOptions || dialogueOptions.length === 0) && (
                    <div className="text-slate-500 text-center italic">Thinking...</div>
                )}
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-[40vh] bg-black font-['VT323']">
      
      {/* Action Line (The "Sentence" being constructed) */}
      <div className="h-10 bg-black flex items-center justify-center border-t border-slate-700">
        <span className="text-green-500 text-2xl uppercase tracking-widest">
            {playerState.currentAction || "Walk to"} {playerState.log[playerState.log.length - 1]?.startsWith('>') ? '' : ''}
        </span>
      </div>

      <div className="flex-1 flex border-t border-slate-700">
        
        {/* Verbs Grid (LucasArts Style) */}
        <div className="w-1/2 p-4 bg-[#1a1a1a] grid grid-cols-3 gap-x-2 gap-y-4 content-center">
          {verbs.map(verb => (
            <button
              key={verb}
              onClick={() => onSetAction(verb)}
              className={`text-center text-3xl transition-colors uppercase
                ${playerState.currentAction === verb ? 'text-yellow-400 font-bold scale-105' : 'text-green-600 hover:text-green-400'}`}
            >
              {verb}
            </button>
          ))}
        </div>

        {/* Inventory Grid */}
        <div className="w-1/2 bg-[#222] p-4 border-l border-slate-700">
          <div className="flex justify-between items-end mb-2 border-b border-slate-600 pb-1">
             <span className="text-slate-400 uppercase text-sm">Inventory</span>
             <span className="text-slate-500 text-xs">{room?.name}</span>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {playerState.inventory.map((item, i) => (
              <div key={i} className="aspect-square bg-slate-700/50 flex items-center justify-center border border-slate-600 hover:border-white cursor-pointer">
                  {/* Just text for now, could be icons */}
                  <span className="text-xs text-center text-white p-1 leading-none">{item}</span>
              </div>
            ))}
            {/* Empty Slots filler */}
            {[...Array(8)].map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-black/30 border border-slate-800"></div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default RetroInterface;
