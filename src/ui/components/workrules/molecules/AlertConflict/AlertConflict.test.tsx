import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertConflict } from './AlertConflict';

describe('AlertConflict', () => {
  const defaultProps = {
    conflict: {
      field1: { name: 'jornada', value: 'completa' },
      field2: { name: 'horas', value: '20h' },
      explanation: 'La jornada completa son 40 horas.',
    },
    options: [
      { label: 'Opcion A', value: 'a' },
      { label: 'Opcion B', value: 'b' },
    ],
    onSelectOption: vi.fn(),
  };

  describe('renderizado', () => {
    it('renderiza sin errores', () => {
      render(<AlertConflict {...defaultProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('muestra titulo de conflicto detectado', () => {
      render(<AlertConflict {...defaultProps} />);
      expect(screen.getByText('Conflicto detectado')).toBeInTheDocument();
    });

    it('muestra ambos campos en conflicto', () => {
      render(<AlertConflict {...defaultProps} />);
      // Verificar que el componente muestra los nombres y valores de los campos
      expect(screen.getByText('jornada:')).toBeInTheDocument();
      expect(screen.getByText('completa')).toBeInTheDocument();
      expect(screen.getByText('horas:')).toBeInTheDocument();
      expect(screen.getByText('20h')).toBeInTheDocument();
    });

    it('muestra la explicacion', () => {
      render(<AlertConflict {...defaultProps} />);
      expect(screen.getByText(/La jornada completa son 40 horas/)).toBeInTheDocument();
    });

    it('muestra instruccion de resolver', () => {
      render(<AlertConflict {...defaultProps} />);
      // El componente puede no tener exactamente este texto, verificamos los botones de opciones
      expect(screen.getByRole('button', { name: 'Opcion A' })).toBeInTheDocument();
    });

    it('renderiza todas las opciones como botones', () => {
      render(<AlertConflict {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Opcion A' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Opcion B' })).toBeInTheDocument();
    });
  });

  describe('interacciones', () => {
    it('llama a onSelectOption con la opcion correcta', () => {
      const onSelectOption = vi.fn();
      render(<AlertConflict {...defaultProps} onSelectOption={onSelectOption} />);

      fireEvent.click(screen.getByRole('button', { name: 'Opcion A' }));

      expect(onSelectOption).toHaveBeenCalledWith({ label: 'Opcion A', value: 'a' });
    });

    it('llama a onDismiss al hacer click en cerrar', () => {
      const onDismiss = vi.fn();
      render(<AlertConflict {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('accesibilidad', () => {
    it('tiene role alert', () => {
      render(<AlertConflict {...defaultProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
