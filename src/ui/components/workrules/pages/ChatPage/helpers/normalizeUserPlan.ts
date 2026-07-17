/**
 * Colapsa el plan del usuario al par que entiende el Sidebar (`free` | `premium`).
 * `enterprise` hereda los privilegios de `premium`.
 */
export function normalizeUserPlan(plan: 'free' | 'premium' | 'enterprise'): 'free' | 'premium' {
  return plan === 'free' ? 'free' : 'premium';
}
