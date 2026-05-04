import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { NotFoundPage } from './NotFoundPage';

// 1. Mock de useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate, // Devolvemos nuestra función espía
  };
});

describe('NotFoundPage Integration Test', () => {
  it('debe renderizar todos los elementos y navegar al inicio al hacer clic', () => {
    // Envolvemos en BrowserRouter porque el componente usa hooks de rutas
    render(
      <BrowserRouter>
        <NotFoundPage />
      </BrowserRouter>
    );

    // Verificamos elementos de la página
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/página no encontrada/i)).toBeInTheDocument();

    // Verificamos que el componente Button esté presente por su label
    const boton = screen.getByRole('button', { name: /volver al inicio/i });
    expect(boton).toBeInTheDocument();

    // Probamos la integración con la navegación
    fireEvent.click(boton);

    // Verificamos que useNavigate fue llamado con el path correcto
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
