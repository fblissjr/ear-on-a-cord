import { useRef } from 'react';

export const useAudioEngine = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtx.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx.current = new AudioContext();
    }
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
  };

  const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
    if (!audioCtx.current) initAudio();
    if (!audioCtx.current) return;

    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.current.destination);

    osc.start();
    osc.stop(audioCtx.current.currentTime + duration);
  };

  const playBlip = () => playTone(800, 'square', 0.1, 0.05);
  const playError = () => playTone(150, 'sawtooth', 0.3, 0.1);
  const playSuccess = () => {
    playTone(440, 'sine', 0.1, 0.1);
    setTimeout(() => playTone(880, 'sine', 0.2, 0.1), 100);
  };
  const playScan = () => {
    // Sci-fi scanning sound
    if (!audioCtx.current) initAudio();
    if (!audioCtx.current) return;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, audioCtx.current.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, audioCtx.current.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.05, audioCtx.current.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.current.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.5);
  };

  return { initAudio, playBlip, playError, playSuccess, playScan };
};
