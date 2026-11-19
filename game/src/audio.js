// Sound, all synthesized with WebAudio — no audio files. Engine hum, two-tone siren,
// gunshot noise, pickup chime, punch thud and a soft bass groove. Everything is guarded:
// audio only starts after a user gesture, and a missing AudioContext never breaks the game.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;
  let musicTimer = 0;
  let musicStep = 0;
  let enabled = true;

  function ensure() {
    if (ctx || !enabled) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch {
      enabled = false;
      return null;
    }
    return ctx;
  }

  /** Call from a user gesture (key/click) so the browser allows sound. */
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function blip(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.2, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(c.currentTime + dur);
    } catch { /* sound is decoration; never break play */ }
  }

  function noise(dur, vol, lowpass) {
    const c = ensure();
    if (!c) return;
    try {
      const len = Math.floor(c.sampleRate * dur);
      const buffer = c.createBuffer(1, len, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const gain = c.createGain();
      gain.gain.value = vol;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    } catch { /* ignore */ }
  }

  function startEngine() {
    const c = ensure();
    if (!c || engineOsc) return;
    try {
      engineOsc = c.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = c.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch { /* ignore */ }
  }

  function startSiren() {
    const c = ensure();
    if (!c || sirenOsc) return;
    try {
      sirenOsc = c.createOscillator();
      sirenOsc.type = 'square';
      sirenOsc.frequency.value = 720;
      sirenGain = c.createGain();
      sirenGain.gain.value = 0.05;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch { /* ignore */ }
  }

  // A tiny bass groove (A minor-ish walk) that ticks along while driving.
  const BASS = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];

  return {
    unlock,
    shot() {
      noise(0.14, 0.5, 2600);
      blip(160, 0.08, 'square', 0.18, 60);
    },
    punch() {
      noise(0.09, 0.35, 500);
    },
    pickup() {
      blip(660, 0.1, 'sine', 0.25);
      setTimeout(() => blip(990, 0.14, 'sine', 0.25), 70);
    },
    cash() {
      blip(880, 0.09, 'triangle', 0.25);
      setTimeout(() => blip(1174, 0.12, 'triangle', 0.25), 80);
    },
    mission() {
      [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.28), i * 110));
    },
    busted() {
      [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.25, 'sawtooth', 0.2), i * 160));
    },
    crash() {
      noise(0.25, 0.4, 700);
    },
    /** Called every frame with the live state: engine pitch, siren wail, music ticks. */
    update(dt, inCar, speed, wanted) {
      if (!ctx) return;
      try {
        if (inCar) {
          startEngine();
          if (engineOsc && engineGain) {
            engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 0.16, ctx.currentTime, 0.05);
            engineGain.gain.setTargetAtTime(0.05 + Math.abs(speed) * 0.00008, ctx.currentTime, 0.1);
          }
        } else if (engineGain) {
          engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        }
        if (wanted > 0) {
          startSiren();
          sirenTimer += dt;
          if (sirenTimer > 0.42) {
            sirenTimer = 0;
            sirenHigh = !sirenHigh;
            if (sirenOsc) sirenOsc.frequency.setTargetAtTime(sirenHigh ? 950 : 720, ctx.currentTime, 0.02);
          }
        } else if (sirenGain) {
          sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
        }
        if (inCar && Math.abs(speed) > 60) {
          musicTimer += dt;
          if (musicTimer > 0.42) {
            musicTimer = 0;
            blip(BASS[musicStep % BASS.length], 0.36, 'triangle', 0.1);
            musicStep += 1;
          }
        }
      } catch { /* ignore */ }
    },
  };
}
