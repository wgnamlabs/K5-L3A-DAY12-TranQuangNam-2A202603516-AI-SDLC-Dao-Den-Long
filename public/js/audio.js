/**
 * audio.js
 * Procedural Web Audio API sound synthesizer & Vietnamese ambient music engine for "Đảo Đèn Lồng".
 * 100% code-synthesized, zero external sound files.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.ambientRunning = false;
    this.currentNight = 1;

    // Ambient nodes
    this.masterGain = null;
    this.ambientGain = null;
    this.windGain = null;
    this.musicGain = null;
    this.tensionGain = null;

    this.windSource = null;
    this.ambientTimer = null;
    this.tensionOsc = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  // ==========================================
  // PROCEDURAL AMBIENT SOUNDSCAPE & MUSIC
  // ==========================================

  startAmbient(night = 1) {
    this.init();
    if (!this.ctx) return;
    this.stopAmbient();
    this.currentNight = night;
    this.ambientRunning = true;

    // Sub-master ambient gain
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // 1. Wind & Cloud Waves (Filtered noise)
    this.startWindSynth();

    // 2. Procedural Vietnamese Pentatonic Music (Sáo Trúc & Đàn Tranh)
    this.startPentatonicMelody(night);

    // 3. Tension Drone (Active when low fuel)
    this.startTensionDrone();
  }

  startWindSynth() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = noiseBuffer;
    this.windSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    // LFO to modulate wind frequency
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

    this.windSource.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.ambientGain);

    this.windSource.start();
  }

  startPentatonicMelody(night) {
    if (!this.ctx) return;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    this.musicGain.connect(this.ambientGain);

    // Vietnamese traditional pentatonic modes
    // Night 1: Hò Ba Lý / Bắc: C4, D4, F4, G4, A4, C5, D5, F5
    // Night 2: Nam / Oán: D4, F4, G4, A4, C5, D5
    // Night 3: Cung Đình / Chuông: G3, C4, D4, G4, A4, C5, D5
    const scales = {
      1: [261.63, 293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 698.46],
      2: [293.66, 349.23, 392.00, 440.00, 523.25, 587.33],
      3: [196.00, 261.63, 293.66, 392.00, 440.00, 523.25, 587.33]
    };
    const scale = scales[night] || scales[1];

    let noteIdx = 0;
    this.ambientTimer = setInterval(() => {
      if (!this.ambientRunning || !this.ctx || this.ctx.state === 'suspended') return;
      const freq = scale[Math.floor(Math.random() * scale.length)];
      this.playFluteNote(freq);
      noteIdx++;
    }, 1800);
  }

  playFluteNote(freq) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Bamboo flute timbre: sine with soft breathing filter
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // Subtle pitch vibrato
    const vib = this.ctx.createOscillator();
    vib.frequency.setValueAtTime(4.5, now);
    const vibGain = this.ctx.createGain();
    vibGain.gain.setValueAtTime(freq * 0.015, now);
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);
    vib.start(now);
    vib.stop(now + 2.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.2, now);

    // Soft attack & long breath decay
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 2.0);
  }

  startTensionDrone() {
    if (!this.ctx) return;
    this.tensionGain = this.ctx.createGain();
    this.tensionGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.tensionGain.connect(this.ambientGain);

    this.tensionOsc = this.ctx.createOscillator();
    this.tensionOsc.type = 'sawtooth';
    this.tensionOsc.frequency.setValueAtTime(65.41, this.ctx.currentTime); // C2

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.tensionOsc.connect(filter);
    filter.connect(this.tensionGain);
    this.tensionOsc.start();
  }

  updateAmbientState(litRatio = 0, hasLowFuel = false, isPaused = false) {
    if (!this.ctx || !this.ambientRunning) return;
    const now = this.ctx.currentTime;

    if (isPaused) {
      if (this.ambientGain) this.ambientGain.gain.setTargetAtTime(0.0, now, 0.05);
      return;
    } else {
      if (this.ambientGain) this.ambientGain.gain.setTargetAtTime(0.5, now, 0.1);
    }

    // Tension drone increases when a lantern is dying for fuel
    if (this.tensionGain) {
      const targetTension = hasLowFuel ? 0.28 : 0.001;
      this.tensionGain.gain.setTargetAtTime(targetTension, now, 0.4);
    }

    // Music gain warms up as island lights up
    if (this.musicGain) {
      const targetMusic = 0.2 + litRatio * 0.18;
      this.musicGain.gain.setTargetAtTime(targetMusic, now, 0.5);
    }
  }

  pauseAmbient() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
    }
  }

  resumeAmbient() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.1);
    }
  }

  stopAmbient() {
    this.ambientRunning = false;
    if (this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.windSource) {
      try { this.windSource.stop(); } catch (e) {}
      this.windSource = null;
    }
    if (this.tensionOsc) {
      try { this.tensionOsc.stop(); } catch (e) {}
      this.tensionOsc = null;
    }
  }

  // ==========================================
  // PROCEDURAL SOUND EFFECTS (SFX)
  // ==========================================

  playMoteChime() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.16); // C6

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  playDepositChime() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.05;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.16, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.28);
    });
  }

  playLanternLit() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Resonant Temple Bell Chime (Chuông đồng ngân vang)
    const bellNotes = [261.63, 392.00, 523.25, 783.99, 1046.5];
    bellNotes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.07;

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 1.4);
    });
  }

  playPulse() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.22);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  playDash() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.18);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  playJump() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playHit() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.32);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  playCountdownTick() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playWon() {
    if (!this.ctx || !this.masterGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const now = this.ctx.currentTime + i * 0.16;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.75);
    });
  }
}

window.soundFx = new SoundEffects();
