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
    const floorY = Math.max(y, 30);
    
    onMove(x, floorY);
    setClickEffect({ x, y: floorY });
    setTimeout(() => setClickEffect(null), 500);
  };

  // Helper for fake perspective scaling based on Y position (horizon line approx 30%)
  const getScale = (y: number) => {
    const baseScale = 1;
    const perspective = (y - 30) / 70; // 0 at horizon, 1 at bottom
    // Clamp
    const p = Math.max(0.2, Math.min(1, perspective));
    return baseScale * (0.5 + 0.5 * p);
  };

  return (
    <div className="relative w-full h-[60vh] bg-black overflow-hidden select-none cursor-crosshair">
      
      {/* Background Layer */}
      {room.backgroundImageUrl ? (
        <img 
            src={room.backgroundImageUrl} 
            alt="Scene" 
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
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
        return (
            <div
                key={item.id}
                className="absolute transform -translate-x-1/2 -translate-y-full hover:brightness-125 transition-all cursor-pointer z-10 group"
                style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${(item.width || 8) * scale}%`,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onInteractItem(item);
                }}
            >
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full drop-shadow-2xl" />
                ) : (
                    <div className="text-4xl">{item.emoji}</div>
                )}
                {/* Tooltip on Hover */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-green-400 text-xs px-2 py-1 font-mono border border-green-600 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                    {item.name}
                </div>
            </div>
        );
      })}

      {/* Characters */}
      {room.characters.map(char => {
        const scale = getScale(char.y);
        return (
            <div
                key={char.id}
                className="absolute transform -translate-x-1/2 -translate-y-full hover:brightness-110 transition-all cursor-pointer z-20 group"
                style={{
                    left: `${char.x}%`,
                    top: `${char.y}%`,
                    width: `${(char.width || 10) * scale}%`,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onInteractCharacter(char);
                }}
            >
                {char.imageUrl ? (
                    <img src={char.imageUrl} alt={char.name} className="w-full drop-shadow-2xl" />
                ) : (
                    <div className="text-6xl">{char.emoji}</div>
                )}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-yellow-400 text-xs px-2 py-1 font-mono border border-yellow-600 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                    {char.name}
                </div>
            </div>
        );
      })}

      {/* Player Avatar */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-1000 ease-in-out z-30"
        style={{
            left: `${playerState.playerX}%`,
            top: `${playerState.playerY}%`,
            width: `${10 * getScale(playerState.playerY)}%`,
        }}
      >
         {playerState.playerSprite ? (
             <img src={playerState.playerSprite} alt="Player" className="w-full drop-shadow-2xl" />
         ) : (
             <div className="w-10 h-20 bg-green-500 rounded-full opacity-80" />
         )}
         
         {/* Player Speech Bubble area (could be added here) */}
      </div>

    </div>
  );
};

export default AdventureScene;
