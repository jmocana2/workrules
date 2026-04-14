// src/ui/components/workrules/organisms/ConvenioUploader/VisibilitySelector.tsx

type Visibility = 'publico' | 'privado';

interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
  disabled?: boolean;
}

export function VisibilitySelector({
  value,
  onChange,
  disabled = false
}: VisibilitySelectorProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs text-[var(--colorsNeutralNeutral9)]">
        Visibilidad:
      </span>

      <div className="space-y-1">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="radio"
            name="visibility"
            value="privado"
            checked={value === 'privado'}
            onChange={() => onChange('privado')}
            disabled={disabled}
            className="mt-1 accent-[var(--colorsAccentAccent9)]"
          />
          <div>
            <span className="text-sm text-[var(--colorsNeutralNeutral6)]">
              Privado
            </span>
            <p className="text-xs text-[var(--colorsNeutralNeutral9)]">
              Solo tu puedes consultarlo
            </p>
          </div>
        </label>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="radio"
            name="visibility"
            value="publico"
            checked={value === 'publico'}
            onChange={() => onChange('publico')}
            disabled={disabled}
            className="mt-1 accent-[var(--colorsAccentAccent9)]"
          />
          <div>
            <span className="text-sm text-[var(--colorsNeutralNeutral6)]">
              Publico
            </span>
            <p className="text-xs text-[var(--colorsNeutralNeutral9)]">
              Disponible para la comunidad (tras revision)
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
