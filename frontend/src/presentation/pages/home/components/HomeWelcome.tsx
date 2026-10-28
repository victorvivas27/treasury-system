import { useEffect, useRef, useState } from 'react';
import { TreasuryRepositoryImpl } from '@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl';
import { publicImages } from '@/shared/assets/publicImages';
import '../style/HomeWelcome.css';
import '../style/HomeWelcomeDesktop.css';

const repository = new TreasuryRepositoryImpl();

export function HomeWelcome() {
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [course, setCourse] = useState('');
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
    void repository.getManagedCourseSettings().then(settings => {
      if (active && !changed) setCourse(settings.course);
    }).catch(() => undefined);
    return () => { active = false; window.removeEventListener('managed-course-changed', update); };
  }, []);

  return <section ref={section} className={`home-welcome${visible ? ' is-in-view' : ''}`} aria-labelledby="home-welcome-title">
    <img className="home-welcome__watermark" src={publicImages.communityTree} alt="" aria-hidden="true" />
    <div className="home-welcome__identity">
      <div>
        <strong>{course ? `Curso ${course.replace(/^Curso\s+/i, '').trim()}` : 'Familias del curso'}</strong>
      </div>
    </div>
    <div className="home-welcome__message">
      <h1 id="home-welcome-title">Cada familia <em>hace la diferencia.</em></h1>
      <p>Este es nuestro punto de encuentro para acompañar a nuestros niños, compartir y construir juntos.</p>
    </div>
  </section>;
}
