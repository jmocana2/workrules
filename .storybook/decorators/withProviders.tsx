import type { Decorator, StoryContext } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, type ReactElement } from "react";
import {
  RepositoriesProvider,
  type Repositories,
} from "@/providers/RepositoriesProvider";
import type { Convenio, ConversationSummary, PerfilJson, UserConvenio } from "@core/types";
import type { UserPlan } from "@/application/ports";
import {
  createFakeChatSessionRepository,
  createFakeConvenioRepository,
  createFakeConvenioUploadRepository,
  createFakeUserPlanRepository,
} from "../mocks/fakeRepositories";

export interface StorybookMockData {
  convenios?: Convenio[];
  userConvenios?: UserConvenio[];
  conversations?: ConversationSummary[];
  perfil?: PerfilJson | null;
  userPlan?: UserPlan;
  /** Repositorios para sobrescribir por completo. Para casos avanzados. */
  repositories?: Partial<Repositories>;
}

declare module "@storybook/react-vite" {
  interface Parameters {
    mockData?: StorybookMockData;
  }
}

interface ProvidersProps {
  children: ReactElement;
  mockData: StorybookMockData;
}

function Providers({ children, mockData }: ProvidersProps) {
  const repositories = useMemo<Partial<Repositories>>(
    () => ({
      convenio: createFakeConvenioRepository({
        convenios: mockData.convenios ?? [],
        userConvenios: mockData.userConvenios ?? [],
        perfil: mockData.perfil ?? null,
      }),
      chatSession: createFakeChatSessionRepository(mockData.conversations ?? []),
      userPlan: createFakeUserPlanRepository(mockData.userPlan ?? "free"),
      convenioUpload: createFakeConvenioUploadRepository(),
      ...mockData.repositories,
    }),
    [mockData],
  );

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
          mutations: { retry: false },
        },
      }),
    // Cliente fresco cuando cambia el mockData para evitar cache contaminado entre stories.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mockData],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoriesProvider value={repositories}>{children}</RepositoriesProvider>
    </QueryClientProvider>
  );
}

export const withProviders: Decorator = (Story, context: StoryContext) => {
  const mockData = (context.parameters.mockData ?? {}) as StorybookMockData;
  return (
    <Providers mockData={mockData}>
      <Story />
    </Providers>
  );
};
