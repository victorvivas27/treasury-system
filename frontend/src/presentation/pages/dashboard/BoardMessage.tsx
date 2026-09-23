import { useEffect, useRef, useState } from "react";
import { IoHeartOutline } from "react-icons/io5";

const message = "Su tiempo, ideas y cariño hacen posibles momentos inolvidables para nuestros niños y niñas.";

export const BoardMessage = () => {
  const note = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.IntersectionObserver) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) setVisible(true);
      }
    }, { threshold: [0, 0.25] });

    if (note.current) observer.observe(note.current);
    return () => observer.disconnect();
  }, []);

  return <section ref={note}
    className={`dashboard-board-message dashboard-board-message--whole${visible ? " is-visible" : ""}`}
    aria-labelledby="dashboard-board-message-title">
    <div className="dashboard-board-message__content">
      <span className="dashboard-board-message__eyebrow"><IoHeartOutline aria-hidden="true" />
        De parte de la directiva</span>
      <h2 id="dashboard-board-message-title">Gracias por hacer equipo.</h2>
      <p>{message}</p>
      <footer><span className="dashboard-board-message__signature">Con cariño,
        <strong>La directiva del curso</strong></span></footer>
    </div>
  </section>;
};
