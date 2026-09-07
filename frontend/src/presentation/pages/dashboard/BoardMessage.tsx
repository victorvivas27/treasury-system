import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { IoHeartOutline } from "react-icons/io5";

const message = "Su tiempo, ideas y cariño hacen posibles momentos inolvidables para nuestros niños y niñas.";
let elapsed = 250;
const typedWords = message.split(" ").map((word, wordIndex) => {
  const letters = [...word].map((letter, position) => {
    const delay = elapsed;
    elapsed += 55 + ((wordIndex * 13 + position * 17) % 45);
    if (letter === ",") elapsed += 280;
    if (".!?".includes(letter)) elapsed += 450;
    return { letter, delay };
  });
  elapsed += 90;
  return letters;
});

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
        if (!entry.isIntersecting) setVisible(false);
        else if (entry.intersectionRatio >= 0.25) setVisible(true);
      }
    }, { threshold: [0, 0.25] });
    if (note.current) observer.observe(note.current);
    return () => observer.disconnect();
  }, []);

  return <section ref={note} className={`dashboard-board-message${visible ? " is-visible" : ""}`}
    aria-labelledby="dashboard-board-message-title">
    <div className="dashboard-board-message__content">
      <span className="dashboard-board-message__eyebrow"><IoHeartOutline aria-hidden="true" />
        De parte de la directiva</span>
      <h2 id="dashboard-board-message-title">Gracias por hacer equipo.</h2>
      <p className="dashboard-board-message__typed">
        <span className="dashboard-board-message__accessible">{message}</span>
        <span aria-hidden="true">{typedWords.map((word, index) =>
          <span key={index}><span className="dashboard-board-message__word">
            {word.map(({ letter, delay }, position) => <span key={position}
              className="dashboard-board-message__letter"
              style={{ "--letter-delay": `${delay}ms` } as CSSProperties}>{letter}</span>)}
          </span>{" "}</span>)}</span>
      </p>
      <footer><span className="dashboard-board-message__signature">Con cariño,
        <strong>La directiva del curso</strong></span></footer>
    </div>
  </section>;
};
