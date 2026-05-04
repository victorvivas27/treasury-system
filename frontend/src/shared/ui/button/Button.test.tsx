import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Button } from './Button';

describe('Button Component - Cobertura Completa', () => {
  const mockClick = vi.fn();
  const defaultProps = {
    label: 'Mi Botón',
    onClick: mockClick,
  };

  beforeEach(() => {
    mockClick.mockClear();
  });

  const renderButton = (props = {}) => {
    return render(<Button {...defaultProps} {...props} />);
  };

  it('[Button #01] debe mostrar el texto enviado por props', () => {
    renderButton();
    expect(screen.getByText(/mi botón/i)).toBeInTheDocument();
  });

  it('[Button #02] debe disparar el evento onClick', () => {
    renderButton();
    fireEvent.click(screen.getByRole('button'));
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('[Button #03] debe aplicar las clases de variante y tamaño correctamente', () => {
    const { rerender } = renderButton({ variant: 'danger', size: 'large' });
    const boton = screen.getByRole('button');

    expect(boton).toHaveClass('button-danger');
    expect(boton).toHaveClass('size-large');

    rerender(<Button {...defaultProps} variant="secondary" size="small" />);
    expect(boton).toHaveClass('button-secondary');
    expect(boton).toHaveClass('size-small');
  });

  it('[Button #04] debe aplicar el atributo type y data-testid correctamente', () => {
    renderButton({ type: 'submit', testId: 'btn-test-123' });
    const boton = screen.getByTestId('btn-test-123');
    expect(boton).toHaveAttribute('type', 'submit');
  });

  it('[Button #05] debe usar valores por defecto cuando no se pasan props opcionales', () => {
    renderButton();
    const boton = screen.getByRole('button');
    expect(boton).toHaveClass('button-primary');
    expect(boton).toHaveClass('size-none');
    expect(boton).toHaveAttribute('type', 'button');
  });

  it('[Button #06] debe mostrar el icono cuando se proporciona', () => {
    renderButton({ icon: '🔥' });
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('[Button #07] debe mostrar el icono a la izquierda por defecto', () => {
    const { container } = renderButton({ icon: '⭐' });
    const icono = container.querySelector('.button-icon--left');
    expect(icono).toBeInTheDocument();
  });

  it('[Button #08] debe mostrar el icono a la derecha cuando se especifica', () => {
    const { container } = renderButton({ icon: '⭐', iconPosition: 'right' });
    const icono = container.querySelector('.button-icon--right');
    expect(icono).toBeInTheDocument();
  });

  it('[Button #09] debe renderizar solo el icono cuando no hay label', () => {
    renderButton({ label: undefined, icon: '🔍' });
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.queryByRole('button')?.textContent).toBe('🔍');
  });

  it('[Button #10] loading tiene prioridad sobre disabled', () => {
    renderButton({ loading: true, disabled: false });
    const boton = screen.getByRole('button');
    expect(boton).toHaveClass('is-loading');
    expect(boton).toBeDisabled();
  });

});
