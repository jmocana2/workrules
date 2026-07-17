import type { PerfilJson } from '@core/types';
import { lazy, Suspense } from 'react';

const VariablesPanel = lazy(() =>
  import('@ui/components/workrules/organisms/VariablesPanel/VariablesPanel').then((m) => ({
    default: m.VariablesPanel,
  })),
);
const MobileDrawer = lazy(() =>
  import('@ui/components/workrules/organisms/MobileDrawer/MobileDrawer').then((m) => ({
    default: m.MobileDrawer,
  })),
);

export interface ChatVariablesColumnProps {
  isMobile: boolean;
  isTablet: boolean;
  perfilJson: PerfilJson | null;
  activeVariables: Record<string, string>;
  onVariableClick: (variable: string, value: string) => void;
  isVariablesPanelCollapsed: boolean;
  toggleVariablesPanel: () => void;
  isVariablesPanelOpen: boolean;
  setIsVariablesPanelOpen: (open: boolean) => void;
}

/**
 * Columna derecha del ChatPage: panel de variables del convenio seleccionado.
 * Renderiza el VariablesPanel en 3 variantes según viewport (desktop expandido/
 * colapsable, tablet colapsado, mobile/tablet en drawer).
 */
export function ChatVariablesColumn({
  isMobile,
  isTablet,
  perfilJson,
  activeVariables,
  onVariableClick,
  isVariablesPanelCollapsed,
  toggleVariablesPanel,
  isVariablesPanelOpen,
  setIsVariablesPanelOpen,
}: ChatVariablesColumnProps) {
  const isCompact = isMobile || isTablet;

  return (
    // TODO TFM.7-G: envolver con ErrorBoundary global (junto a Sentry)
    <Suspense fallback={null}>
      {isCompact ? (
        <>
          {isTablet && (
            <VariablesPanel
              perfilJson={perfilJson}
              onVariableClick={onVariableClick}
              activeVariables={activeVariables}
              isCollapsed={true}
              onToggleCollapse={() => setIsVariablesPanelOpen(true)}
              isMobile={false}
            />
          )}
          <MobileDrawer
            isOpen={isVariablesPanelOpen}
            onClose={() => setIsVariablesPanelOpen(false)}
            side="right"
          >
            <VariablesPanel
              perfilJson={perfilJson}
              onVariableClick={onVariableClick}
              activeVariables={activeVariables}
              isCollapsed={false}
              onToggleCollapse={() => setIsVariablesPanelOpen(false)}
              isMobile={true}
              inDrawer={true}
            />
          </MobileDrawer>
        </>
      ) : (
        <VariablesPanel
          perfilJson={perfilJson}
          onVariableClick={onVariableClick}
          activeVariables={activeVariables}
          isCollapsed={isVariablesPanelCollapsed}
          onToggleCollapse={toggleVariablesPanel}
          isMobile={false}
        />
      )}
    </Suspense>
  );
}
