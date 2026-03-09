import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvenioChip } from './ConvenioChip';

describe('ConvenioChip', () => {
  describe('Renderizado básico', () => {
    it('renderiza el nombre del convenio correctamente', () => {
      render(<ConvenioChip nombre="Convenio de Prueba" />);
      expect(screen.getByText('Convenio de Prueba')).toBeInTheDocument();
    });

    it('renderiza sin indicador de ámbito cuando no se especifica', () => {
      render(<ConvenioChip nombre="Convenio Sin Ámbito" />);
      expect(screen.queryByText('[E]')).not.toBeInTheDocument();
      expect(screen.queryByText('[P]')).not.toBeInTheDocument();
      expect(screen.queryByText('[Emp]')).not.toBeInTheDocument();
    });
  });

  describe('Indicadores de ámbito', () => {
    it('muestra el indicador [E] para ámbito estatal', () => {
      render(<ConvenioChip nombre="Convenio Estatal" ambito="estatal" />);
      expect(screen.getByText('[E]')).toBeInTheDocument();
    });

    it('muestra el indicador [P] para ámbito provincial', () => {
      render(<ConvenioChip nombre="Convenio Provincial" ambito="provincial" />);
      expect(screen.getByText('[P]')).toBeInTheDocument();
    });

    it('muestra el indicador [Emp] para ámbito empresa', () => {
      render(<ConvenioChip nombre="Convenio Empresa" ambito="empresa" />);
      expect(screen.getByText('[Emp]')).toBeInTheDocument();
    });
  });

  describe('Modo removible', () => {
    it('muestra el botón de eliminar cuando removable es true', () => {
      render(
        <ConvenioChip nombre="Convenio Removible" removable />
      );
      const removeButton = screen.getByRole('button', {
        name: 'Eliminar Convenio Removible',
      });
      expect(removeButton).toBeInTheDocument();
    });

    it('no muestra el botón de eliminar cuando removable es false', () => {
      render(<ConvenioChip nombre="Convenio No Removible" removable={false} />);
      const removeButton = screen.queryByRole('button', {
        name: 'Eliminar Convenio No Removible',
      });
      expect(removeButton).not.toBeInTheDocument();
    });

    it('llama al callback onRemove cuando se hace clic en el botón X', async () => {
      const user = userEvent.setup();
      const handleRemove = vi.fn();

      render(
        <ConvenioChip
          nombre="Convenio Test"
          removable
          onRemove={handleRemove}
        />
      );

      const removeButton = screen.getByRole('button', {
        name: 'Eliminar Convenio Test',
      });
      await user.click(removeButton);

      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('previene la propagación del evento al hacer clic en eliminar', async () => {
      const user = userEvent.setup();
      const handleRemove = vi.fn();
      const handleClick = vi.fn();

      render(
        <ConvenioChip
          nombre="Convenio Test"
          removable
          onRemove={handleRemove}
          onClick={handleClick}
        />
      );

      const removeButton = screen.getByRole('button', {
        name: 'Eliminar Convenio Test',
      });
      await user.click(removeButton);

      expect(handleRemove).toHaveBeenCalledTimes(1);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Interactividad', () => {
    it('llama al callback onClick cuando se hace clic en el chip', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <ConvenioChip nombre="Convenio Clickeable" onClick={handleClick} />
      );

      await user.click(screen.getByText('Convenio Clickeable'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('aplica cursor-pointer cuando hay onClick', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <ConvenioChip nombre="Convenio Test" onClick={handleClick} />
      );

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('cursor-pointer');
    });
  });

  describe('Estado selected', () => {
    it('aplica estilos de ring cuando selected es true', () => {
      const { container } = render(
        <ConvenioChip nombre="Convenio Seleccionado" selected />
      );

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('ring-2');
    });

    it('no aplica estilos de ring cuando selected es false', () => {
      const { container } = render(
        <ConvenioChip nombre="Convenio No Seleccionado" selected={false} />
      );

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).not.toHaveClass('ring-2');
    });
  });

  describe('Accesibilidad', () => {
    it('el botón de eliminar tiene aria-label correcto', () => {
      render(
        <ConvenioChip
          nombre="Convenio Accesible"
          removable
        />
      );

      const removeButton = screen.getByRole('button', {
        name: 'Eliminar Convenio Accesible',
      });
      expect(removeButton).toHaveAttribute(
        'aria-label',
        'Eliminar Convenio Accesible'
      );
    });

    it('el botón de eliminar es de tipo button', () => {
      render(
        <ConvenioChip nombre="Convenio Test" removable />
      );

      const removeButton = screen.getByRole('button', {
        name: 'Eliminar Convenio Test',
      });
      expect(removeButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Clases CSS personalizadas', () => {
    it('aplica className adicional', () => {
      const { container } = render(
        <ConvenioChip nombre="Convenio Test" className="custom-class" />
      );

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toHaveClass('custom-class');
    });
  });
});
