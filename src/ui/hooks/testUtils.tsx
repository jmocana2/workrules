import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import {
  RepositoriesProvider,
  type Repositories,
} from "@/providers/RepositoriesProvider";

/**
 * Wrapper para tests de hooks que necesitan QueryClient y Repositories.
 * Pasa `repositories` para inyectar fakes en cualquier puerto.
 */
export function createTestWrapper(repositories?: Partial<Repositories>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RepositoriesProvider value={repositories}>{children}</RepositoriesProvider>
    </QueryClientProvider>
  );
}

/**
 * Variante que tambien expone el QueryClient para tests que necesitan
 * espiar invalidaciones (p.ej. mutations).
 */
export function createTestWrapperWithClient(
  repositories?: Partial<Repositories>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RepositoriesProvider value={repositories}>{children}</RepositoriesProvider>
    </QueryClientProvider>
  );
  return { Wrapper, queryClient };
}
