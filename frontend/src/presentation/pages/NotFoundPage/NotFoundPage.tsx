import { useNavigate } from 'react-router-dom';
import './NotFoundPage.css';
import { Button } from '@/shared/ui/button/Button';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    // Usamos article o section porque es un contenido con significado propio
    <article className="not-found-page" data-testid="not-found-screen">

      <header className="not-found-header">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Página no encontrada</h2>
      </header>

      <section className="not-found-body">
        <p className="not-found-text">
          La sección que buscas no existe o no tienes permisos para verla.
        </p>
      </section>

      <footer className="not-found-footer">
        <Button
          label="Volver al Inicio"
          onClick={() => navigate('/')}
          testId="go-home-button"
          variant="primary"
          size="medium"
        />
      </footer>

    </article>
  );
};


