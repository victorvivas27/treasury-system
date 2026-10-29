import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import "../style/HomeCommunity.css";

export function HomeCommunitySkeleton() {
  return <div className="home-community" role="status" aria-label="Cargando comunidad del curso" aria-busy="true">
    <section className="home-community__about">
      <header className="home-community__title-banner"><h2>Lo que nos mueve</h2></header>
      <p><Skeleton /><Skeleton width="75%" /></p>
    </section>
    <section className="home-community__content">
      <header className="home-community__photo-heading"><h2>Nuestros momentos</h2></header>
      <div className="home-community__photo-placeholder"><Skeleton height="100%" /></div>
    </section>
    <section className="home-community__content">
      <div className="home-community__board-heading"><h2>Representantes del curso</h2></div>
      <div className="home-community__board">{Array.from({ length: 3 }, (_, index) =>
        <article className="is-presidente" key={index}>
          <span className="home-community__board-toggle"><span className="home-community__board-avatar"><Skeleton height="100%" /></span></span>
        </article>)}</div>
    </section>
  </div>;
}
