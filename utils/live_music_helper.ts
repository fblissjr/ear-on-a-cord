import {
  GoogleGenAI,
  LiveMusicServerMessage,
  LiveMusicSession,
  AudioChunk
} from "@google/genai";
import { decode, decodeAudioData } from "./audio";
import { throttle } from "./throttle";

export type PlaybackState = "stopped" | "playing" | "loading" | "paused";

export class LiveMusicHelper extends EventTarget {
  private session: LiveMusicSession | null = null;
  private sessionPromise: Promise<LiveMusicSession> | null = null;
  
  // Audio Context management
  public readonly audioContext: AudioContext;
  private outputNode: GainNode;
  
  // Scheduling
  private nextStartTime = 0;
  private bufferTime = 0.5; // Low buffer for lower latency perception

  constructor(
    private readonly ai: GoogleGenAI,
    private readonly model: string,
  ) {
    super();
    // Use standard AudioContext
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContext({ sampleRate: 48000 });
    this.outputNode = this.audioContext.createGain();
    this.outputNode.connect(this.audioContext.destination);
    
    // Start silent
    this.outputNode.gain.value = 0;
  }

  /**
   * Connects to the Lyria model
   */
  public async connect(): Promise<void> {
    if (this.session) return;

    this.sessionPromise = this.ai.live.music.connect({
      model: this.model,
      callbacks: {
        onmessage: async (e: LiveMusicServerMessage) => {
          if (e.serverContent?.audioChunks) {
            await this.processAudioChunks(e.serverContent.audioChunks);
          }
        },
        onclose: () => {
           console.log("Lyria stream closed.");
           this.dispatchEvent(new Event("close"));
        },
        onerror: (e: unknown) => {
          console.error("Lyria error", e);
          this.dispatchEvent(new Event("error"));
        },
      },
    });

    this.session = await this.sessionPromise;
  }

  /**
   * Sets the volume (0 to 1)
   */
  public setVolume(val: number) {
    const now = this.audioContext.currentTime;
    // Smooth ramp to prevent clicks
    this.outputNode.gain.setTargetAtTime(val, now, 0.1);
  }

  /**
   * Updates prompts. Throttled to prevent spamming the API.
   */
  public readonly setPrompts = throttle(async (prompts: { text: string; weight: number }[]) => {
    if (!this.session) return;
    try {
      // Ensure we have at least one prompt with weight
      if (prompts.length === 0) return;
      
      await this.session.setWeightedPrompts({
        weightedPrompts: prompts
      });
    } catch (e) {
      console.error("Failed to set prompts", e);
    }
  }, 500);

  public async play() {
    if (!this.session) await this.connect();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    await this.session?.play();
  }

  public pause() {
    this.session?.pause();
  }

  public stop() {
    this.session?.stop();
    // Reset scheduling
    this.nextStartTime = 0;
  }

  private async processAudioChunks(audioChunks: AudioChunk[]) {
    // Decode incoming PCM
    // Lyria sends 48kHz stereo usually
    const rawData = audioChunks[0].data;
    if (!rawData) return;

    const audioBuffer = await decodeAudioData(
      decode(rawData),
      this.audioContext,
      48000,
      2,
    );

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);

    const currentTime = this.audioContext.currentTime;

    // Initial buffering logic
    if (this.nextStartTime === 0 || this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + this.bufferTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }
}
