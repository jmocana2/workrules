import { useQuery } from "@tanstack/react-query";
import type { UserConvenio } from "@core/types";
import { useRepositories } from "@/providers/RepositoriesProvider";
import { isE2ETesting, listUserConvenios } from "@/application/use-cases";
import { useSupabase } from "./useSupabase";

export function useUserConvenios() {
  const { convenio } = useRepositories();
  const { user } = useSupabase();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ["user-convenios", userId],
    queryFn: (): Promise<UserConvenio[]> =>
      listUserConvenios(userId, { repo: convenio }),
    staleTime: 30 * 1000,
    enabled: isE2ETesting || userId !== null,
  });
}
