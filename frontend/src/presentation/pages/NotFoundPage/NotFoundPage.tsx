import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiHome } from 'react-icons/fi';
import { Button } from '@/shared/ui/button/Button';
import illustration from '@/assets/not-found-characters.png';
import './NotFoundPage.css';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <main className="not-found-page" data-testid="not-found-screen">
      <div className="not-found-content">
        <div className="not-found-copy">
          <span className="not-found-eyebrow">ERROR 404</span>
          <h1>Parece que esta página se perdió</h1>
          <p>La página que buscas no existe o cambió de dirección. Te ayudamos a encontrar el camino de vuelta.</p>
          <Button
            label="Volver al inicio"
            onClick={() => navigate('/')}
            testId="go-home-button"
            variant="primary"
            size="medium"
            icon={<FiHome aria-hidden="true" />}
          />
          <span className="not-found-hint">Tu comunidad te espera <FiArrowRight aria-hidden="true" /></span>
        </div>
        <img className="not-found-illustration" src={illustration} alt="" />
      </div>
    </main>
  );
};
