import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileDrawer } from './MobileDrawer';

afterEach(() => {
  document.body.style.overflow = '';
});

function renderDrawer(overrides: Partial<Parameters<typeof MobileDrawer>[0]> = {}) {
  const onClose = overrides.onClose ?? vi.fn();
  const props = {
    isOpen: true,
    onClose,
    children: (
      <>
        <button type="button">Primero</button>
        <button type="button">Segundo</button>
        <button type="button">Tercero</button>
      </>
    ),
    ...overrides,
  };
  const utils = render(<MobileDrawer {...props} />);
  return { ...utils, onClose };
}

describe('MobileDrawer', () => {
  describe('Render', () => {
    it('renderiza los children dentro del dialog cuando está abierto', () => {
      renderDrawer();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Primero' })).toBeInTheDocument();
    });

    it('usa el aria-label del lado izquierdo por defecto', () => {
      renderDrawer();

      expect(
        screen.getByRole('dialog', { name: 'Menu de navegacion' })
      ).toBeInTheDocument();
    });

    it('usa el aria-label del lado derecho cuando side="right"', () => {
      renderDrawer({ side: 'right' });

      expect(
        screen.getByRole('dialog', { name: 'Panel de variables' })
      ).toBeInTheDocument();
    });
  });

  describe('Scroll lock', () => {
    it('bloquea el scroll del body cuando isOpen es true', () => {
      renderDrawer({ isOpen: true });

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restaura el scroll del body cuando isOpen pasa a false', () => {
      const { rerender } = renderDrawer({ isOpen: true });
      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <MobileDrawer isOpen={false} onClose={vi.fn()}>
          <button type="button">Primero</button>
        </MobileDrawer>
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Cierre', () => {
    it('llama a onClose al pulsar Escape', async () => {
      const user = userEvent.setup();
      const { onClose } = renderDrawer();

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('llama a onClose al hacer click en el overlay', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderDrawer({ onClose });

      await user.click(screen.getByTestId('mobile-drawer-overlay'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('no llama a onClose por Escape cuando está cerrado', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <MobileDrawer isOpen={false} onClose={onClose}>
          <button type="button">Primero</button>
        </MobileDrawer>
      );

      await user.keyboard('{Escape}');

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Focus trap', () => {
    it('mueve el foco al primer elemento focusable al abrirse', () => {
      renderDrawer();

      expect(screen.getByRole('button', { name: 'Primero' })).toHaveFocus();
    });

    it('cicla del último al primero con Tab', async () => {
      const user = userEvent.setup();
      renderDrawer();

      screen.getByRole('button', { name: 'Tercero' }).focus();
      await user.tab();

      expect(screen.getByRole('button', { name: 'Primero' })).toHaveFocus();
    });

    it('cicla del primero al último con Shift+Tab', async () => {
      const user = userEvent.setup();
      renderDrawer();

      expect(screen.getByRole('button', { name: 'Primero' })).toHaveFocus();
      await user.tab({ shift: true });

      expect(screen.getByRole('button', { name: 'Tercero' })).toHaveFocus();
    });
  });
});
