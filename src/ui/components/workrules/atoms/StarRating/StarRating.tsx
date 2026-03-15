import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';

export interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizeConfig = {
  sm: {
    icon: 'h-3 w-3',
    gap: 'gap-0.5',
  },
  md: {
    icon: 'h-4 w-4',
    gap: 'gap-1',
  },
  lg: {
    icon: 'h-5 w-5',
    gap: 'gap-1.5',
  },
};

const getStarNoun = (count: number) => (count === 1 ? 'estrella' : 'estrellas');
const buildStarCountLabel = (count: number) => `${count} ${getStarNoun(count)}`;

export const StarRating = ({
  rating,
  maxStars = 5,
  size = 'md',
  interactive = false,
  onChange,
  className,
}: StarRatingProps) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const safeMaxStars = Math.max(1, Math.floor(maxStars));
  const clampedRating = Math.min(Math.max(Math.floor(rating), 1), safeMaxStars);
  const stars = Array.from({ length: safeMaxStars }, (_, i) => i + 1);
  const selectedIndex = Math.min(Math.max(clampedRating - 1, 0), safeMaxStars - 1);
  const activeIndex = focusedIndex ?? selectedIndex;

  const handleStarClick = (value: number) => {
    if (!interactive) return;

    setFocusedIndex(value - 1);
    if (onChange) {
      onChange(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (!interactive) return;

    let newIndex: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < safeMaxStars - 1 ? currentIndex + 1 : currentIndex;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleStarClick(currentIndex + 1);
        return;
      default:
        return;
    }

    if (newIndex !== null) {
      setFocusedIndex(newIndex);
      if (onChange) {
        onChange(newIndex + 1);
      }
      const buttons = containerRef.current?.querySelectorAll('button');
      if (buttons && buttons[newIndex]) {
        (buttons[newIndex] as HTMLButtonElement).focus();
      }
    }
  };

  useEffect(() => {
    if (focusedIndex !== null && containerRef.current) {
      const buttons = containerRef.current.querySelectorAll('button');
      if (buttons[focusedIndex]) {
        (buttons[focusedIndex] as HTMLButtonElement).focus();
      }
    }
  }, [focusedIndex]);

  const config = sizeConfig[size];
  const ariaLabel = `${clampedRating} de ${safeMaxStars} ${getStarNoun(safeMaxStars)}`;

  if (interactive) {
    return (
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Calificación por estrellas"
        className={cn('inline-flex items-center', config.gap, className)}
      >
        {stars.map((value, index) => {
          const isSelected = value === clampedRating;
          const isFocusable = index === activeIndex;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isFocusable ? 0 : -1}
              aria-label={buildStarCountLabel(value)}
              onClick={() => handleStarClick(value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => setFocusedIndex(index)}
              className={cn(
                'transition-transform duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded',
                isSelected ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-foreground/60'
              )}
            >
              <Star className={config.icon} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center', config.gap, className)}
    >
      {stars.map((value) => {
        const isActive = value <= clampedRating;

        return (
          <Star
            key={value}
            className={cn(
              config.icon,
              isActive ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-foreground/60'
            )}
            strokeWidth={1.5}
          />
        );
      })}
    </div>
  );
};
