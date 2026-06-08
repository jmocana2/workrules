import type { SupabaseClient } from "@supabase/supabase-js";
import type { IUserPlanRepository, UserPlan } from "@/application/ports";

/**
 * Adaptador Supabase para el plan/subscription tier del usuario.
 */
export class SupabaseUserPlanRepository implements IUserPlanRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getPlan(userId: string): Promise<UserPlan> {
    const { data, error } = await this.client
      .from("user_profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    const tier = data?.subscription_tier as UserPlan | undefined;
    return tier ?? "free";
  }
}
