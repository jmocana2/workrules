import type { IUserPlanRepository, UserPlan } from "@/application/ports";

interface UserPlanDeps {
  repo: IUserPlanRepository;
}

export async function getUserPlan(
  userId: string | null,
  deps: UserPlanDeps,
): Promise<UserPlan> {
  if (!userId) return "free";
  return deps.repo.getPlan(userId);
}
