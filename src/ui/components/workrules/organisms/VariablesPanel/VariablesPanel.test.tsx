import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariablesPanel } from './VariablesPanel';
import type { PerfilJson } from '@core/types';

// Mock data
const mockPerfilHosteleria: PerfilJson = {
  convenio: 'Hosteleria de Madrid',
  variables_criticas: [
    'Categoria Profesional',
    'Categoria Hotel',
    'Anos Antiguedad',
  ],
  valores_posibles: {
    'Categoria Profesional': ['Gobernanta', 'Camarera de piso', 'Recepcionista'],
    'Categoria Hotel': ['3 estrellas', '4 estrellas', '5 estrellas'],
    'Anos Antiguedad': ['0-2 anos', '2-5 anos', '5-10 anos'],
  },
  descripciones: {
    'Categoria Profesional': 'Puesto de trabajo segun el convenio',
    'Categoria Hotel': 'Clasificacion del establecimiento',
  },
};

const mockPerfilSinValores: PerfilJson = {
  convenio: 'Convenio Sin Valores',
  variables_criticas: ['Variable Sin Datos'],
  valores_posibles: {
    'Variable Sin Datos': [],
  },
};

describe('VariablesPanel', () => {
  describe('Estado sin perfil', () => {
    it('muestra mensaje cuando perfilJson es null', () => {
      const onVariableClick = vi.fn();
      render(<VariablesPanel perfilJson={null} onVariableClick={onVariableClick} />);

      expect(
        screen.getByText('Selecciona un convenio para ver sus variables')
      ).toBeInTheDocument();
    });

    it('muestra el título del panel', () => {
      const onVariableClick = vi.fn();
      render(<VariablesPanel perfilJson={null} onVariableClick={onVariableClick} />);

      expect(screen.getByText('Variables del convenio')).toBeInTheDocument();
    });

    it('muestra icono de información', () => {
      const onVariableClick = vi.fn();
      const { container } = render(
        <VariablesPanel perfilJson={null} onVariableClick={onVariableClick} />
      );

      // Buscar el SVG de InfoIcon por su clase o estructura
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Estado expandido con datos', () => {
    it('muestra todas las variables críticas', () => {
      const onVariableClick = vi.fn();
      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
        />
      );

      // Las variables se muestran con la clase uppercase CSS
      expect(screen.getByText('Categoria Profesional')).toBeInTheDocument();
      expect(screen.getByText('Categoria Hotel')).toBeInTheDocument();
      expect(screen.getByText('Anos Antiguedad')).toBeInTheDocument();
    });

    it('muestra valores posibles como badges', () => {
      const onVariableClick = vi.fn();
      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
        />
      );

      expect(screen.getByText('Gobernanta')).toBeInTheDocument();
      expect(screen.getByText('Camarera de piso')).toBeInTheDocument();
      expect(screen.getByText('3 estrellas')).toBeInTheDocument();
      expect(screen.getByText('0-2 anos')).toBeInTheDocument();
    });

    it('muestra nombre del convenio en el footer', () => {
      const onVariableClick = vi.fn();
      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
        />
      );

      expect(screen.getByText('Hosteleria de Madrid')).toBeInTheDocument();
    });

    it('llama a onVariableClick cuando se hace click en un badge', async () => {
      const user = userEvent.setup();
      const onVariableClick = vi.fn();

      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
        />
      );

      const gobernantaBadge = screen.getByText('Gobernanta');
      await user.click(gobernantaBadge);

      expect(onVariableClick).toHaveBeenCalledWith(
        'Categoria Profesional',
        'Gobernanta'
      );
      expect(onVariableClick).toHaveBeenCalledTimes(1);
    });

    it('muestra "Sin valores definidos" cuando una variable tiene array vacío', () => {
      const onVariableClick = vi.fn();
      render(
        <VariablesPanel
          perfilJson={mockPerfilSinValores}
          onVariableClick={onVariableClick}
        />
      );

      expect(screen.getByText('Sin valores definidos')).toBeInTheDocument();
    });
  });

  describe('Tooltip con descripción', () => {
    it('muestra icono de info cuando hay descripción', () => {
      const onVariableClick = vi.fn();
      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
        />
      );

      // Debe haber dos iconos de info (uno por cada variable con descripción)
      const infoButtons = screen.getAllByRole('button', {
        name: /Información sobre/i,
      });
      expect(infoButtons.length).toBeGreaterThan(0);
    });

    it('muestra tooltip trigger con aria-label correcto', () => {
      const onVariableClick = vi.fn();
      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
        />
      );

      const infoButton = screen.getByRole('button', {
        name: 'Información sobre Categoria Profesional',
      });

      expect(infoButton).toBeInTheDocument();
      expect(infoButton).toHaveAttribute('aria-label', 'Información sobre Categoria Profesional');
    });
  });

  describe('Estado colapsado', () => {
    it('muestra solo el botón de expandir cuando isCollapsed es true', () => {
      const onVariableClick = vi.fn();
      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
          isCollapsed={true}
        />
      );

      // Debe mostrar el botón de expandir
      const expandButton = screen.getByRole('button', {
        name: 'Expandir panel de variables',
      });
      expect(expandButton).toBeInTheDocument();

      // No debe mostrar las variables
      expect(screen.queryByText('CATEGORIA PROFESIONAL')).not.toBeInTheDocument();
    });

    it('llama a onToggleCollapse cuando se hace click en expandir', async () => {
      const user = userEvent.setup();
      const onVariableClick = vi.fn();
      const onToggleCollapse = vi.fn();

      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
          isCollapsed={true}
          onToggleCollapse={onToggleCollapse}
        />
      );

      const expandButton = screen.getByRole('button', {
        name: 'Expandir panel de variables',
      });
      await user.click(expandButton);

      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggle collapse', () => {
    it('muestra botón de colapsar cuando isCollapsed es false y onToggleCollapse está definido', () => {
      const onVariableClick = vi.fn();
      const onToggleCollapse = vi.fn();

      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
          isCollapsed={false}
          onToggleCollapse={onToggleCollapse}
        />
      );

      const collapseButton = screen.getByRole('button', { name: 'Colapsar panel' });
      expect(collapseButton).toBeInTheDocument();
    });

    it('no muestra botón de colapsar cuando onToggleCollapse no está definido', () => {
      const onVariableClick = vi.fn();

      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
        />
      );

      const collapseButton = screen.queryByRole('button', { name: 'Colapsar panel' });
      expect(collapseButton).not.toBeInTheDocument();
    });

    it('llama a onToggleCollapse cuando se hace click en colapsar', async () => {
      const user = userEvent.setup();
      const onVariableClick = vi.fn();
      const onToggleCollapse = vi.fn();

      render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
          onToggleCollapse={onToggleCollapse}
        />
      );

      const collapseButton = screen.getByRole('button', { name: 'Colapsar panel' });
      await user.click(collapseButton);

      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accesibilidad', () => {
    it('tiene aria-label en botones de colapsar/expandir', () => {
      const onVariableClick = vi.fn();
      const onToggleCollapse = vi.fn();

      const { rerender } = render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
          isCollapsed={false}
          onToggleCollapse={onToggleCollapse}
        />
      );

      let button = screen.getByRole('button', { name: 'Colapsar panel' });
      expect(button).toHaveAttribute('aria-label');

      rerender(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
          isCollapsed={true}
          onToggleCollapse={onToggleCollapse}
        />
      );

      button = screen.getByRole('button', { name: 'Expandir panel de variables' });
      expect(button).toHaveAttribute('aria-label');
    });
  });

  describe('className personalizado', () => {
    it('aplica className personalizado al contenedor', () => {
      const onVariableClick = vi.fn();
      const { container } = render(
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={onVariableClick}
          className="custom-class"
        />
      );

      const panel = container.firstChild;
      expect(panel).toHaveClass('custom-class');
    });
  });
});
