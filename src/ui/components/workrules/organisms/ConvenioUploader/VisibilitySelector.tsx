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
      <span className="text-xs text-[var(--colorsNeutralNeutral11)]">
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
            aria-label="Privado"
            className="mt-1 accent-[var(--colorsAccentAccent9)]"
          />
          <div>
            <span className="text-sm text-[var(--colorsNeutralNeutral12)]">
              Privado
            </span>
            <p className="text-xs text-[var(--colorsNeutralNeutral11)]">
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
            aria-label="Público"
            className="mt-1 accent-[var(--colorsAccentAccent9)]"
          />
          <div>
            <span className="text-sm text-[var(--colorsNeutralNeutral12)]">
              Público
            </span>
            <p className="text-xs text-[var(--colorsNeutralNeutral11)]">
              Disponible para la comunidad (tras revisión)            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
