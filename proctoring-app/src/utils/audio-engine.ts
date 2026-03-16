export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;
  private threshold: number = 30; // Decibel threshold for voice detection
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
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      this.microphone.connect(this.analyser);
      this.monitor();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  }

  private monitor() {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    this.onData(this.dataArray as Uint8Array);

    const average = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
    
    if (average > this.threshold) {
      this.onVoiceDetected(average);
    }

    this.animationId = requestAnimationFrame(() => this.monitor());
  }

  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.audioContext) this.audioContext.close();
  }

  setThreshold(value: number) {
    this.threshold = value;
  }
}
