import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConvenioListItem } from './ConvenioListItem';

describe('ConvenioListItem', () => {
  const defaultProps = {
    id: 'test-id',
    nombre: 'Hosteleria de Madrid',
    ambito: 'provincial' as const,
  };

  describe('renderizado', () => {
    it('renderiza el nombre del convenio', () => {
      render(<ConvenioListItem {...defaultProps} />);
      expect(screen.getByText('Hosteleria de Madrid')).toBeInTheDocument();
    });

    it('usa id y data-testid en el elemento raiz', () => {
      render(<ConvenioListItem {...defaultProps} />);
      expect(screen.getByTestId('convenio-test-id')).toHaveAttribute('id', 'test-id');
    });

    it('renderiza ConvenioChip con ambito correcto', () => {
      render(<ConvenioListItem {...defaultProps} ambito="estatal" />);
      expect(screen.getByText('[E]')).toBeInTheDocument();
    });

    it('muestra sector cuando se proporciona', () => {
      render(<ConvenioListItem {...defaultProps} sector="Hosteleria" />);
      expect(screen.getByText('Hosteleria')).toBeInTheDocument();
    });

    it('muestra fecha relativa cuando se proporciona', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      render(
        <ConvenioListItem
          {...defaultProps}
          fechaActualizacion={yesterday.toISOString()}
        />
      );
      expect(screen.getByText(/ayer/i)).toBeInTheDocument();
    });
  });

  describe('interactividad', () => {
    it('llama a onClick al hacer click', () => {
      const onClick = vi.fn();
      render(<ConvenioListItem {...defaultProps} onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('llama a onClick con Enter', () => {
      const onClick = vi.fn();
      render(<ConvenioListItem {...defaultProps} onClick={onClick} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('llama a onInfo al hacer click en boton info', () => {
      const onInfo = vi.fn();
      const onClick = vi.fn();
      render(
        <ConvenioListItem {...defaultProps} onClick={onClick} onInfo={onInfo} />
      );

      // El boton de info aparece en hover, pero siempre esta en el DOM
      const infoButton = screen.getByRole('button', { name: /informacion/i });
      fireEvent.click(infoButton);

      expect(onInfo).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled(); // No debe propagar
    });

    it('no tiene role button si onClick no esta definido', () => {
      render(<ConvenioListItem {...defaultProps} onClick={undefined} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('estado seleccionado', () => {
    it('aplica estilos de seleccion', () => {
      render(<ConvenioListItem {...defaultProps} isSelected onClick={() => {}} />);
      const item = screen.getByRole('button');
      expect(item).toHaveClass('ring-1');
    });
  });

  describe('accesibilidad', () => {
    it('boton info tiene aria-label descriptivo', () => {
      render(
        <ConvenioListItem {...defaultProps} onClick={() => {}} onInfo={() => {}} />
      );
      expect(
        screen.getByRole('button', { name: /informacion sobre hosteleria/i })
      ).toBeInTheDocument();
    });

    it('tiene tabIndex cuando es interactivo', () => {
      render(<ConvenioListItem {...defaultProps} onClick={() => {}} />);
      expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
    });
  });
});
