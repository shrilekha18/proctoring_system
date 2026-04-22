export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;
  private threshold: number = 5; // Very sensitive for laptop mics
  public lastVolume: number = 0;
  private onVoiceDetected: (volume: number) => void;
  private onData: (data: Uint8Array) => void;

  constructor(
    onVoiceDetected: (volume: number) => void,
    onData: (data: Uint8Array) => void
  ) {
    this.onVoiceDetected = onVoiceDetected;
    this.onData = onData;
  }

  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Standardize AudioContext across browsers
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      if (this.audioContext) {
        this.analyser = this.audioContext.createAnalyser();
        this.microphone = this.audioContext.createMediaStreamSource(stream);
        
        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        
        this.microphone.connect(this.analyser);
        this.monitor();
        console.log('Audio Engine started successfully');
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  }

  private monitor() {
    if (!this.analyser || !this.dataArray) return;

    // Use unknown cast then any for mandatory low-level buffer compatibility
    this.analyser.getByteFrequencyData(this.dataArray as unknown as Uint8Array);
    this.onData(this.dataArray);

    let max = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      if (this.dataArray[i] > max) max = this.dataArray[i];
    }
    
    this.lastVolume = max;
    
    if (max > this.threshold) {
      this.onVoiceDetected(max);
    }

    this.animationId = requestAnimationFrame(() => this.monitor());
  }

  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
    }
  }

  setThreshold(value: number) {
    this.threshold = value;
  }
}
