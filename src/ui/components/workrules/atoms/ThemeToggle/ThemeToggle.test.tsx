import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeStore } from '@core/stores/themeStore';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Limpiar localStorage
    localStorage.clear();

    // Limpiar data-theme del document
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.className = '';

    // Reset del store
    useThemeStore.setState({ theme: 'dark' });

    // Mock de matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  describe('Renderizado básico', () => {
    it('renderiza el botón correctamente', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('tiene aria-label descriptivo', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label')).toContain('Cambiar a');
    });

    it('muestra el icono de sol cuando tema es dark (indica cambio a light)', () => {
      useThemeStore.setState({ theme: 'dark' });
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Cambiar a modo claro');
    });

    it('muestra el icono de luna cuando tema es light (indica cambio a dark)', () => {
      useThemeStore.setState({ theme: 'light' });
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
    });
  });

  describe('Toggle de tema', () => {
    it('cambia de dark a light al hacer click', () => {
      useThemeStore.setState({ theme: 'dark' });
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(useThemeStore.getState().theme).toBe('light');
    });

    it('cambia de light a dark al hacer click', () => {
      useThemeStore.setState({ theme: 'light' });
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(useThemeStore.getState().theme).toBe('dark');
    });

    it('actualiza data-theme en el document', () => {
      useThemeStore.setState({ theme: 'dark' });
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(document.documentElement.dataset.theme).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });
  });

  describe('showLabel', () => {
    it('muestra el texto cuando showLabel=true', () => {
      useThemeStore.setState({ theme: 'light' });
      render(<ThemeToggle showLabel />);

      expect(screen.getByText('Modo claro')).toBeInTheDocument();
    });

    it('no muestra el texto cuando showLabel=false', () => {
      useThemeStore.setState({ theme: 'light' });
      render(<ThemeToggle showLabel={false} />);

      expect(screen.queryByText('Modo claro')).not.toBeInTheDocument();
    });

    it('muestra las etiquetas correctas para cada tema', () => {
      useThemeStore.setState({ theme: 'light' });
      const { rerender } = render(<ThemeToggle showLabel />);
      expect(screen.getByText('Modo claro')).toBeInTheDocument();

      useThemeStore.setState({ theme: 'dark' });
      rerender(<ThemeToggle showLabel />);
      expect(screen.getByText('Modo oscuro')).toBeInTheDocument();
    });
  });

  describe('Tamaños', () => {
    it('aplica las clases correctas para size="sm"', () => {
      render(<ThemeToggle size="sm" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8', 'w-8');
    });

    it('aplica las clases correctas para size="md"', () => {
      render(<ThemeToggle size="md" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'w-9');
    });

    it('aplica las clases correctas para size="lg"', () => {
      render(<ThemeToggle size="lg" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'w-10');
    });
  });

  describe('className personalizada', () => {
    it('aplica className adicional', () => {
      const { container } = render(<ThemeToggle className="custom-class" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('Accesibilidad', () => {
    it('tiene el aria-label correcto indicando el próximo tema', () => {
      useThemeStore.setState({ theme: 'light' });
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
    });

    it('actualiza aria-label cuando cambia el tema', () => {
      useThemeStore.setState({ theme: 'light' });
      const { rerender } = render(<ThemeToggle />);

      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');

      useThemeStore.setState({ theme: 'dark' });
      rerender(<ThemeToggle />);

      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Cambiar a modo claro');
    });
  });
});
