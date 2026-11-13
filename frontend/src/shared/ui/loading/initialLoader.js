// Inlined by Vite before the application module, so selection precedes first paint.
(() => {
  /* cinematic-controller */
  /* video-controller */
  /* rising-fill-controller */
  let preferences = {};
  try { preferences = JSON.parse(localStorage.getItem('app-startup-preview') || '{}') || {}; } catch { /* Use defaults if storage is unavailable. */ }
  const choices = ['cinematic', 'video', 'video-light', 'nneo-rising-fill'];
  const parameter = new URLSearchParams(location.search).get('loader');
  const requested = parameter === 'brand' ? 'cinematic' : parameter;
  let selected = choices.includes(requested) ? requested
    : choices.includes(preferences.variant) ? preferences.variant : 'video';
  const template = document.getElementById('app-boot-template');
  const loader = template.content.firstElementChild.cloneNode(true);
  const root = document.getElementById('root');
  const rootWasInert = root.inert;
  if (selected === 'nneo-rising-fill') root.inert = true;
  document.documentElement.dataset.initialLoader = selected;
  loader.dataset.variant = selected;
  const delayParameter = new URLSearchParams(location.search).get('loaderDelay');
  const savedDelay = typeof preferences.durationMs === 'number' && Number.isFinite(preferences.durationMs) ? preferences.durationMs : selected === 'nneo-rising-fill' ? 0 : 10000;
  const requestedDelay = delayParameter === null ? savedDelay : Number(delayParameter);
  const previewDelay = Number.isFinite(requestedDelay)
    ? Math.min(20000, Math.max(0, requestedDelay)) : 0;
  if (previewDelay) loader.dataset.previewUntil = String(performance.now() + previewDelay);
  const exitParameter = new URLSearchParams(location.search).get('loaderExit');
  const savedExit = typeof preferences.exitMs === 'number' && Number.isFinite(preferences.exitMs) ? preferences.exitMs : 1400;
  const requestedExit = exitParameter === null ? savedExit : Number(exitParameter);
  const exitDuration = selected !== 'cinematic'
    ? Math.min(3000, Math.max(400, Number.isFinite(requestedExit) ? requestedExit : 1400)) : 800;
  loader.dataset.exitDuration = String(exitDuration);
  loader.style.setProperty('--boot-video-exit-duration', `${exitDuration}ms`);
  document.body.prepend(loader);
  template.remove();
  const createVisual = () => selected === 'nneo-rising-fill' ? createNneoRisingFill(loader, { soundEnabled: new URLSearchParams(location.search).has('loaderSound') ? new URLSearchParams(location.search).get('loaderSound') === '1' : preferences.soundEnabled === true, onExited: () => {
    root.inert = rootWasInert;
    loader.remove();
  } })
    : selected === 'cinematic'
    ? createInitialCinematic(loader, /* cinematic-assets */ [])
    : createInitialVideo(loader, selected === 'video-light' ? /* video-light-asset */ "" : /* video-asset */ "", /* mobile-image-asset */ "");
  let visual = createVisual();

  let ready = false;
  let failed = false;
  const onSettings = event => {
    if (ready || failed || choices.includes(requested) || event.detail?.section !== 'startup') return;
    const preference = event.detail.preference;
    if (!choices.includes(preference?.variant)) return;
    if (JSON.stringify(preferences) === JSON.stringify(preference)) return;
    visual?.stop();
    preferences = preference;
    selected = preference.variant;
    loader.innerHTML = '';
    loader.dataset.variant = selected;
    document.documentElement.dataset.initialLoader = selected;
    root.inert = selected === 'nneo-rising-fill' || rootWasInert;
    const duration = selected === 'cinematic' ? 800 : Math.min(3000, Math.max(400, preference.exitMs));
    loader.dataset.exitDuration = String(duration);
    loader.style.setProperty('--boot-video-exit-duration', `${duration}ms`);
    loader.dataset.previewUntil = String(performance.now() + Math.min(20000, Math.max(0, preference.durationMs)));
    visual = createVisual();
  };
  const fail = () => {
    if (ready || failed) return;
    failed = true;
    visual?.stop();
    if (selected === 'nneo-rising-fill') root.inert = rootWasInert;
    loader.dataset.variant = 'error';
    loader.setAttribute('role', 'alert');
    loader.removeAttribute('aria-label');
    loader.innerHTML = '<div class="boot-recovery"><strong>No se pudo completar el inicio</strong><p>Comprueba tu conexión e intenta nuevamente.</p><button type="button">Reintentar</button></div>';
    loader.querySelector('button').addEventListener('click', () => location.reload());
  };
  const onError = event => {
    // Resource failures relevant to boot only; images need not prevent startup.
    if (event.target === window || event.target instanceof HTMLScriptElement ||
      (event.target instanceof HTMLLinkElement && event.target.hasAttribute('data-app-styles'))) fail();
  };
  const cleanup = () => {
    clearTimeout(watchdog);
    window.removeEventListener('error', onError, true);
    window.removeEventListener('unhandledrejection', fail);
    window.removeEventListener('app:boot-ready', onReady);
    window.removeEventListener('app:boot-progress', onProgress);
    window.removeEventListener('app:loader-settings', onSettings);
  };
  const onProgress = event => {
    if (!ready && !failed && selected === 'nneo-rising-fill' && typeof event.detail?.progress === 'number') {
      visual.setProgress(event.detail.progress);
    }
  };
  const onReady = () => {
    ready = true;
    const remainingPreview = Math.max(0, Number(loader.dataset.previewUntil || 0) - performance.now());
    if (visual && remainingPreview > 0 && !failed) {
      visual.markReady();
      window.setTimeout(() => visual.finish(), remainingPreview);
    } else visual?.finish();
    root.classList.add('boot-revealed');
    cleanup();
  };
  // This is an error fallback, never a minimum display time or a ready signal.
  const watchdog = window.setTimeout(fail, 30000);
  window.addEventListener('error', onError, true);
  window.addEventListener('unhandledrejection', fail);
  window.addEventListener('app:boot-ready', onReady);
  window.addEventListener('app:boot-progress', onProgress);
  window.addEventListener('app:loader-settings', onSettings);

})();
