/** El Sidebar solo distingue free vs premium; enterprise hereda los privilegios de premium. */
export function normalizeUserPlan(plan: 'free' | 'premium' | 'enterprise'): 'free' | 'premium' {
  return plan === 'free' ? 'free' : 'premium';
}
