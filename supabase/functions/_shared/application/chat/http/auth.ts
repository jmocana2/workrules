// supabase/functions/_shared/core/chat/http/auth.ts

import { verifyUserToken } from "../../../lib/supabase.ts";

/**
 * Extrae el userId del token JWT de Supabase Auth
 *
 * @param req - Request HTTP con header Authorization
 * @returns userId si el token es valido, null si no
 */
export async function extractUserIdFromRequest(
  req: Request,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length);

  if (!token) {
    return null;
  }

  return verifyUserToken(token);
}
