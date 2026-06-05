import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataRequestCard } from './DataRequestCard';

describe('DataRequestCard', () => {
  const defaultProps = {
    title: 'Test Title',
    fields: [
      {
        name: 'field1',
        label: 'Field 1',
        type: 'radio' as const,
        required: true,
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ],
      },
    ],
    onSubmit: vi.fn(),
  };

  describe('renderizado', () => {
    it('renderiza sin errores', () => {
      render(<DataRequestCard {...defaultProps} />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('muestra nombre del convenio', () => {
      render(<DataRequestCard {...defaultProps} convenioName="Test Convenio" />);
      expect(screen.getByText(/Test Convenio/)).toBeInTheDocument();
    });

    it('muestra contador de intentos', () => {
      render(
        <DataRequestCard {...defaultProps} currentAttempt={2} maxAttempts={3} />
      );
      expect(screen.getByText(/Intento 2 de 3/)).toBeInTheDocument();
    });

    it('renderiza todas las opciones de campo', () => {
      render(<DataRequestCard {...defaultProps} />);
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
    });

    it('muestra asterisco en campos requeridos', () => {
      render(<DataRequestCard {...defaultProps} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('validacion', () => {
    it('muestra error si campo requerido esta vacio al enviar', () => {
      render(<DataRequestCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Calcular' }));

      expect(screen.getByText(/Este campo es obligatorio/)).toBeInTheDocument();
    });

    it('no llama a onSubmit si hay errores de validacion', () => {
      const onSubmit = vi.fn();
      render(<DataRequestCard {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole('button', { name: 'Calcular' }));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('envio de formulario', () => {
    it('llama a onSubmit con valores correctos', () => {
      const onSubmit = vi.fn();
      render(<DataRequestCard {...defaultProps} onSubmit={onSubmit} />);

      // Seleccionar opcion
      fireEvent.click(screen.getByLabelText('Option A'));
      // Enviar
      fireEvent.click(screen.getByRole('button', { name: 'Calcular' }));

      expect(onSubmit).toHaveBeenCalledWith({ field1: 'a' });
    });

    it('llama a onSkip al hacer click en "No lo se"', () => {
      const onSkip = vi.fn();
      render(<DataRequestCard {...defaultProps} onSkip={onSkip} />);

      fireEvent.click(screen.getByRole('button', { name: /No lo se/i }));

      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('no muestra boton Skip si onSkip no esta definido', () => {
      render(<DataRequestCard {...defaultProps} onSkip={undefined} />);
      expect(screen.queryByRole('button', { name: /No lo se/i })).not.toBeInTheDocument();
    });

    it('persiste el valor por defecto de estrellas al enviar', () => {
      const onSubmit = vi.fn();
      render(
        <DataRequestCard
          title="Test Stars"
          onSubmit={onSubmit}
          fields={[
            {
              name: 'estrellas',
              label: 'Estrellas del hotel',
              type: 'stars',
              required: true,
            },
          ]}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Calcular' }));

      expect(onSubmit).toHaveBeenCalledWith({ estrellas: '3' });
    });
  });

  describe('multiples campos', () => {
    it('maneja multiples campos correctamente', () => {
      const onSubmit = vi.fn();
      const props = {
        ...defaultProps,
        onSubmit,
        fields: [
          {
            name: 'field1',
            label: 'Field 1',
            type: 'radio' as const,
            required: true,
            options: [{ value: 'a', label: 'A' }],
          },
          {
            name: 'field2',
            label: 'Field 2',
            type: 'radio' as const,
            required: true,
            options: [{ value: 'b', label: 'B' }],
          },
        ],
      };

      render(<DataRequestCard {...props} />);

      fireEvent.click(screen.getByLabelText('A'));
      fireEvent.click(screen.getByLabelText('B'));
      fireEvent.click(screen.getByRole('button', { name: 'Calcular' }));

      expect(onSubmit).toHaveBeenCalledWith({ field1: 'a', field2: 'b' });
    });
  });
});
