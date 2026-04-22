import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button Component - Cobertura Completa', () => {
  // 1. Test de funcionalidad básica (Ya lo tenías, ¡muy bien!)
  it('debe mostrar el texto enviado por props', () => {
    render(<Button label="Mi Botón" onClick={() => {}} />);
    expect(screen.getByText(/mi botón/i)).toBeInTheDocument();
  });

  it('debe disparar el evento onClick', () => {
    const mockClick = vi.fn();
    render(<Button label="Click" onClick={mockClick} />);
    const boton = screen.getByRole('button');
    fireEvent.click(boton);
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  // 2. Test de Clases CSS (Variantes y Tamaños)
  it('debe aplicar las clases de variante y tamaño correctamente', () => {
    const { rerender } = render(
      <Button label="Btn" onClick={() => {}} variant="danger" size="large" />
    );
    const boton = screen.getByRole('button');

    // Verificamos que tenga las clases esperadas
    expect(boton).toHaveClass('button-danger');
    expect(boton).toHaveClass('size-large');

    // Probamos otra combinación con rerender
    rerender(<Button label="Btn" onClick={() => {}} variant="secondary" size="small" />);
    expect(boton).toHaveClass('button-secondary');
    expect(boton).toHaveClass('size-small');
  });

  // 3. Test de Atributos (Type y TestId)
  it('debe aplicar el atributo type y data-testid correctamente', () => {
    render(
      <Button
        label="Submit"
        onClick={() => {}}
        type="submit"
        testId="btn-test-123"
      />
    );
    const boton = screen.getByTestId('btn-test-123');

    expect(boton).toHaveAttribute('type', 'submit');
  });

  // 4. Test de Valores por Defecto
  it('debe usar valores por defecto cuando no se pasan props opcionales', () => {
    render(<Button label="Default" onClick={() => {}} />);
    const boton = screen.getByRole('button');

    // Según tu código: variant="primary", size="small", type="button"
    expect(boton).toHaveClass('button-primary');
    expect(boton).toHaveClass('size-small');
    expect(boton).toHaveAttribute('type', 'button');
  });
});
