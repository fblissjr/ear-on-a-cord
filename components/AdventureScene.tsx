import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrthographicCamera, useCursor, Text, Image as DreiImage } from '@react-three/drei';
import * as THREE from 'three';
import { Room, Item, Character, ActionType } from '../types';

interface AdventureSceneProps {
  room: Room;
  playerSprite?: string;
  currentAction: ActionType;
  onInteractItem: (item: Item) => void;
  onInteractCharacter: (char: Character) => void;
}

// -- 3D Components --

const Floor: React.FC<{ 
  color: string; 
  onMoveTo: (point: THREE.Vector3) => void 
}> = ({ color, onMoveTo }) => {
  const [hovered, setHover] = useState(false);
  useCursor(hovered, 'crosshair', 'auto');

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.5, 0]} 
      receiveShadow
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onMoveTo(e.point);
      }}
    >
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.2} />
      {/* Grid overlay for retro feel */}
      <gridHelper args={[30, 30, 0x444444, 0x222222]} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]} />
    </mesh>
  );
};

const Player: React.FC<{ 
  targetPosition: THREE.Vector3 | null; 
  spriteUrl?: string;
  onReachTarget?: () => void 
}> = ({ targetPosition, spriteUrl, onReachTarget }) => {
  const ref = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector3(0, 0, 0));
  const SPEED = 0.15;
  const [facingRight, setFacingRight] = useState(true);

  useFrame(() => {
    if (ref.current && targetPosition) {
      const dist = position.current.distanceTo(targetPosition);
      
      if (dist > 0.1) {
        // Move towards target
        const dir = new THREE.Vector3().subVectors(targetPosition, position.current).normalize();
        position.current.add(dir.multiplyScalar(SPEED));
        ref.current.position.copy(position.current);
        
        // Sprite flip logic
        if (dir.x > 0.1) setFacingRight(true);
        if (dir.x < -0.1) setFacingRight(false);
      } else {
        if (onReachTarget) {
          onReachTarget();
        }
      }
    }
  });

  return (
    <group ref={ref}>
      {spriteUrl ? (
         <DreiImage 
            url={spriteUrl} 
            transparent 
            scale={[3, 3]} 
            position={[0, 1.5, 0]}
            // Simple flip effect
            rotation={[0, facingRight ? 0 : Math.PI, 0]}
            color="#ffffff"
         />
      ) : (
        <group position={[0, 1, 0]}>
             <capsuleGeometry args={[0.4, 1, 4, 8]} />
             <meshStandardMaterial color="#3b82f6" />
        </group>
      )}
      
      {/* Shadow Blob */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.6, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};

// The Ear "Drone" Companion
const EarDrone: React.FC<{ playerPos: THREE.Vector3, active: boolean }> = ({ playerPos, active }) => {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.getElapsedTime();
      const floatY = Math.sin(time * 2) * 0.2 + 2.5;
      
      const targetX = playerPos.x - 1;
      const targetZ = playerPos.z - 1;
      
      ref.current.position.x += (targetX - ref.current.position.x) * 0.05;
      ref.current.position.y += (floatY - ref.current.position.y) * 0.1;
      ref.current.position.z += (targetZ - ref.current.position.z) * 0.05;
      
      ref.current.lookAt(playerPos);
    }
  });

  return (
    <group ref={ref}>
      <Text 
        fontSize={1.5} 
        color={active ? "#00ff00" : "#aaaaaa"}
        anchorX="center" 
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        👂
      </Text>
      {active && (
         <pointLight distance={3} intensity={2} color="#00ff00" />
      )}
    </group>
  );
};

