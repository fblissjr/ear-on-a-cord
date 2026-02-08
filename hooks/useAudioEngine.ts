import { useEffect, useRef } from 'react';

interface AudioEngineRef {
  ctx: AudioContext | null;
  masterGain: GainNode | null;
  droneOsc: OscillatorNode | null;
  droneGain: GainNode | null;
  windNode: AudioBufferSourceNode | null;
  windFilter: BiquadFilterNode | null;
  windGain: GainNode | null;
  staticNode: AudioBufferSourceNode | null;
  staticGain: GainNode | null;
  isInitialized: boolean;
}

export const useAudioEngine = () => {
  const audio = useRef<AudioEngineRef>({
    ctx: null,
    masterGain: null,
    droneOsc: null,
    droneGain: null,
    windNode: null,
    windFilter: null,
    windGain: null,
    staticNode: null,
    staticGain: null,
    isInitialized: false,
  });

  const initAudio = () => {
    if (audio.current.isInitialized) return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = 0.6; 

    // 1. THE DRONE (The electrical hum of the cord)
    // We lower the volume here so Lyria (the music) stands out more when active
    const droneOsc = ctx.createOscillator();
    const droneGain = ctx.createGain();
    droneOsc.type = 'sawtooth';
    droneOsc.frequency.value = 55; 
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 120;
    
    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(masterGain);
    droneGain.gain.value = 0.05; // Lowered from 0.1
    droneOsc.start();

    // 2. THE WIND (White noise for movement)
    const bufferSize = ctx.sampleRate * 2; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const windNode = ctx.createBufferSource();
    windNode.buffer = buffer;
    windNode.loop = true;
    
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.Q.value = 1;
    windFilter.frequency.value = 200;

    const windGain = ctx.createGain();
    windGain.gain.value = 0;

    windNode.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windNode.start();

    // 3. THE STATIC (Signal interference)
    // This is the "bad reception" noise.
    const staticNode = ctx.createBufferSource();
    staticNode.buffer = buffer; 
    staticNode.loop = true;
    
    const staticFilter = ctx.createBiquadFilter();
    staticFilter.type = 'highpass';
    staticFilter.frequency.value = 3000;

    const staticGain = ctx.createGain();
    staticGain.gain.value = 0;

    staticNode.connect(staticFilter);
    staticFilter.connect(staticGain);
    staticGain.connect(masterGain);
    staticNode.start();

    audio.current = {
      ...audio.current,
      ctx,
      masterGain,
      droneOsc,
      droneGain,
      windNode,
      windFilter,
      windGain,
      staticNode,
      staticGain,
      isInitialized: true,
    };
  };

  const updateAudio = (velocity: number, signalStrength: number) => {
    if (!audio.current.isInitialized || !audio.current.ctx) return;
    const { droneOsc, droneGain, windFilter, windGain, staticGain, ctx } = audio.current;

    const now = ctx.currentTime;

    // --- PHYSICS MAPPING ---

    // DRONE: Pitch bends with speed
    if (droneOsc && droneGain) {
      droneOsc.frequency.setTargetAtTime(55 + (velocity * 20), now, 0.1);
      // Drone gets quieter when signal is strong (clean reception)
      const droneVol = 0.05 + (velocity * 0.05) - (signalStrength * 0.04);
      droneGain.gain.setTargetAtTime(Math.max(0, droneVol), now, 0.1);
    }

    // WIND: The "Whoosh"
    if (windFilter && windGain) {
      const targetFreq = 200 + (velocity * 4000); 
      const targetGain = Math.min(velocity * 2, 0.3); 
      
      windFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);
      windGain.gain.setTargetAtTime(targetGain, now, 0.1);
    }

    // STATIC: 
    // High static when signal is LOW.
    // Low static when signal is HIGH (Lyria takes over).
    if (staticGain) {
      // Inverse of signal strength
      const interference = Math.max(0, 1 - signalStrength * 1.5);
      // Only audible if we are moving enough to try and tune
      const movementFactor = Math.min(1, velocity * 5); 
      
      const targetStatic = interference * 0.1 * movementFactor;
      staticGain.gain.setTargetAtTime(targetStatic, now, 0.1);
    }
  };

  const playSuccessSound = () => {
    if (!audio.current.ctx) return;
    const ctx = audio.current.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

    osc.connect(gain);
    gain.connect(audio.current.masterGain!);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  };

  const playFailureSound = () => {
    if (!audio.current.ctx) return;
    const ctx = audio.current.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(audio.current.masterGain!);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  return { initAudio, updateAudio, playSuccessSound, playFailureSound };
};
