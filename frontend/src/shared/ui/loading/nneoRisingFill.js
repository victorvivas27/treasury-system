// Shared by the pre-React boot script and the existing React page transition.
export function createNneoRisingFill(loader, options = {}) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const clipId = `nneo-digits-${Math.random().toString(36).slice(2)}`;
  const exitMs = Math.min(3000, Math.max(400, options.exitMs || Number(loader.dataset.exitDuration) || 800));
  loader.style.setProperty('--nneo-opening-duration', `${exitMs}ms`);
  loader.dataset.risingStage = 'loading';
  loader.innerHTML = `<div class="nneo-rising-panel nneo-rising-panel--left"></div>
    <div class="nneo-rising-panel nneo-rising-panel--right"></div>
    <div class="nneo-rising-content">
      <div class="nneo-rising-masthead"><span>TESORERÍA ESCOLAR</span></div>
      <div class="nneo-rising-counter">
        <svg viewBox="0 0 1080 430" aria-hidden="true" focusable="false">
          <defs><clipPath id="${clipId}"><text class="nneo-rising-digit nneo-rising-mask" x="430" y="350" text-anchor="middle">000</text></clipPath>
            <linearGradient id="${clipId}-shine" x1="0" y1="0" x2="0" y2="1"><stop class="nneo-rising-shine-start" offset="0"/><stop class="nneo-rising-shine-end" offset="1"/></linearGradient></defs>
          <text class="nneo-rising-digit nneo-rising-outline" x="430" y="350" text-anchor="middle">000</text>
          <rect class="nneo-rising-fill" x="0" width="1000" y="350" height="0" clip-path="url(#${clipId})" />
          <rect class="nneo-rising-shine" x="0" width="1000" y="350" height="0" fill="url(#${clipId}-shine)" clip-path="url(#${clipId})" />
          <g class="nneo-rising-indicator"><path d="M898 0H834M845 -10L834 0L845 10" />
            <text x="916" y="4">LOADING</text></g>
        </svg>
        <div class="nneo-rising-messages" aria-live="polite" aria-atomic="true">
          <span>INICIANDO</span><span>INGRESANDO A TESORERÍA</span><span>PREPARANDO TU ESPACIO</span><span>TESORERÍA LISTA</span>
        </div>
      </div>
      <div class="nneo-rising-finale" aria-hidden="true"><strong>TESORERÍA</strong><span>ESCOLAR</span></div>
      <div class="nneo-rising-footer">UN CURSO. UN ESPACIO. TODO EN ORDEN.</div>
    </div>`;
  const digits = loader.querySelectorAll('.nneo-rising-digit');
  const fill = loader.querySelector('.nneo-rising-fill');
  const shine = loader.querySelector('.nneo-rising-shine');
  const indicator = loader.querySelector('.nneo-rising-indicator');
  const messages = [...loader.querySelectorAll('.nneo-rising-messages span')];
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context) context.font = '900 360px Arial';
  let frame = 0;
  let stopped = false;
  let finishing = false;
  let measured = false;
  let progress = 0;
  let lastStage = -1;
  let completionStarted = 0;
  let completionFrom = 0;
  let completionDuration = 240;
  let lastTick;
  let elapsed = 0;
  const timers = new Set();
  let audio;
  const prepareAudio = () => {
    if (!options.soundEnabled || stopped) return;
    try {
      if (!audio) audio = new window.AudioContext();
      if (audio.state === 'suspended') void audio.resume().catch(() => {});
    } catch { /* Audio is optional and must never delay the app. */ }
  };
  const playOpeningSound = () => {
    if (!options.soundEnabled || document.hidden) return;
    try {
      if (!audio) audio = new window.AudioContext();
      // Skip blocked autoplay rather than playing a delayed sound after opening.
      if (audio.state !== 'running') return;
      const start = audio.currentTime;
      [523.25, 783.99].forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const at = start + index * .065;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(.035, at + .025);
        gain.gain.exponentialRampToValueAtTime(.0001, at + .26);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(at);
        oscillator.stop(at + .28);
      });
    } catch { /* Continue silently on unsupported or unavailable audio devices. */ }
  };
  if (options.soundEnabled) {
    window.addEventListener('pointerdown', prepareAudio, { once: true });
    window.addEventListener('keydown', prepareAudio, { once: true });
  }
  const later = (callback, delay) => {
    const timer = window.setTimeout(() => { timers.delete(timer); if (!stopped) callback(); }, delay);
    timers.add(timer);
  };
  const paint = value => {
    progress = Math.max(0, Math.min(finishing ? 100 : 99, value));
    const percent = Math.floor(progress);
    const counter = String(percent).padStart(3, '0');
    digits.forEach(digit => { digit.textContent = counter; });
    const metrics = context?.measureText(counter);
    const ascent = metrics?.actualBoundingBoxAscent || 260;
    const descent = metrics?.actualBoundingBoxDescent || 5;
    const height = ascent + descent;
    const y = 350 + descent - height * progress / 100;
    fill.setAttribute('y', String(y));
    fill.setAttribute('height', String(height * progress / 100));
    shine.setAttribute('y', String(y));
    shine.setAttribute('height', String(Math.min(18, height * progress / 100)));
    indicator.setAttribute('transform', `translate(0 ${y})`);
    loader.dataset.progress = String(percent);
    const stage = percent < 30 ? 0 : percent < 70 ? 1 : percent < 100 ? 2 : 3;
    if (stage !== lastStage) {
      messages.forEach((message, index) => {
        message.classList.toggle('is-current', index === stage);
        message.setAttribute('aria-hidden', String(index !== stage));
      });
      loader.setAttribute('aria-label', messages[stage].textContent);
      lastStage = stage;
    }
  };
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    motion.removeEventListener('change', onMotionChange);
    window.removeEventListener('pointerdown', prepareAudio);
    window.removeEventListener('keydown', prepareAudio);
    if (audio && audio.state !== 'closed') void audio.close().catch(() => {});
  };
  const exit = () => {
    stop();
    if (options.onExited) options.onExited();
    else loader.remove();
  };
  const reveal = () => {
    loader.dataset.risingStage = 'complete';
    if (motion.matches) { exit(); return; }
    // Keep the fully filled 100 visible before the depth entrance and split.
    later(() => {
      loader.dataset.risingStage = 'retiring';
      later(() => {
        loader.dataset.risingStage = 'ready';
        loader.querySelector('.nneo-rising-finale').setAttribute('aria-hidden', 'false');
        loader.setAttribute('aria-label', 'TESORERÍA ESCOLAR');
        later(() => {
          loader.dataset.risingStage = 'opening';
          playOpeningSound();
          later(exit, exitMs);
        }, 600);
      }, 180);
    }, 180);
  };
  const tick = now => {
    frame = 0;
    if (stopped) return;
    if (lastTick !== undefined) elapsed += Math.min(64, now - lastTick);
    lastTick = now;
    if (finishing) {
      if (!completionStarted) completionStarted = now;
      const fraction = Math.min(1, (now - completionStarted) / completionDuration);
      paint(completionFrom + (100 - completionFrom) * fraction);
      if (fraction === 1) { reveal(); return; }
    } else if (!measured && !motion.matches) {
      // Spread estimated progress across the load instead of racing to the end.
      // Reserve the last stretch for readiness, so 99 never becomes a waiting state.
      const next = 94 * (1 - Math.exp(-elapsed / 6500));
      paint(next > 93.99 ? 94 : next);
    }
    if (!finishing && (measured || motion.matches || progress >= 94)) return;
    frame = requestAnimationFrame(tick);
  };
  function onMotionChange() {
    if (motion.matches && finishing) exit();
    else if (!motion.matches && !stopped && !frame) frame = requestAnimationFrame(tick);
  }
  motion.addEventListener('change', onMotionChange);
  paint(0);
  frame = requestAnimationFrame(tick);
  return {
    markReady() { /* Readiness is confirmed by the existing owner before finish. */ },
    setProgress(value) {
      if (stopped || finishing || !Number.isFinite(value)) return;
      // Real progress can reach 99, but only finish is allowed to render 100.
      const next = Math.min(99, Math.max(0, value));
      paint(measured ? Math.max(progress, next) : next);
      measured = true;
    },
    stop,
    finish() {
      if (stopped || finishing) return;
      finishing = true;
      completionFrom = progress;
      // A quick boot still gets a readable count; a nearly complete load exits promptly.
      completionDuration = Math.max(240, (100 - completionFrom) * 10);
      if (motion.matches) { paint(100); exit(); }
      else if (!frame) frame = requestAnimationFrame(tick);
    },
  };
}
