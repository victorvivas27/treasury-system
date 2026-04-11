import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>404</h1>
      <h2 style={styles.subtitle}>Página no encontrada</h2>
      <p style={styles.text}>
        La sección que buscas no existe o no tienes permisos para verla.
      </p>
      <button
        onClick={() => navigate('/')}
        style={styles.button}
      >
        Volver al Inicio
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    textAlign: 'center',
    backgroundColor: 'var(--color-background)',
    fontFamily: 'var(--font-main)'
  },
  title: {
    fontSize: '120px',
    margin: '0',
    color: 'var(--color-text-muted)',
    opacity: 0.3
  },
  subtitle: {
    fontSize: '24px',
    color: 'var(--color-text-main)',
    margin: '10px 0'
  },
  text: {
    color: 'var(--color-text-muted)',
    marginBottom: '30px',
    maxWidth: '400px'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-surface)',              
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  }
};
