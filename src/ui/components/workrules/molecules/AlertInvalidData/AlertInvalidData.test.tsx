import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AlertInvalidData } from './AlertInvalidData';

describe('AlertInvalidData', () => {
  const defaultProps = {
    reason: {
      field: 'horas extra',
      value: '120 horas',
      limit: 'el maximo legal son 80 horas anuales',
      legalReference: 'Art. 35.2 ET',
    },
  };

  describe('renderizado', () => {
    it('renderiza sin errores', () => {
      render(<AlertInvalidData {...defaultProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('muestra titulo de dato fuera de rango', () => {
      render(<AlertInvalidData {...defaultProps} />);
      expect(screen.getByText('Dato fuera de rango')).toBeInTheDocument();
    });

    it('muestra el campo y valor invalido', () => {
      render(<AlertInvalidData {...defaultProps} />);
      expect(screen.getByText(/horas extra/)).toBeInTheDocument();
      expect(screen.getByText(/120 horas/)).toBeInTheDocument();
    });

    it('muestra el limite cuando existe', () => {
      render(<AlertInvalidData {...defaultProps} />);
      expect(screen.getByText(/80 horas anuales/)).toBeInTheDocument();
    });

    it('muestra la referencia legal cuando existe', () => {
      render(<AlertInvalidData {...defaultProps} />);
      expect(screen.getByText(/Art\. 35\.2 ET/)).toBeInTheDocument();
    });

    it('no muestra limite si no se proporciona', () => {
      const propsWithoutLimit = {
        reason: {
          field: 'test',
          value: 'invalid',
        },
      };
      render(<AlertInvalidData {...propsWithoutLimit} />);
      expect(screen.queryByText(/maximo legal/i)).not.toBeInTheDocument();
    });  });

  describe('sugerencias', () => {
    it('muestra sugerencias cuando existen', () => {
      const suggestions = ['Opcion A', 'Opcion B'];
      render(<AlertInvalidData {...defaultProps} suggestions={suggestions} />);

      expect(screen.getByText('Quizás te refieres a:')).toBeInTheDocument();
      expect(screen.getByText(/Opcion A/)).toBeInTheDocument();
      expect(screen.getByText(/Opcion B/)).toBeInTheDocument();
    });

    it('no muestra seccion de sugerencias si array vacio', () => {
      render(<AlertInvalidData {...defaultProps} suggestions={[]} />);
      expect(screen.queryByText('Quizás te refieres a:')).not.toBeInTheDocument();
    });

    it('llama a onSelectSuggestion al hacer click en sugerencia', () => {
      const onSelectSuggestion = vi.fn();
      const suggestions = ['Opcion A', 'Opcion B'];
      render(
        <AlertInvalidData
          {...defaultProps}
          suggestions={suggestions}
          onSelectSuggestion={onSelectSuggestion}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Opcion A/ }));

      expect(onSelectSuggestion).toHaveBeenCalledWith('Opcion A');
    });
  });

  describe('interacciones', () => {
    it('llama a onDismiss al hacer click en cerrar', () => {
      const onDismiss = vi.fn();
      render(<AlertInvalidData {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('accesibilidad', () => {
    it('tiene role alert', () => {
      render(<AlertInvalidData {...defaultProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('tiene aria-live assertive para errores', () => {
      render(<AlertInvalidData {...defaultProps} />);
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });
  });
});