const BillboardSprite: React.FC<{
  position: [number, number, number];
  emoji: string;
  imageUrl?: string;
  label: string;
  onClick: () => void;
  highlight: boolean;
}> = ({ position, emoji, imageUrl, label, onClick, highlight }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  useCursor(hovered, 'pointer', 'auto');

  useFrame(({ camera }) => {
    if (ref.current) {
      ref.current.lookAt(camera.position);
    }
  });

  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {imageUrl ? (
        <DreiImage 
            url={imageUrl} 
            transparent
            scale={[3, 3]} 
            position={[0, 1.5, 0]}
            color={highlight || hovered ? "#aaffaa" : "#ffffff"}
        />
      ) : (
        <Text
            fontSize={2}
            anchorX="center"
            anchorY="bottom"
            position={[0, 0, 0]}
            outlineWidth={highlight || hovered ? 0.1 : 0}
            outlineColor={highlight ? "#00ff00" : "#ffffff"}
        >
            {emoji}
        </Text>
      )}
      
      {/* Shadow */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.5} />
      </mesh>

      {/* Label (HTML overlay for readability) */}
      {(hovered || highlight) && (
        <Html position={[0, 3, 0]} center>
          <div className="bg-black/80 text-green-400 px-2 py-1 rounded border border-green-600 font-mono text-xs whitespace-nowrap pointer-events-none">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
};

// -- Main Scene Wrapper --

const SceneContent: React.FC<AdventureSceneProps> = ({ 
  room, 
  playerSprite,
  currentAction, 
  onInteractItem, 
  onInteractCharacter 
}) => {
  const [playerTarget, setPlayerTarget] = useState<THREE.Vector3 | null>(null);
  const [pendingInteraction, setPendingInteraction] = useState<(() => void) | null>(null);
  
  const handleMove = (point: THREE.Vector3) => {
    setPlayerTarget(point);
    setPendingInteraction(null);
  };

  const handleInteract = (targetPos: THREE.Vector3, callback: () => void) => {
    setPlayerTarget(targetPos);
    setPendingInteraction(() => callback);
  };

  const mapPercentToWorld = (pctX: number, pctY: number): [number, number, number] => {
    const x = (pctX / 100) * 20 - 10;
    const z = (pctY / 100) * 20 - 10;
    return [x, 0, z];
  };

  return (
    <>
      <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={25} near={-50} far={200} onUpdate={c => c.lookAt(0, 0, 0)} />
      
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 5]} intensity={1} castShadow />
      
      <Player 
        spriteUrl={playerSprite}
        targetPosition={playerTarget} 
        onReachTarget={() => {
          if (pendingInteraction) {
            pendingInteraction();
            setPendingInteraction(null);
          }
        }} 
      />

      <EarDrone 
        playerPos={playerTarget || new THREE.Vector3(0,0,0)} 
        active={currentAction === 'LISTEN'} 
      />

      <Floor color={room.themeColor} onMoveTo={handleMove} />

      {room.items.filter(i => !i.isTaken).map(item => {
        const pos = mapPercentToWorld(item.x, item.y);
        return (
          <BillboardSprite
            key={item.id}
            position={pos}
            emoji={item.emoji}
            imageUrl={item.imageUrl}
            label={item.name}
            highlight={false}
            onClick={() => handleInteract(new THREE.Vector3(...pos), () => onInteractItem(item))}
          />
        );
      })}

      {room.characters.map(char => {
        const pos = mapPercentToWorld(char.x, char.y);
        return (
          <BillboardSprite
            key={char.id}
            position={pos}
            emoji={char.emoji}
            imageUrl={char.imageUrl}
            label={char.name}
            highlight={false}
            onClick={() => handleInteract(new THREE.Vector3(...pos), () => onInteractCharacter(char))}
          />
        );
      })}
    </>
  );
};

const AdventureScene: React.FC<AdventureSceneProps> = (props) => {
  return (
    <div className="w-full h-[60vh] border-b-2 border-slate-700 bg-black">
      <Canvas shadows>
        <SceneContent {...props} />
        <fog attach="fog" args={['#000000', 10, 50]} />
      </Canvas>
      
      {props.currentAction === 'LISTEN' && (
        <div className="absolute top-4 right-4 text-xs font-mono text-blue-400 animate-pulse border border-blue-400 px-2 py-1 bg-black/50 z-40 pointer-events-none">
          [ LISTENING MODE ACTIVE ]
        </div>
      )}
      
      <div className="absolute top-4 left-4 text-xs font-mono text-slate-500 pointer-events-none">
        NAV: CLICK TO MOVE
      </div>
    </div>
  );
};

export default AdventureScene;
