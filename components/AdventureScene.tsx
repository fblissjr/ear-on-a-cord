import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrthographicCamera, useCursor, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Room, Item, Character, ActionType } from '../types';

interface AdventureSceneProps {
  room: Room;
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
  onReachTarget?: () => void 
}> = ({ targetPosition, onReachTarget }) => {
  const ref = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector3(0, 0, 0));
  const SPEED = 0.15;

  useFrame(() => {
    if (ref.current && targetPosition) {
      const dist = position.current.distanceTo(targetPosition);
      
      if (dist > 0.1) {
        // Move towards target
        const dir = new THREE.Vector3().subVectors(targetPosition, position.current).normalize();
        position.current.add(dir.multiplyScalar(SPEED));
        ref.current.position.copy(position.current);
        
        // Face target
        ref.current.lookAt(targetPosition.x, position.current.y, targetPosition.z);
      } else {
        // Reached
        if (onReachTarget) {
          onReachTarget();
          // Reset callback to avoid loops if parent doesn't clear target immediately, 
          // but in this architecture, we rely on parent to handle state. 
        }
      }
    }
  });

  return (
    <group ref={ref}>
      {/* Body */}
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.4, 1, 4, 8]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Visor */}
      <mesh position={[0, 1.5, 0.35]}>
        <boxGeometry args={[0.5, 0.2, 0.2]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
      {/* Shadow Blob */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.5} />
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
      // Floating motion
      const floatY = Math.sin(time * 2) * 0.2 + 2.5;
      
      // Follow player with lag
      const targetX = playerPos.x - 1;
      const targetZ = playerPos.z - 1;
      
      ref.current.position.x += (targetX - ref.current.position.x) * 0.05;
      ref.current.position.y += (floatY - ref.current.position.y) * 0.1;
      ref.current.position.z += (targetZ - ref.current.position.z) * 0.05;
      
      // Look at player
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
      {/* Connecting "Cord" is hard to render procedurally between two moving groups in basic R3F without logic, 
          so we imply it with a particles or just let it be wireless/surreal */}
      {active && (
         <pointLight distance={3} intensity={2} color="#00ff00" />
      )}
    </group>
  );
};

const BillboardSprite: React.FC<{
  position: [number, number, number];
  emoji: string;
  label: string;
  onClick: () => void;
  highlight: boolean;
}> = ({ position, emoji, label, onClick, highlight }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  useCursor(hovered, 'pointer', 'auto');

  useFrame(({ camera }) => {
    if (ref.current) {
      // Look at camera but lock Y axis usually, but for sprites facing camera fully:
      ref.current.lookAt(camera.position);
    }
  });

  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* The Sprite */}
      <Text
        fontSize={2}
        anchorX="center"
        anchorY="bottom"
        position={[0, 0, 0]}
        outlineWidth={highlight || hovered ? 0.1 : 0}
        outlineColor={highlight ? "#00ff00" : "#ffffff"}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        {emoji}
      </Text>
      
      {/* Shadow */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.6, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.3} />
      </mesh>

      {/* Label (HTML overlay for readability) */}
      {(hovered || highlight) && (
        <Html position={[0, 2.5, 0]} center>
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
  currentAction, 
  onInteractItem, 
  onInteractCharacter 
}) => {
  const [playerTarget, setPlayerTarget] = useState<THREE.Vector3 | null>(null);
  const [pendingInteraction, setPendingInteraction] = useState<(() => void) | null>(null);
  
  // Track player position for the Ear to follow
  // We can just use the target logic or a ref to the player object. 
  // For simplicity, we assume player starts at 0,0 and moves to playerTarget.
  // Ideally, we'd hoist player position state, but let's just use the target as a proxy for the camera focus/ear
  
  const handleMove = (point: THREE.Vector3) => {
    setPlayerTarget(point);
    setPendingInteraction(null); // Cancel pending if we click floor
  };

  const handleInteract = (targetPos: THREE.Vector3, callback: () => void) => {
    // Move to slightly in front of object
    // Simple logic: Move to object position
    setPlayerTarget(targetPos);
    setPendingInteraction(() => callback);
  };

  const mapPercentToWorld = (pctX: number, pctY: number): [number, number, number] => {
    // Map 0-100 to -10 to 10
    const x = (pctX / 100) * 20 - 10;
    const z = (pctY / 100) * 20 - 10; // Y in 2D is Z in 3D
    return [x, 0, z];
  };

  return (
    <>
      <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={25} near={-50} far={200} onUpdate={c => c.lookAt(0, 0, 0)} />
      
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 5]} intensity={1} castShadow />
      
      <Player 
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

      {/* Items */}
      {room.items.filter(i => !i.isTaken).map(item => {
        const pos = mapPercentToWorld(item.x, item.y);
        return (
          <BillboardSprite
            key={item.id}
            position={pos}
            emoji={item.emoji}
            label={item.name}
            highlight={false}
            onClick={() => handleInteract(new THREE.Vector3(...pos), () => onInteractItem(item))}
          />
        );
      })}

      {/* Characters */}
      {room.characters.map(char => {
        const pos = mapPercentToWorld(char.x, char.y);
        return (
          <BillboardSprite
            key={char.id}
            position={pos}
            emoji={char.emoji}
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
        {/* Render content inside Canvas context */}
        <SceneContent {...props} />
        
        {/* Simple fog for atmosphere */}
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
