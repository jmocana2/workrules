import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

/**
 * Logo component for WorkRules
 * Displays the brand logo in different variants (full, icon, text) and sizes
 */
export function Logo({
  variant = 'full',
  size = 'md',
  theme = 'auto',
  className,
}: LogoProps) {
  // Size mappings
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
  };

  const iconSizes = {
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 48, height: 48 },
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  // Theme classes
  const getThemeClasses = () => {
    if (theme === 'light') {
      return 'text-gray-900';
    }
    if (theme === 'dark') {
      return 'text-white';
    }
    // Auto theme uses system preference
    return 'text-gray-900 dark:text-white';
  };

  // Icon component
  const IconSVG = () => (
    <svg
      width={iconSizes[size].width}
      height={iconSizes[size].height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('flex-shrink-0', getThemeClasses())}
      aria-hidden="true"
    >
      {/* Document/Book shape */}
      <path
        d="M6 4C6 2.89543 6.89543 2 8 2H20L26 8V28C26 29.1046 25.1046 30 24 30H8C6.89543 30 6 29.1046 6 28V4Z"
        className="fill-primary"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Folded corner */}
      <path
        d="M20 2V8H26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path
        d="M11 16L14 19L21 12"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Text component
  const TextComponent = () => (
    <span
      className={cn(
        'font-bold leading-none',
        textSizes[size],
        getThemeClasses()
      )}
      aria-hidden="true"
    >
      <span className="text-primary">Work</span>
      <span className="text-secondary">Rules</span>
    </span>
  );

  // Render based on variant
  const renderContent = () => {
    switch (variant) {
      case 'icon':
        return <IconSVG />;
      case 'text':
        return <TextComponent />;
      case 'full':
      default:
        return (
          <>
            <IconSVG />
            <TextComponent />
          </>
        );
    }
  };

  return (
    <div
      role="img"
      aria-label="WorkRules logo"
      className={cn(
        'inline-flex items-center gap-2',
        sizeClasses[size],
        className
      )}
    >
      {renderContent()}
    </div>
  );
}
