/**
 * Late Night Combat Robotics - Background Audio Engine & Sticker SFX
 * Dedicated solely to Kevin MacLeod's "Cipher" (2000s Web / Flash Anthem).
 * 100% self-contained, infinite seamless loop, zero other songs.
 */

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  album: string;
  bpm: number;
  durationSec: number;
  src: string;
}

export const CIPHER_TRACK: TrackInfo = {
  id: 'cipher',
  title: 'Cipher',
  artist: 'Kevin MacLeod',
  album: 'Incompetech (Royalty Free)',
  bpm: 150,
  durationSec: 231, // 3:51
  src: '/music/cipher.mp3',
};

export const TRACKS: TrackInfo[] = [CIPHER_TRACK];
export const TIFFANY_DAY_TRACKS: TrackInfo[] = [CIPHER_TRACK];

class CipherAudioEngine {
  private audioEl: HTMLAudioElement | null = null;
  private isPlaying = false;
  private volume = 0.55;
  private onPlayStateCallbacks: ((isPlaying: boolean) => void)[] = [];
  private onTrackChangeCallbacks: ((track: TrackInfo) => void)[] = [];
  private sfxCtx: AudioContext | null = null;
  private userManuallyPaused = false;
  private unlockCleanups: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedVol = localStorage.getItem('lncr_music_vol');
        if (savedVol !== null) {
          const v = parseInt(savedVol, 10);
          if (!isNaN(v) && v >= 0 && v <= 100) {
            this.volume = v / 100;
          }
        }
      } catch {}
      // Music playback is controlled strictly by 2000s mode toggle (defaults to serious mode)
    }
  }

  private initAudio() {
    if (this.audioEl || typeof window === 'undefined') return;

    // Check for pre-rendered audio element from index.html
    const existing = document.getElementById('lncr-bg-audio') as HTMLAudioElement | null;
    if (existing) {
      this.audioEl = existing;
    } else {
      const srcUrl = typeof window !== 'undefined' ? new URL('music/cipher.mp3', window.location.href).href : '/music/cipher.mp3';
      this.audioEl = new Audio(srcUrl);
      this.audioEl.id = 'lncr-bg-audio';
      try {
        document.body.appendChild(this.audioEl);
      } catch {}
    }

    this.audioEl.crossOrigin = 'anonymous';
    this.audioEl.loop = true; // Loops infinitely!
    this.audioEl.preload = 'auto';
    this.audioEl.autoplay = true;
    // @ts-ignore
    this.audioEl.playsInline = true;
    this.audioEl.volume = this.volume;

    // Determine initial isPlaying state from audio element
    this.isPlaying = !this.audioEl.paused;

    this.audioEl.addEventListener('play', () => {
      this.isPlaying = true;
      this.notifyPlayState();
    });

    this.audioEl.addEventListener('pause', () => {
      // Only set isPlaying = false if user manually paused
      if (this.userManuallyPaused) {
        this.isPlaying = false;
        this.notifyPlayState();
      }
    });

    this.audioEl.addEventListener('ended', () => {
      if (this.audioEl && !this.userManuallyPaused) {
        this.audioEl.currentTime = 0;
        this.audioEl.play().catch(() => {});
      }
    });
  }

  public getTracks(): TrackInfo[] {
    return [CIPHER_TRACK];
  }

  public getCurrentTrack(): TrackInfo {
    return CIPHER_TRACK;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentTimeSec(): number {
    return this.audioEl ? Math.floor(this.audioEl.currentTime) : 0;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioEl) {
      this.audioEl.volume = this.volume;
    }
  }

  public selectTrack(_idOrIdx?: string | number) {
    // Only one track exists: Cipher
    this.notifyTrackChange();
  }

  public nextTrack() {
    if (this.audioEl) {
      this.audioEl.currentTime = 0;
      this.audioEl.play().catch(() => {});
    }
  }

  public prevTrack() {
    if (this.audioEl) {
      this.audioEl.currentTime = 0;
      this.audioEl.play().catch(() => {});
    }
  }

  public async play(): Promise<void> {
    this.userManuallyPaused = false;
    this.initAudio();
    if (!this.audioEl) return;

    this.audioEl.volume = this.volume;

    try {
      this.audioEl.muted = false;
      await this.audioEl.play();
      this.isPlaying = true;
      this.notifyPlayState();
    } catch {
      // Autoplay blocked by browser policy on cold load:
      // Start playback in muted mode so audio stream is active, and unlock on first interaction
      try {
        this.audioEl.muted = true;
        await this.audioEl.play();
        this.isPlaying = true;
        this.notifyPlayState();
      } catch {}
      this.setupInteractionUnlock();
    }
  }

  public pause() {
    this.userManuallyPaused = true;
    this.clearInteractionUnlock();
    if (this.audioEl) {
      this.audioEl.pause();
    }
    this.isPlaying = false;
    this.notifyPlayState();
  }

  private setupInteractionUnlock() {
    if (typeof window === 'undefined') return;
    this.clearInteractionUnlock();

    const unlock = () => {
      if (this.userManuallyPaused) return;
      if (this.audioEl) {
        this.audioEl.muted = false;
        this.audioEl.volume = this.volume;
        if (this.audioEl.paused) {
          this.audioEl.play().catch(() => {});
        }
      }
      this.isPlaying = true;
      this.notifyPlayState();
      this.clearInteractionUnlock();
    };

    const events = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'keydown', 'touchstart', 'touchend', 'scroll', 'wheel'];
    events.forEach((ev) => {
      window.addEventListener(ev, unlock, { once: true, passive: true, capture: true });
      this.unlockCleanups.push(() => window.removeEventListener(ev, unlock, true));
      document.addEventListener(ev, unlock, { once: true, passive: true, capture: true });
      this.unlockCleanups.push(() => document.removeEventListener(ev, unlock, true));
    });
  }

  private clearInteractionUnlock() {
    this.unlockCleanups.forEach((fn) => fn());
    this.unlockCleanups = [];
  }

  public togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play().catch(() => {});
    }
  }

  public getVisualizerData(): number[] {
    return [25, 45, 65, 80, 65, 45, 30, 20];
  }

  private initSfx() {
    if (this.sfxCtx || typeof window === 'undefined') return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      this.sfxCtx = new AudioContextClass();
    }
  }

  /**
   * Synthesizes delightful, juicy Frutiger Aero sound effects for sticker clicks and interactions.
   */
  public playStickerPop(pitch = 1.0, soundType: 'boing' | 'bubble' | 'sparkle' | 'wave' = 'boing') {
    this.initSfx();
    if (!this.sfxCtx) return;
    if (this.sfxCtx.state === 'suspended') {
      this.sfxCtx.resume().catch(() => {});
    }

    const now = this.sfxCtx.currentTime;
    const osc = this.sfxCtx.createOscillator();
    const gain = this.sfxCtx.createGain();

    const vol = Math.max(0.18, this.volume * 0.7);

    if (soundType === 'boing') {
      osc.type = 'sine';
      const baseFreq = 260 * pitch;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.8, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.16);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.32);

      gain.gain.setValueAtTime(vol * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxCtx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (soundType === 'bubble') {
      osc.type = 'triangle';
      const baseFreq = 420 * pitch;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.4, now + 0.1);

      gain.gain.setValueAtTime(vol * 0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (soundType === 'sparkle') {
      osc.type = 'sine';
      const baseFreq = 880 * pitch;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

      gain.gain.setValueAtTime(vol * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxCtx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } else {
      osc.type = 'sawtooth';
      const filter = this.sfxCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200 * pitch, now);
      filter.Q.setValueAtTime(3, now);

      osc.frequency.setValueAtTime(300 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(900 * pitch, now + 0.12);

      gain.gain.setValueAtTime(vol * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxCtx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    }
  }

  private notifyTrackChange() {
    const track = this.getCurrentTrack();
    this.onTrackChangeCallbacks.forEach((cb) => cb(track));
  }

  private notifyPlayState() {
    this.onPlayStateCallbacks.forEach((cb) => cb(this.isPlaying));
  }

  public onTrackChange(cb: (track: TrackInfo) => void): () => void {
    this.onTrackChangeCallbacks.push(cb);
    return () => {
      this.onTrackChangeCallbacks = this.onTrackChangeCallbacks.filter((c) => c !== cb);
    };
  }

  public onPlayStateChange(cb: (isPlaying: boolean) => void): () => void {
    this.onPlayStateCallbacks.push(cb);
    return () => {
      this.onPlayStateCallbacks = this.onPlayStateCallbacks.filter((c) => c !== cb);
    };
  }
}

// Global singleton audio engine instance
export const audioPlayer = new CipherAudioEngine();
