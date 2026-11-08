// Inlined only in development. Decorative media never gates the ready signal.
export function createInitialVideo(loader, source, mobileSource, icons) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 600px), (max-width: 900px) and (max-height: 500px)');
  loader.innerHTML = '<div class="boot-video-fallback" aria-hidden="true"></div><img class="boot-mobile-artwork" alt="" decoding="async" aria-hidden="true" /><video class="boot-video" muted playsinline loop preload="none" disablepictureinpicture aria-hidden="true"></video>';
  const artwork = loader.querySelector('.boot-mobile-artwork');
  artwork.fetchPriority = 'high';
  const video = loader.querySelector('video');
  const lightReveal = loader.dataset.variant === 'video-light';
  const stories = [
    ['Cada aporte', 'cuenta.'],
    ['Todo tu curso', 'conectado.'],
    ['Actividades', 'que suman.'],
  ];
  const entrances = ['sides', 'reverse-sides', 'drop', 'rise', 'pop', 'flip', 'swing', 'diagonal', 'unfold', 'tilt'];
  const renderTitle = (lines, entrance = 0) => lines.map((line, lineIndex) =>
    `<span class="cinematic-line video-title-line" data-entrance="${lightReveal ? 'light' : entrances[entrance]}" style="--line-delay:${lineIndex * 150}ms">${line.split(' ').map((word, index) =>
      `<span class="cinematic-word" style="--word-delay:${(lineIndex * 3 + index) * (lightReveal ? 180 : 65)}ms">${word}</span>`).join(' ')}</span>`).join('');
  loader.insertAdjacentHTML('beforeend', `<div class="boot-video-shade" aria-hidden="true"></div><div class="cinematic-frame boot-video-title-frame" aria-hidden="true"><header class="cinematic-masthead"><span>Tesorería Escolar</span><span>Tu comunidad. Tus proyectos.</span></header><div class="cinematic-copy"><p class="cinematic-eyebrow">Tesorería y comunidad escolar</p><div class="cinematic-title">${renderTitle(stories[0])}</div></div></div>`);
  const copy = loader.querySelector('.cinematic-copy');
  const title = loader.querySelector('.cinematic-title');
  loader.querySelector('.boot-video-title-frame').insertAdjacentHTML('beforeend', '<div class="boot-mobile-atmosphere"><span></span><span></span><span></span></div><footer class="boot-mobile-footer"><p class="boot-mobile-description">Unimos familias, organizamos aportes<br>y hacemos crecer los proyectos del curso.</p><div class="boot-mobile-topics"><span>Aportes</span><span>Comunidad</span><span>Proyectos</span></div><div class="boot-mobile-status"><span class="boot-mobile-pulse"></span><span class="boot-mobile-status-label">Abriendo tu espacio</span><span class="boot-mobile-dots"><i></i><i></i><i></i></span></div><span class="boot-mobile-signature">Juntos, cada idea llega más lejos.</span></footer>');
  const status = loader.querySelector('.boot-mobile-status-label');
  loader.querySelectorAll('.boot-mobile-topics > span').forEach((topic, index) => {
    if (!icons[index]) return;
    const icon = document.createElement('img');
    icon.alt = '';
    icon.decoding = 'async';
    icon.fetchPriority = 'low';
    icon.addEventListener('load', () => topic.classList.add('is-icon-ready'), { once: true });
    icon.src = icons[index];
    topic.prepend(icon);
  });
  let storyIndex = 0;
  let entranceIndex = 0;
  let storyTimer;
  let titleTimer;
  video.muted = true;
  video.defaultMuted = true;
  let stopped = false;
  const nextTitle = () => {
    if (stopped || motion.matches) return;
    copy.classList.add('is-changing');
    titleTimer = window.setTimeout(() => {
      if (stopped) return;
      storyIndex = (storyIndex + 1) % stories.length;
      entranceIndex = (entranceIndex + 1) % entrances.length;
      title.innerHTML = renderTitle(stories[storyIndex], entranceIndex);
      copy.classList.remove('is-changing');
    }, 550);
    storyTimer = window.setTimeout(nextTitle, 4400);
  };
  const fallback = () => loader.classList.remove('is-playing');
  const playing = () => { if (!stopped && !motion.matches && !mobile.matches) loader.classList.add('is-playing'); };
  const updateMotion = () => {
    if (stopped) return;
    clearTimeout(storyTimer);
    clearTimeout(titleTimer);
    copy.classList.remove('is-changing');
    if (mobile.matches) {
      if (!artwork.getAttribute('src')) artwork.src = mobileSource;
      video.pause();
      if (video.hasAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
      fallback();
      if (!motion.matches) storyTimer = window.setTimeout(nextTitle, 4400);
      return;
    }
    if (motion.matches) {
      video.pause();
      fallback();
      return;
    }
    if (!video.getAttribute('src')) video.src = source;
    video.autoplay = true;
    void video.play().catch(fallback);
    storyTimer = window.setTimeout(nextTitle, 4400);
  };
  video.addEventListener('playing', playing);
  video.addEventListener('error', fallback);
  motion.addEventListener('change', updateMotion);
  mobile.addEventListener('change', updateMotion);
  updateMotion();
  const pause = () => {
    stopped = true;
    clearTimeout(storyTimer);
    clearTimeout(titleTimer);
    video.pause();
    video.removeEventListener('playing', playing);
    video.removeEventListener('error', fallback);
    motion.removeEventListener('change', updateMotion);
    mobile.removeEventListener('change', updateMotion);
  };
  const release = () => {
    video.removeAttribute('src');
    video.load();
  };
  return {
    markReady() { status.textContent = 'Tu curso te espera'; },
    stop() { pause(); release(); },
    finish() {
      pause();
      // Keep the last frame intact throughout the gradual dissolve into the app.
      window.setTimeout(release, (Number(loader.dataset.exitDuration) || 1400) + 200);
    },
  };
}
