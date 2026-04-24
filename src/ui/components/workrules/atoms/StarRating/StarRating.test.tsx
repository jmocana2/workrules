import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StarRating } from './StarRating';

describe('StarRating', () => {
  describe('Renderizado básico', () => {
    it('renderiza 5 estrellas por defecto', () => {
      const { container } = render(<StarRating rating={3} />);
      const stars = container.querySelectorAll('svg');
      expect(stars).toHaveLength(5);
    });

    it('renderiza el número correcto de maxStars', () => {
      const { container } = render(<StarRating rating={3} maxStars={7} />);
      const stars = container.querySelectorAll('svg');
      expect(stars).toHaveLength(7);
    });

    it('renderiza con maxStars = 3', () => {
      const { container } = render(<StarRating rating={2} maxStars={3} />);
      const stars = container.querySelectorAll('svg');
      expect(stars).toHaveLength(3);
    });

    it('muestra el número correcto de estrellas activas', () => {
      const { container } = render(<StarRating rating={3} maxStars={5} />);
      const filledStars = container.querySelectorAll('.fill-yellow-400');
      expect(filledStars).toHaveLength(3);
    });

    it('muestra todas las estrellas activas cuando rating = maxStars', () => {
      const { container } = render(<StarRating rating={5} maxStars={5} />);
      const filledStars = container.querySelectorAll('.fill-yellow-400');
      expect(filledStars).toHaveLength(5);
    });
  });

  describe('Accesibilidad', () => {
    it('tiene role="img" y aria-label descriptivo en modo estático', () => {
      render(<StarRating rating={4} maxStars={5} />);
      const container = screen.getByRole('img');
      expect(container).toHaveAttribute('aria-label', '4 de 5 estrellas');
    });

    it('tiene role="radiogroup" en modo interactivo', () => {
      render(<StarRating rating={3} interactive />);
      const container = screen.getByRole('radiogroup');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'Calificación por estrellas');
    });

    it('cada estrella es un radio button con aria-checked en modo interactivo', () => {
      render(<StarRating rating={3} maxStars={5} interactive />);
      const buttons = screen.getAllByRole('radio');
      expect(buttons).toHaveLength(5);

      // Solo la opción seleccionada debe estar checked
      expect(buttons[0]).toHaveAttribute('aria-checked', 'false');
      expect(buttons[1]).toHaveAttribute('aria-checked', 'false');
      expect(buttons[2]).toHaveAttribute('aria-checked', 'true');
      expect(buttons[3]).toHaveAttribute('aria-checked', 'false');
      expect(buttons[4]).toHaveAttribute('aria-checked', 'false');
    });

    it('cada botón tiene aria-label descriptivo en modo interactivo', () => {
      render(<StarRating rating={2} maxStars={5} interactive />);
      const buttons = screen.getAllByRole('radio');

      expect(buttons[0]).toHaveAttribute('aria-label', '1 estrella');
      expect(buttons[2]).toHaveAttribute('aria-label', '3 estrellas');
      expect(buttons[4]).toHaveAttribute('aria-label', '5 estrellas');
    });
  });

  describe('Modo interactivo', () => {
    it('llama a onChange cuando se hace clic en una estrella', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<StarRating rating={2} interactive onChange={handleChange} />);
      const buttons = screen.getAllByRole('radio');

      await user.click(buttons[3]); // Clic en la 4ta estrella (índice 3)
      expect(handleChange).toHaveBeenCalledWith(4);
    });

    it('llama a onChange con diferentes valores', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<StarRating rating={3} interactive onChange={handleChange} />);
      const buttons = screen.getAllByRole('radio');

      await user.click(buttons[0]);
      expect(handleChange).toHaveBeenCalledWith(1);

      await user.click(buttons[4]);
      expect(handleChange).toHaveBeenCalledWith(5);
    });

    it('no llama a onChange si no está en modo interactivo', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      const { container } = render(
        <StarRating rating={3} interactive={false} onChange={handleChange} />
      );

      const stars = container.querySelectorAll('svg');
      await user.click(stars[2]);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Navegación con teclado', () => {
    it('navega con flecha derecha', async () => {
      const user = userEvent.setup();
      render(<StarRating rating={2} interactive />);

      const buttons = screen.getAllByRole('radio');
      buttons[0].focus();

      await user.keyboard('{ArrowRight}');
      await waitFor(() => {
        expect(buttons[1]).toHaveFocus();
      });
    });

    it('navega con flecha izquierda', async () => {
      const user = userEvent.setup();
      render(<StarRating rating={2} interactive />);

      const buttons = screen.getAllByRole('radio');
      buttons[2].focus();

      await user.keyboard('{ArrowLeft}');
      await waitFor(() => {
        expect(buttons[1]).toHaveFocus();
      });
    });

    it('no navega más allá del inicio con flecha izquierda', async () => {
      const user = userEvent.setup();
      render(<StarRating rating={2} interactive />);

      const buttons = screen.getAllByRole('radio');
      buttons[0].focus();

      await user.keyboard('{ArrowLeft}');
      await waitFor(() => {
        expect(buttons[0]).toHaveFocus();
      });
    });

    it('no navega más allá del final con flecha derecha', async () => {
      const user = userEvent.setup();
      render(<StarRating rating={2} maxStars={5} interactive />);

      const buttons = screen.getAllByRole('radio');
      const lastIndex = buttons.length - 1;
      buttons[lastIndex].focus();

      await user.keyboard('{ArrowRight}');
      await waitFor(() => {
        expect(buttons[lastIndex]).toHaveFocus();
      });
    });

    it('selecciona con Enter', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<StarRating rating={2} interactive onChange={handleChange} />);
      const buttons = screen.getAllByRole('radio');

      buttons[3].focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(4);
      });
    });

    it('selecciona con Space', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<StarRating rating={2} interactive onChange={handleChange} />);
      const buttons = screen.getAllByRole('radio');

      buttons[2].focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(3);
      });
    });
  });

  describe('Estilos y tamaños', () => {
    it('aplica las clases de tamaño small', () => {
      const { container } = render(<StarRating rating={3} size="sm" />);
      const firstStar = container.querySelector('svg');
      expect(firstStar).toHaveClass('h-3', 'w-3');
    });

    it('aplica las clases de tamaño medium', () => {
      const { container } = render(<StarRating rating={3} size="md" />);
      const firstStar = container.querySelector('svg');
      expect(firstStar).toHaveClass('h-4', 'w-4');
    });

    it('aplica las clases de tamaño large', () => {
      const { container } = render(<StarRating rating={3} size="lg" />);
      const firstStar = container.querySelector('svg');
      expect(firstStar).toHaveClass('h-5', 'w-5');
    });

    it('aplica el gap correcto para cada tamaño', () => {
      const { container: smallContainer } = render(<StarRating rating={3} size="sm" />);
      const { container: mediumContainer } = render(<StarRating rating={3} size="md" />);
      const { container: largeContainer } = render(<StarRating rating={3} size="lg" />);

      const smallWrapper = smallContainer.querySelector('[role="img"]');
      const mediumWrapper = mediumContainer.querySelector('[role="img"]');
      const largeWrapper = largeContainer.querySelector('[role="img"]');

      expect(smallWrapper).toHaveClass('gap-0.5');
      expect(mediumWrapper).toHaveClass('gap-1');
      expect(largeWrapper).toHaveClass('gap-1.5');
    });

    it('muestra las estrellas activas con color amarillo', () => {
      const { container } = render(<StarRating rating={3} />);
      const filledStars = container.querySelectorAll('.fill-yellow-400.text-yellow-400');
      expect(filledStars).toHaveLength(3);
    });

    it('muestra las estrellas inactivas con color gris transparente', () => {
      const { container } = render(<StarRating rating={2} maxStars={5} />);
      const emptyStars = container.querySelectorAll('.fill-transparent.text-foreground\\/60');
      expect(emptyStars).toHaveLength(3);
    });

    it('aplica className personalizado', () => {
      const { container } = render(<StarRating rating={3} className="custom-class" />);
      const wrapper = container.querySelector('[role="img"]');
      expect(wrapper).toHaveClass('custom-class');
    });

    it('tiene efecto hover en modo interactivo', () => {
      render(<StarRating rating={3} interactive />);
      const buttons = screen.getAllByRole('radio');

      buttons.forEach(button => {
        expect(button).toHaveClass('hover:scale-110');
      });
    });

    it('tiene estilos de focus en modo interactivo', () => {
      render(<StarRating rating={3} interactive />);
      const buttons = screen.getAllByRole('radio');

      buttons.forEach(button => {
        expect(button).toHaveClass('focus:outline-none');
        expect(button).toHaveClass('focus:ring-2');
        expect(button).toHaveClass('focus:ring-teal-500');
      });
    });
  });

  describe('Props edge cases', () => {
    it('maneja rating = 1 correctamente', () => {
      const { container } = render(<StarRating rating={1} maxStars={5} />);
      const filledStars = container.querySelectorAll('.fill-yellow-400');
      expect(filledStars).toHaveLength(1);
    });

    it('maneja rating = 5 correctamente', () => {
      const { container } = render(<StarRating rating={5} maxStars={5} />);
      const filledStars = container.querySelectorAll('.fill-yellow-400');
      expect(filledStars).toHaveLength(5);
    });

    it('funciona con maxStars = 1', () => {
      const { container } = render(<StarRating rating={1} maxStars={1} />);
      const stars = container.querySelectorAll('svg');
      expect(stars).toHaveLength(1);
    });

    it('funciona sin onChange en modo interactivo', async () => {
      const user = userEvent.setup();
      render(<StarRating rating={3} interactive />);
      const buttons = screen.getAllByRole('radio');

      // No debe lanzar error
      await user.click(buttons[2]);
      expect(buttons[2]).toBeInTheDocument();
    });

    it('clampa rating por encima de maxStars', () => {
      const { container } = render(<StarRating rating={10} maxStars={7} />);
      const filledStars = container.querySelectorAll('.fill-yellow-400');
      const wrapper = container.querySelector('[role="img"]');

      expect(filledStars).toHaveLength(7);
      expect(wrapper).toHaveAttribute('aria-label', '7 de 7 estrellas');
    });

    it('clampa rating por debajo de 1', () => {
      const { container } = render(<StarRating rating={0} maxStars={5} />);
      const filledStars = container.querySelectorAll('.fill-yellow-400');
      const wrapper = container.querySelector('[role="img"]');

      expect(filledStars).toHaveLength(1);
      expect(wrapper).toHaveAttribute('aria-label', '1 de 5 estrellas');
    });
  });
});
