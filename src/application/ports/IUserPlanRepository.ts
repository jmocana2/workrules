export type UserPlan = "free" | "premium" | "enterprise";

/**
 * Puerto para consultar el plan/subscription tier del usuario.
 */
export interface IUserPlanRepository {
  /** Plan del usuario. Si no existe perfil devuelve `'free'`. */
  getPlan(userId: string): Promise<UserPlan>;
}
