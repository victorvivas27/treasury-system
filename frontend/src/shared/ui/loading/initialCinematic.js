// Inserted inside the boot controller by Vite; never gates application readiness.
export function createInitialCinematic(loader, assets) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stories = [
    { lines: ['Cada aporte', 'cuenta.'], caption: 'Tesorería y comunidad escolar', detail: 'Cuotas, aportes, ingresos y gastos.' },
    { lines: ['Todo tu curso', 'conectado.'], caption: 'Familias bien organizadas', detail: 'Las personas, los recursos y los momentos compartidos.' },
    { lines: ['Actividades', 'que suman.'], caption: 'Los proyectos del curso', detail: 'Eventos y stands, de la primera venta al cierre.' },
    { lines: ['Tus cuotas,', 'al día.'], caption: 'Cuotas del curso', detail: 'Consulta las cuotas y registra los pagos.' },
    { lines: ['Cada ingreso,', 'registrado.'], caption: 'Movimientos de tesorería', detail: 'Organiza los ingresos y egresos del curso.' },
    { lines: ['Tus gastos,', 'en orden.'], caption: 'Control de egresos', detail: 'Registra los gastos y revisa los movimientos.' },
    { lines: ['Familias', 'organizadas.'], caption: 'Comunidad escolar', detail: 'Vincula alumnos con sus apoderados y familias.' },
    { lines: ['Tus eventos,', 'en marcha.'], caption: 'Eventos escolares', detail: 'Administra gastos, recaudación y liquidación.' },
    { lines: ['Cada venta', 'suma.'], caption: 'Stands del curso', detail: 'Gestiona productos, ventas y cierres de stands.' },
    { lines: ['Las cuentas,', 'más claras.'], caption: 'Resumen y reportes', detail: 'Consulta el resumen de tesorería y sus reportes.' },
  ];
  for (let index = stories.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [stories[index], stories[randomIndex]] = [stories[randomIndex], stories[index]];
  }
  let storyIndex = 0;
  // Show every community icon once before looping; exclude the two login images.
  const playlist = assets.filter(asset => asset.artwork === 'community');
  for (let index = playlist.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [playlist[index], playlist[randomIndex]] = [playlist[randomIndex], playlist[index]];
  }
  const firstStory = stories[storyIndex];
  const title = story => story.lines.map((line, lineIndex) =>
    `<span class="cinematic-line">${line.split(' ').map((word, index) =>
      `<span class="cinematic-word" style="--word-delay:${(lineIndex * 2 + index) * 65}ms">${word}</span>`).join(' ')}</span>`).join('');
  loader.innerHTML = `<div class="cinematic-visual" aria-hidden="true"><div class="cinematic-parallax">${playlist.map((asset, index) =>
    `<div class="cinematic-scene ${index === 0 ? 'is-active' : ''}" data-artwork="${asset.artwork}"><img alt="" decoding="async" fetchpriority="low" /></div>`).join('')}</div></div>
    <div class="cinematic-shade" aria-hidden="true"></div>
    <div class="cinematic-frame" aria-hidden="true">
      <header class="cinematic-masthead"><span>Tesorería Escolar</span><span>Tu comunidad. Tus proyectos.</span></header>
      <div class="cinematic-copy"><p class="cinematic-eyebrow">${firstStory.caption}</p><div class="cinematic-title">${title(firstStory)}</div><p class="cinematic-detail">${firstStory.detail}</p></div>
      <footer class="cinematic-footer"><div class="cinematic-status"><span class="cinematic-status-label">Abriendo tu espacio</span></div></footer>
    </div>`;
  const scenes = [...loader.querySelectorAll('.cinematic-scene')];
  const firstImage = scenes[0].querySelector('img');
  firstImage.src = playlist[0].src;
  const copy = loader.querySelector('.cinematic-copy');
  const status = loader.querySelector('.cinematic-status-label');
  let stopped = false;
  let activeScene = 0;
  let sceneTimer;
  let copyTimer;
  let stage = 1;
  const setStage = (next, label) => {
    if (next <= stage) return;
    stage = next;
    status.textContent = label;
    loader.dataset.stage = String(next);
  };
  loader.dataset.stage = '1';
  const stylesReady = () => {
    if (!document.querySelector('link[data-app-styles]') || document.documentElement.dataset.appStyles === 'ready') {
      setStage(2, 'Preparando tu experiencia');
    }
  };
  window.addEventListener('app:styles-ready', stylesReady);
  stylesReady();

  const nextScene = () => {
    if (stopped || motion.matches) return;
    const next = (activeScene + 1) % playlist.length;
    const image = scenes[next].querySelector('img');
    const reveal = () => {
      if (stopped || motion.matches) return;
      scenes[activeScene].classList.remove('is-active');
      scenes[next].classList.add('is-active');
      activeScene = next;
      storyIndex = (storyIndex + 1) % stories.length;
      const story = stories[storyIndex];
      copy.classList.add('is-changing');
      copyTimer = window.setTimeout(() => {
        if (stopped) return;
        copy.innerHTML = `<p class="cinematic-eyebrow">${story.caption}</p><div class="cinematic-title">${title(story)}</div><p class="cinematic-detail">${story.detail}</p>`;
        copy.classList.remove('is-changing');
      }, 550);
    };
    // Only request the next existing artwork if startup is still in progress.
    // A slow or unavailable image never prevents the app from appearing.
    if (image.complete && image.naturalWidth) reveal();
    else {
      image.onload = reveal;
      image.src = playlist[next].src;
    }
    sceneTimer = window.setTimeout(nextScene, 4400);
  };
  const configureMotion = () => {
    clearTimeout(sceneTimer);
    if (stopped || motion.matches) return;
    sceneTimer = window.setTimeout(nextScene, 4400);
  };
  configureMotion();
  motion.addEventListener('change', configureMotion);
  const stop = () => {
    stopped = true;
    clearTimeout(sceneTimer);
    clearTimeout(copyTimer);
    scenes.forEach(scene => { scene.querySelector('img').onload = null; });
    window.removeEventListener('app:styles-ready', stylesReady);
    motion.removeEventListener('change', configureMotion);
  };
  return {
    stop,
    markReady() { setStage(3, 'Tu curso te espera'); },
    finish() {
      setStage(3, 'Tu curso te espera');
      stop();
    },
  };
}
