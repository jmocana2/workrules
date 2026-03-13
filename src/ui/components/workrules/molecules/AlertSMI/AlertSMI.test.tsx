import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AlertSMI } from './AlertSMI';

describe('AlertSMI', () => {
  const defaultProps = {
    calculatedAmount: 950.00,
    smiAmount: 1221.00,
    adjustedAmount: 1221.00,
  };

  describe('renderizado', () => {
    it('renderiza sin errores', () => {
      render(<AlertSMI {...defaultProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('muestra titulo de alerta', () => {
      render(<AlertSMI {...defaultProps} />);
      expect(screen.getByText('Alerta de Salario Mínimo')).toBeInTheDocument();
    });

    it('muestra el monto calculado formateado', () => {
      render(<AlertSMI {...defaultProps} />);
      expect(screen.getByText(/950,00/)).toBeInTheDocument();
    });

    it('muestra el SMI de 14 pagas', () => {
      render(<AlertSMI {...defaultProps} />);
      expect(screen.getByText(/14 pagas/)).toBeInTheDocument();
    });

    it('muestra el ano proporcionado en el texto del SMI', () => {
      render(<AlertSMI {...defaultProps} year={2030} />);
      expect(screen.getByText(/SMI vigente para 2030/i)).toBeInTheDocument();
    });

    it('muestra el SMI de 12 pagas', () => {
      render(<AlertSMI {...defaultProps} payPeriod="12-pagas" />);
      expect(screen.getByText(/12 pagas prorrateadas/)).toBeInTheDocument();
    });

    it('muestra el monto ajustado', () => {
      render(<AlertSMI {...defaultProps} />);
      expect(screen.getByText('Bruto mensual:')).toBeInTheDocument();
    });

    it('muestra referencia al Art. 27 ET', () => {
      render(<AlertSMI {...defaultProps} />);
      expect(screen.getByText(/Art\. 27/)).toBeInTheDocument();
      expect(screen.getByText(/Estatuto de los Trabajadores/)).toBeInTheDocument();
    });
  });

  describe('calculo anual', () => {
    it('calcula correctamente con 14 pagas', () => {
      render(<AlertSMI {...defaultProps} adjustedAmount={1221} payPeriod="14-pagas" />);
      // 1221 * 14 = 17094
      expect(screen.getByText(/17\.094,00/)).toBeInTheDocument();
    });

    it('calcula correctamente con 12 pagas', () => {
      render(<AlertSMI {...defaultProps} adjustedAmount={1424} payPeriod="12-pagas" />);
      // 1424 * 12 = 17088
      expect(screen.getByText(/17\.088,00/)).toBeInTheDocument();
    });
  });

  describe('interacciones', () => {
    it('llama a onViewDetails al hacer click en el boton', () => {
      const onViewDetails = vi.fn();
      render(<AlertSMI {...defaultProps} onViewDetails={onViewDetails} />);

      fireEvent.click(screen.getByRole('button', { name: /ver desglose/i }));

      expect(onViewDetails).toHaveBeenCalledTimes(1);
    });

    it('no muestra boton si onViewDetails no esta definido', () => {
      render(<AlertSMI {...defaultProps} onViewDetails={undefined} />);
      expect(screen.queryByRole('button', { name: /ver desglose/i })).not.toBeInTheDocument();
    });

    it('llama a onDismiss al hacer click en cerrar', () => {
      const onDismiss = vi.fn();
      render(<AlertSMI {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('no muestra boton cerrar si onDismiss no esta definido', () => {
      render(<AlertSMI {...defaultProps} onDismiss={undefined} />);
      expect(screen.queryByRole('button', { name: /cerrar/i })).not.toBeInTheDocument();
    });
  });

  describe('accesibilidad', () => {
    it('tiene role alert', () => {
      render(<AlertSMI {...defaultProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('tiene aria-live polite', () => {
      render(<AlertSMI {...defaultProps} />);
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });
  });
});
