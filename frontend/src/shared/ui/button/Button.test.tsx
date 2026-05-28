import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Button } from './Button';

describe('Button Component', () => {
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

  it('[Button #04] debe usar valores por defecto cuando no se pasan props opcionales', () => {
    renderButton();
    const boton = screen.getByRole('button');
    expect(boton).toHaveClass('button-primary');
    expect(boton).toHaveClass('size-none');
    expect(boton).toHaveAttribute('type', 'button');
  });

  it('[Button #05] debe mostrar el icono a la derecha cuando se especifica', () => {
    const { container } = renderButton({ icon: '⭐', iconPosition: 'right' });
    const icono = container.querySelector('.button-icon--right');
    expect(icono).toBeInTheDocument();
  });

  it('[Button #06] loading debe deshabilitar el botón', () => {
    renderButton({ loading: true });
    const boton = screen.getByRole('button');
    expect(boton).toHaveClass('is-loading');
    expect(boton).toBeDisabled();
  });

});
