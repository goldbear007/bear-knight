/** Tiny synth: every sound is generated at runtime so the game ships without audio assets. */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.5;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : this.volume;
  }

  tone({ freq = 440, to = freq, dur = 0.15, type = "square", gain = 0.2, delay = 0 }) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.2, gain = 0.2, filter = 1200, delay = 0 }) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = filter;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp).connect(env).connect(this.master);
    src.start(t0);
  }

  play(name) {
    switch (name) {
      case "swing":
        this.noise({ dur: 0.12, gain: 0.12, filter: 2600 });
        break;
      case "hit":
        this.tone({ freq: 240, to: 90, dur: 0.12, type: "square", gain: 0.16 });
        this.noise({ dur: 0.1, gain: 0.14, filter: 900 });
        break;
      case "heavy":
        this.tone({ freq: 140, to: 60, dur: 0.24, type: "sawtooth", gain: 0.18 });
        break;
      case "hurt":
        this.tone({ freq: 320, to: 110, dur: 0.22, type: "sawtooth", gain: 0.18 });
        break;
      case "jump":
        this.tone({ freq: 340, to: 620, dur: 0.12, type: "triangle", gain: 0.12 });
        break;
      case "dash":
        this.noise({ dur: 0.18, gain: 0.14, filter: 1800 });
        break;
      case "coin":
        this.tone({ freq: 880, to: 1320, dur: 0.1, type: "triangle", gain: 0.12 });
        break;
      case "soul":
        this.tone({ freq: 520, to: 980, dur: 0.22, type: "sine", gain: 0.12 });
        break;
      case "loot":
        this.tone({ freq: 660, to: 990, dur: 0.16, type: "triangle", gain: 0.14 });
        this.tone({ freq: 990, to: 1480, dur: 0.18, type: "sine", gain: 0.1, delay: 0.1 });
        break;
      case "buy":
        this.tone({ freq: 480, to: 720, dur: 0.14, type: "square", gain: 0.12 });
        break;
      case "deny":
        this.tone({ freq: 220, to: 140, dur: 0.18, type: "square", gain: 0.12 });
        break;
      case "levelup":
        [523, 659, 784, 1046].forEach((f, i) =>
          this.tone({ freq: f, to: f, dur: 0.22, type: "triangle", gain: 0.11, delay: i * 0.09 })
        );
        break;
      case "bolt":
        this.tone({ freq: 700, to: 180, dur: 0.3, type: "sine", gain: 0.14 });
        break;
      case "roar":
        this.tone({ freq: 180, to: 55, dur: 0.6, type: "sawtooth", gain: 0.2 });
        this.noise({ dur: 0.5, gain: 0.16, filter: 500 });
        break;
      case "potion":
        this.tone({ freq: 400, to: 900, dur: 0.3, type: "sine", gain: 0.12 });
        break;
      case "death":
        this.tone({ freq: 300, to: 40, dur: 1.0, type: "sawtooth", gain: 0.2 });
        break;
      case "boss":
        this.tone({ freq: 90, to: 40, dur: 1.4, type: "sawtooth", gain: 0.22 });
        break;
      case "portal":
        this.tone({ freq: 200, to: 1200, dur: 0.7, type: "sine", gain: 0.14 });
        break;
      default:
        break;
    }
  }
}

export const Sfx = new AudioEngine();
