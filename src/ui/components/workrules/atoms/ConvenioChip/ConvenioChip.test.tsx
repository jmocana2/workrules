import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvenioChip } from './ConvenioChip';

describe('ConvenioChip', () => {
  it('renderiza el nombre del convenio', () => {
    render(<ConvenioChip nombre="Convenio de Prueba" />);
    expect(screen.getByText('Convenio de Prueba')).toBeInTheDocument();
  });

  it.each([
    ['estatal', '[E]'],
    ['autonomico', '[A]'],
    ['provincial', '[P]'],
    ['empresa', '[Emp]'],
  ] as const)('muestra el indicador %s → %s', (ambito, indicador) => {
    render(<ConvenioChip nombre="X" ambito={ambito} />);
    expect(screen.getByText(indicador)).toBeInTheDocument();
  });

  it('sin ambito no renderiza indicador', () => {
    render(<ConvenioChip nombre="Sin Ámbito" />);
    expect(screen.queryByText(/^\[/)).not.toBeInTheDocument();
  });

  it('en modo removible, click en el botón X dispara onRemove y no propaga a onClick', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onClick = vi.fn();

    render(
      <ConvenioChip nombre="Chip" removable onRemove={onRemove} onClick={onClick} />
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar Chip' }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('click en el chip dispara onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ConvenioChip nombre="Clickeable" onClick={onClick} />);

    await user.click(screen.getByText('Clickeable'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
