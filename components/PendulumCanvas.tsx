import React, { useRef, useEffect } from 'react';

interface PendulumCanvasProps {
  onVelocityChange: (velocity: number) => void;
  isActive: boolean;
}

const PendulumCanvas: React.FC<PendulumCanvasProps> = ({ onVelocityChange, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const draggingRef = useRef<boolean>(false);
  
  const physics = useRef({
    angle: Math.PI / 6, 
    velocity: 0,
    acceleration: 0,
    length: 300, 
    origin: { x: 0, y: 0 },
    gravity: 0.4, // Slightly lower gravity for "heavy" feel
    damping: 0.992, // Less air resistance for smoother, heavier swing
  });

  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        physics.current.origin = { x: canvas.width / 2, y: -50 }; // Origin slightly off-screen top
        physics.current.length = Math.min(canvas.width, canvas.height) * 0.55;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const animate = () => {
      if (!ctx || !canvas) return;

      const p = physics.current;
      const force = (-1 * p.gravity / p.length) * Math.sin(p.angle);
      p.acceleration = force;
      
      if (draggingRef.current && isActive) {
         const dx = mouse.current.x - p.origin.x;
         const dy = mouse.current.y - p.origin.y;
         const targetAngle = Math.atan2(dx, dy);
         const diff = targetAngle - p.angle;
         p.velocity += diff * 0.08; 
         p.velocity *= 0.92; 
      } else {
         p.velocity += p.acceleration;
         p.velocity *= p.damping; 
      }

      p.angle += p.velocity;
      onVelocityChange(Math.abs(p.velocity));

      // --- RENDERING ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Environment Light (Spotlight effect on background)
      const bobX = p.origin.x + p.length * Math.sin(p.angle);
      const bobY = p.origin.y + p.length * Math.cos(p.angle);
      
      // Dynamic spotlight follows the ear slightly
      const spotX = canvas.width / 2 + (bobX - canvas.width/2) * 0.3;
      const spotY = canvas.height / 2;
      
      const gradient = ctx.createRadialGradient(spotX, spotY, 50, spotX, spotY, canvas.width * 0.8);
      gradient.addColorStop(0, '#1e293b'); // Slate 800 (Center light)
      gradient.addColorStop(1, '#020617'); // Slate 950 (Dark corners)
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cast Shadow on "Wall"
      // We calculate a shadow position assuming light is coming from top-front
      const shadowOffsetX = (bobX - p.origin.x) * 1.2 + p.origin.x;
      const shadowOffsetY = (bobY - p.origin.y) * 1.2 + p.origin.y + 100;
      
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p.origin.x, p.origin.y);
      ctx.lineTo(shadowOffsetX, shadowOffsetY);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 10;
      ctx.filter = 'blur(12px)'; // Soft shadow
      ctx.stroke();
      
      // Ear Shadow Blob
      ctx.translate(shadowOffsetX, shadowOffsetY);
      ctx.rotate(-p.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 60, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- THE CORD (Photorealistic Cable) ---
      // 1. Thick black rubber base
      ctx.beginPath();
      ctx.moveTo(p.origin.x, p.origin.y);
      ctx.lineTo(bobX, bobY);
      ctx.strokeStyle = '#0f172a'; // Slate 900
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 2. Lighter "shine" on one side to simulate cylinder
      ctx.beginPath();
      ctx.moveTo(p.origin.x - 2, p.origin.y);
      ctx.lineTo(bobX - 2, bobY);
      ctx.strokeStyle = '#334155'; // Slate 700 highlight
      ctx.lineWidth = 4;
      ctx.stroke();

      // --- THE HARDWARE (Metal Connector) ---
      ctx.save();
      ctx.translate(bobX, bobY);
      ctx.rotate(-p.angle);
      
      // Draw Connector (Silver/Gold Jack)
      const connectorHeight = 40;
      const connectorWidth = 16;
      
      // Connector Body (Gradient Metallic)
      const grad = ctx.createLinearGradient(-10, 0, 10, 0);
      grad.addColorStop(0, '#475569');
      grad.addColorStop(0.5, '#e2e8f0'); // Shine
      grad.addColorStop(1, '#475569');
      
      ctx.fillStyle = grad;
      ctx.translate(0, -50); // Move up above the ear center
      ctx.fillRect(-connectorWidth/2, -connectorHeight, connectorWidth, connectorHeight);
      
      // Connector Ribs (Black lines)
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-connectorWidth/2, -connectorHeight + 10, connectorWidth, 2);
      ctx.fillRect(-connectorWidth/2, -connectorHeight + 20, connectorWidth, 2);

      // --- THE EAR ---
      // We are at the connection point (top of ear).
      // Let's render the Ear emoji but with high quality.
      
      ctx.font = '120px serif'; // Larger
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // Adjust position so the connector goes "into" the ear top
      ctx.translate(0, 0); 
      
      // We use a "cutout" blend mode or just draw it. 
      // To make it look "photorealistic", we can try to color grade it with a filter
      // Note: filter support in canvas context is good in modern browsers.
      ctx.filter = 'contrast(1.1) sepia(0.2) drop-shadow(0px 5px 10px rgba(0,0,0,0.5))';
      
      // Rotate 90deg so it hangs correctly? 
      // Emoji 👂 is usually upright. If we want "Ear on a Cord", it usually hangs down.
      // Let's rotate it 90 degrees clockwise? No, straight down.
      // 👂 looks like a right ear.
      
      ctx.scale(-1, 1); // Flip to make it a Left ear if needed, or just style choice.
      ctx.fillText('👂', 0, -20);
      
      ctx.restore();

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, onVelocityChange]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    draggingRef.current = true;
    updateMouse(e);
  };

  const handleEnd = () => {
    draggingRef.current = false;
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (draggingRef.current) {
      updateMouse(e);
    }
  };

  const updateMouse = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    mouse.current = { x: clientX, y: clientY };
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing z-0 touch-none"
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseMove={handleMove}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchMove={handleMove}
    />
  );
};

export default PendulumCanvas;
