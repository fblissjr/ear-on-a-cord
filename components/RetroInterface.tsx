import React from 'react';
import { ActionType, PlayerState, Room } from '../types';

interface RetroInterfaceProps {
  room: Room | null;
  playerState: PlayerState;
  onSetAction: (action: ActionType) => void;
  onNextLevel: () => void;
  isGenerating: boolean;
}

const RetroInterface: React.FC<RetroInterfaceProps> = ({ 
  room, 
  playerState, 
  onSetAction, 
  onNextLevel,
  isGenerating
}) => {
  const verbs: ActionType[] = ['LOOK', 'LISTEN', 'TALK', 'TAKE', 'MOVE'];

  return (
    <div className="flex flex-col h-[40vh] bg-slate-900 border-t-4 border-slate-600 font-mono text-sm md:text-base">
      
      {/* Log / Description Area */}
      <div className="flex-1 p-4 overflow-y-auto font-bold text-green-400 space-y-2 font-['VT323'] text-xl">
        {playerState.log.map((line, i) => (
          <p key={i} className="leading-tight animate-fade-in">
            {line.startsWith('>') ? <span className="text-slate-500 mr-2">{line}</span> : line}
            {line.startsWith('"') ? <span className="text-yellow-200">{line}</span> : null}
          </p>
        ))}
        {isGenerating && <p className="animate-pulse text-blue-400">...Incoming Transmission...</p>}
        <div id="log-end" />
      </div>

      {/* Control Panel */}
      <div className="h-1/3 bg-slate-800 border-t border-slate-600 flex">
        
        {/* Verbs */}
        <div className="w-1/3 grid grid-cols-2 lg:grid-cols-3 gap-1 p-2 border-r border-slate-600">
          {verbs.map(verb => (
            <button
              key={verb}
              onClick={() => onSetAction(verb)}
              className={`text-center py-2 hover:bg-green-900/50 transition-colors uppercase font-bold tracking-widest text-xs md:text-sm border border-transparent hover:border-green-800
                ${playerState.currentAction === verb ? 'bg-green-800 text-white border-green-600' : 'text-slate-400'}`}
            >
              {verb}
            </button>
          ))}
        </div>

        {/* Inventory */}
        <div className="w-1/3 p-2 border-r border-slate-600 flex flex-col">
          <span className="text-xs text-slate-500 uppercase mb-1 tracking-widest">Inventory</span>
          <div className="flex flex-wrap gap-2 content-start">
            {playerState.inventory.length === 0 && <span className="text-slate-600 italic">Empty</span>}
            {playerState.inventory.map((item, i) => (
              <span key={i} className="bg-slate-700 px-2 py-1 rounded text-xs border border-slate-500">{item}</span>
            ))}
          </div>
        </div>

        {/* Room Status */}
        <div className="w-1/3 p-2 flex flex-col justify-between bg-black/20">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-widest">Location</span>
            <div className="text-white font-bold truncate text-lg font-['VT323']">{room?.name || 'Unknown'}</div>
          </div>
          
          <div className="text-[10px] text-slate-600 font-mono">
            EAR-OS v1.02
            <button 
              onClick={onNextLevel}
              className="ml-2 hover:text-red-400 uppercase"
            >
              [Skip]
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RetroInterface;
