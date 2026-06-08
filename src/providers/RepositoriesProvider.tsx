import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getSupabaseClient } from "@/infrastructure/clients/supabaseClient";
import {
  SupabaseChatSessionRepository,
  SupabaseConvenioRepository,
  SupabaseConvenioUploadRepository,
  SupabaseUserPlanRepository,
} from "@/infrastructure/repositories";
import type {
  IChatSessionRepository,
  IConvenioRepository,
  IConvenioUploadRepository,
  IUserPlanRepository,
} from "@/application/ports";

/**
 * Conjunto de repositorios inyectables. La UI los consume via useRepositories().
 * En tests, pasar `value` al provider con fakes que implementen los puertos.
 */
export interface Repositories {
  convenio: IConvenioRepository;
  chatSession: IChatSessionRepository;
  userPlan: IUserPlanRepository;
  convenioUpload: IConvenioUploadRepository;
}

const RepositoriesContext = createContext<Repositories | null>(null);

interface RepositoriesProviderProps {
  children: ReactNode;
  /** Override completo o parcial — util para tests/Storybook. */
  value?: Partial<Repositories>;
}

/**
 * Instancia los adaptadores Supabase una unica vez y los expone por contexto.
 * Si se pasa `value`, lo fusiona sobre los defaults (los tests pueden sustituir
 * solo los repositorios que les interesan).
 */
export function RepositoriesProvider({
  children,
  value,
}: RepositoriesProviderProps) {
  const repositories = useMemo<Repositories>(() => {
    const client = getSupabaseClient();
    const defaults: Repositories = {
      convenio: new SupabaseConvenioRepository(client),
      chatSession: new SupabaseChatSessionRepository(client),
      userPlan: new SupabaseUserPlanRepository(client),
      convenioUpload: new SupabaseConvenioUploadRepository(client),
    };
    return { ...defaults, ...value };
  }, [value]);

  return (
    <RepositoriesContext.Provider value={repositories}>
      {children}
    </RepositoriesContext.Provider>
  );
}

/**
 * Hook para acceder a los repositorios desde cualquier componente o hook UI.
 * Lanza si se usa fuera de RepositoriesProvider (error de programacion).
 */
export function useRepositories(): Repositories {
  const ctx = useContext(RepositoriesContext);
  if (!ctx) {
    throw new Error(
      "useRepositories debe usarse dentro de <RepositoriesProvider>",
    );
  }
  return ctx;
}
