// Inlined in the HTML: the fixed boot counter starts before React or API requests.
(() => {
  /* rising-fill-controller */
  const template = document.getElementById('app-boot-template');
  const loader = template.content.firstElementChild.cloneNode(true);
  const root = document.getElementById('root');
  const rootWasInert = root.inert;
  root.inert = true;
  document.documentElement.dataset.initialLoader = 'nneo-rising-fill';
  loader.dataset.variant = 'nneo-rising-fill';
  loader.dataset.exitDuration = '800';
  document.body.prepend(loader);
  template.remove();
  const visual = createNneoRisingFill(loader, {
    exitMs: 800,
    soundEnabled: false,
    onExited: () => {
      root.inert = rootWasInert;
      loader.remove();
    },
  });
  let ready = false;
  let failed = false;
  const fail = () => {
    if (ready || failed) return;
    failed = true;
    visual.stop();
    root.inert = rootWasInert;
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
  };
  const onProgress = event => {
    if (!ready && !failed && typeof event.detail?.progress === 'number') {
      visual.setProgress(event.detail.progress);
    }
  };
  const onReady = () => {
    ready = true;
    if (!failed) visual.finish();
    root.classList.add('boot-revealed');
    cleanup();
  };
  // This is an error fallback, never a minimum display time or a ready signal.
  const watchdog = window.setTimeout(fail, 30000);
  window.addEventListener('error', onError, true);
  window.addEventListener('unhandledrejection', fail);
  window.addEventListener('app:boot-ready', onReady);
  window.addEventListener('app:boot-progress', onProgress);

})();
