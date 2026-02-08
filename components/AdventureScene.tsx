import React, { useState, useEffect } from 'react';
import { Room, Item, Character, ActionType, PlayerState } from '../types';

interface AdventureSceneProps {
  room: Room;
  playerState: PlayerState;
  onMove: (x: number, y: number) => void;
  onInteractItem: (item: Item) => void;
  onInteractCharacter: (char: Character) => void;
}

const AdventureScene: React.FC<AdventureSceneProps> = ({ 
  room, 
  playerState, 
  onMove, 
  onInteractItem, 
  onInteractCharacter 
}) => {
  const [clickEffect, setClickEffect] = useState<{x: number, y: number} | null>(null);

  const handleSceneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Only allow walking on the "floor" roughly
    const floorY = Math.max(y, 40);
    
    onMove(x, floorY);
    setClickEffect({ x, y: floorY });
    setTimeout(() => setClickEffect(null), 500);
  };

  // Helper for fake perspective scaling based on Y position
  const getScale = (y: number) => {
    const baseScale = 1.0;
    // Map Y 40-100 to Scale 0.8-1.2
    const range = (y - 40) / 60; 
    const p = Math.max(0, Math.min(1, range));
    return baseScale * (0.9 + 0.3 * p); 
  };

  return (
    <div className="relative w-full h-full bg-[#111] overflow-hidden select-none cursor-crosshair">
      
      {/* Background Layer */}
      {room.backgroundImageUrl ? (
        <img 
            src={room.backgroundImageUrl} 
            alt="Scene" 
            className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-80"
        />
      ) : (
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-600">
            NO SIGNAL
        </div>
      )}
      
      {/* Click Handler Overlay */}
      <div 
        className="absolute inset-0 z-0" 
        onClick={handleSceneClick}
      />

      {/* Click Feedback */}
      {clickEffect && (
        <div 
            className="absolute w-4 h-4 border-2 border-white rounded-full animate-ping pointer-events-none z-10"
            style={{ 
                left: `${clickEffect.x}%`, 
                top: `${clickEffect.y}%`,
                transform: 'translate(-50%, -50%)' 
            }}
        />
      )}

      {/* Items */}
      {room.items.filter(i => !i.isTaken).map(item => {
        const scale = getScale(item.y);
        const width = item.width || 15; // Default bigger width
        return (
            <div
                key={item.id}
                className="absolute transform -translate-x-1/2 -translate-y-[90%] hover:brightness-125 transition-all cursor-pointer z-10 group"
                style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${width * scale}%`,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onInteractItem(item);
                }}
            >
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]" />
                ) : (
                    <div className="text-6xl text-center">{item.emoji}</div>
                )}
                
                {/* Name Tag */}
                <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-green-400 text-sm px-2 py-1 font-mono border border-green-600 whitespace-nowrap z-50">
                    {item.name}
                </div>
            </div>
        );
      })}

      {/* Characters */}
      {room.characters.map(char => {
        const scale = getScale(char.y);
        const width = char.width || 25; // Default bigger width
        return (
            <div
                key={char.id}
                className="absolute transform -translate-x-1/2 -translate-y-[90%] hover:scale-105 transition-transform cursor-pointer z-20 group"
                style={{
                    left: `${char.x}%`,
                    top: `${char.y}%`,
                    width: `${width * scale}%`,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onInteractCharacter(char);
                }}
            >
                {char.imageUrl ? (
                    <img src={char.imageUrl} alt={char.name} className="w-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]" />
                ) : (
                    <div className="text-8xl text-center">{char.emoji}</div>
                )}
                
                <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-yellow-400 text-sm px-2 py-1 font-mono border border-yellow-600 whitespace-nowrap z-50">
                    {char.name}
                </div>
            </div>
        );
      })}

      {/* Player Avatar */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-[90%] transition-all duration-700 ease-out z-30 pointer-events-none"
        style={{
            left: `${playerState.playerX}%`,
            top: `${playerState.playerY}%`,
            width: `${18 * getScale(playerState.playerY)}%`, 
        }}
      >
         {playerState.playerSprite ? (
             <img src={playerState.playerSprite} alt="Player" className="w-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]" />
         ) : (
             <div className="w-20 h-40 bg-green-500 rounded-full opacity-80 border-4 border-black" />
         )}
      </div>

    </div>
  );
};

export default AdventureScene;
