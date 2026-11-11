import { useEffect, useRef, useState } from 'react';
import { homeCourseCache } from '../hooks/homeCourseCache';
import { publicImages } from '@/shared/assets/publicImages';
import { FiArrowUpRight, FiCamera, FiHeart, FiUsers } from 'react-icons/fi';
import '../style/HomeWelcome.css';
import '../style/HomeWelcomeDesktop.css';

export function HomeWelcome({ onReady, animateReady = true }: { onReady?: () => void; animateReady?: boolean }) {
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [course, setCourse] = useState(() => homeCourseCache.peek() ?? '');
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= .18);
    }, { threshold: [0, .18], rootMargin: '0px 0px -5% 0px' });
    if (section.current) observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    let changed = false;
    const update = (event: Event) => {
      const value = (event as CustomEvent<string | { course: string; schoolYear: number }>).detail;
      if (!value) return;
      changed = true;
      setCourse(typeof value === 'string' ? value : value.course);
    };
    window.addEventListener('managed-course-changed', update);
    void homeCourseCache.load().then(course => {
      if (active && !changed) setCourse(course);
    }).catch(() => undefined).finally(() => { if (active) onReady?.(); });
    return () => { active = false; window.removeEventListener('managed-course-changed', update); };
  }, [onReady]);

  return <section ref={section} className={`home-welcome${visible && animateReady ? ' is-in-view' : ''}`} aria-labelledby="home-welcome-title">
    <img className="home-welcome__watermark" src={publicImages.communityTree} alt="" aria-hidden="true" />
    <div className="home-welcome__identity">
      <div>
        <strong>{course ? `Curso ${course.replace(/^Curso\s+/i, '').trim()}` : 'Familias del curso'}</strong>
      </div>
    </div>
    <div className="home-welcome__message">
      <span className="home-welcome__eyebrow">Nuestro punto de encuentro</span>
      <h1 id="home-welcome-title">Cada familia <em>hace la diferencia.</em></h1>
      <p>Este es nuestro punto de encuentro para acompañar a nuestros niños, compartir y construir juntos.</p>
    </div>
    <nav className="home-welcome__explore" aria-label="Explorar nuestra comunidad">
      <a href="#sobre-nosotros"><FiHeart aria-hidden="true" /><span>Lo que nos mueve</span><FiArrowUpRight aria-hidden="true" /></a>
      <a href="#fotos-del-curso"><FiCamera aria-hidden="true" /><span>Nuestros momentos</span><FiArrowUpRight aria-hidden="true" /></a>
      <a href="#directiva"><FiUsers aria-hidden="true" /><span>La directiva</span><FiArrowUpRight aria-hidden="true" /></a>
    </nav>
  </section>;
}
