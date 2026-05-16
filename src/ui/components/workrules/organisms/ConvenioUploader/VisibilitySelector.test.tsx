import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisibilitySelector } from './VisibilitySelector';

describe('VisibilitySelector', () => {
  it('renders both visibility options', () => {
    const onChange = vi.fn();
    render(<VisibilitySelector value="privado" onChange={onChange} />);

    expect(screen.getByText('Visibilidad:')).toBeInTheDocument();
    expect(screen.getByText('Privado')).toBeInTheDocument();
    expect(screen.getByText('Público')).toBeInTheDocument();
    expect(screen.getByText('Solo tu puedes consultarlo')).toBeInTheDocument();
    expect(
      screen.getByText(/Disponible para la comunidad\. Solo se aceptan convenios colectivos/i)
    ).toBeInTheDocument();
  });

  it('shows privado as checked when value is privado', () => {
    const onChange = vi.fn();
    render(<VisibilitySelector value="privado" onChange={onChange} />);

    const privadoRadio = screen.getByRole('radio', { name: /privado/i });
    const publicoRadio = screen.getByRole('radio', { name: /público/i });

    expect(privadoRadio).toBeChecked();
    expect(publicoRadio).not.toBeChecked();
  });

  it('shows publico as checked when value is publico', () => {
    const onChange = vi.fn();
    render(<VisibilitySelector value="publico" onChange={onChange} />);

    const privadoRadio = screen.getByRole('radio', { name: /privado/i });
    const publicoRadio = screen.getByRole('radio', { name: /público/i });

    expect(publicoRadio).toBeChecked();
    expect(privadoRadio).not.toBeChecked();
  });

  it('calls onChange with "privado" when privado option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VisibilitySelector value="publico" onChange={onChange} />);

    const privadoRadio = screen.getByRole('radio', { name: /privado/i });
    await user.click(privadoRadio);

    expect(onChange).toHaveBeenCalledWith('privado');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with "publico" when publico option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VisibilitySelector value="privado" onChange={onChange} />);

    const publicoRadio = screen.getByRole('radio', { name: /público/i });
    await user.click(publicoRadio);

    expect(onChange).toHaveBeenCalledWith('publico');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('disables both radio buttons when disabled prop is true', () => {
    const onChange = vi.fn();
    render(<VisibilitySelector value="privado" onChange={onChange} disabled={true} />);

    const privadoRadio = screen.getByRole('radio', { name: /privado/i });
    const publicoRadio = screen.getByRole('radio', { name: /público/i });

    expect(privadoRadio).toBeDisabled();
    expect(publicoRadio).toBeDisabled();
  });

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VisibilitySelector value="privado" onChange={onChange} disabled={true} />);

    const publicoRadio = screen.getByRole('radio', { name: /público/i });
    await user.click(publicoRadio);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('allows clicking on labels to select options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VisibilitySelector value="privado" onChange={onChange} />);

    const publicoLabel = screen.getByText('Público');
    await user.click(publicoLabel);

    expect(onChange).toHaveBeenCalledWith('publico');
  });

  it('has cursor-pointer class on labels for better UX', () => {
    const onChange = vi.fn();
    const { container } = render(<VisibilitySelector value="privado" onChange={onChange} />);

    const labels = container.querySelectorAll('label');
    labels.forEach(label => {
      expect(label).toHaveClass('cursor-pointer');
    });
  });

  it('uses correct text sizes for different elements', () => {
    const onChange = vi.fn();
    const { container } = render(<VisibilitySelector value="privado" onChange={onChange} />);

    // Label "Visibilidad:" should be text-xs
    const visibilidadLabel = screen.getByText('Visibilidad:');
    expect(visibilidadLabel).toHaveClass('text-xs');

    // Option titles should be text-sm
    const privadoTitle = screen.getByText('Privado');
    expect(privadoTitle).toHaveClass('text-sm');

    // Descriptions should be text-xs
    const descriptions = container.querySelectorAll('p');
    descriptions.forEach(desc => {
      expect(desc).toHaveClass('text-xs');
    });
  });

  it('groups radio buttons under same name for proper radio behavior', () => {
    const onChange = vi.fn();
    render(<VisibilitySelector value="privado" onChange={onChange} />);

    const privadoRadio = screen.getByRole('radio', { name: /privado/i }) as HTMLInputElement;
    const publicoRadio = screen.getByRole('radio', { name: /público/i }) as HTMLInputElement;

    expect(privadoRadio.name).toBe('visibility');
    expect(publicoRadio.name).toBe('visibility');
  });
});
