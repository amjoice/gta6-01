// Synthesized sound for Porto Verde — no audio files, everything is WebAudio.
// Engine hum, sirens, punches, pickups, jingles. M toggles mute.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // A looping engine oscillator, quiet until the player drives.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // A siren oscillator, silent until the wanted level rises.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch (e) {
      return false;
    }
  }

  // A short tone with a pitch slide.
  function blip(freqA, freqB, dur, type, vol) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freqA, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), t + dur);
    g.gain.setValueAtTime(vol || 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // A short burst of noise (a thud, a crash).
  function noise(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 900;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
    // Engine pitch follows speed (0..1). Call every frame while driving.
    engine(speed01, on) {
      if (!ctx || muted) return;
      const target = on ? 0.05 + speed01 * 0.11 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.08);
    },
    // Siren wail while wanted. Call every frame with dt.
    siren(wanted, dt) {
      if (!ctx) return;
      if (wanted <= 0 || muted) {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        return;
      }
      sirenGain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.1);
      sirenTimer += dt;
      if (sirenTimer > 0.45) {
        sirenTimer = 0;
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.setTargetAtTime(sirenHigh ? 920 : 640, ctx.currentTime, 0.05);
      }
    },
    punch() { noise(0.12, 0.4, 500); blip(160, 70, 0.1, 'square', 0.15); },
    pickup() { blip(660, 990, 0.18, 'sine', 0.25); },
    door() { noise(0.08, 0.2, 700); blip(220, 140, 0.08, 'triangle', 0.12); },
    crash() { noise(0.25, 0.5, 400); },
    missionDone() {
      blip(523, 523, 0.14, 'triangle', 0.25);
      setTimeout(() => blip(659, 659, 0.14, 'triangle', 0.25), 130);
      setTimeout(() => blip(784, 784, 0.3, 'triangle', 0.28), 260);
    },
    busted() { blip(392, 196, 0.5, 'sawtooth', 0.2); },
    click() { blip(880, 660, 0.06, 'sine', 0.15); },
  };
}
