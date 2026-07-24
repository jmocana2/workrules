// supabase/functions/_shared/domain/value-objects/uuid.ts
//
// Regex compartida para UUID v4 (RFC 4122). Se centraliza aquí para evitar
// duplicarla en cada VO de identificador.

// UUID v4: xxxxxxxx-xxxx-4xxx-[8|9|a|b]xxx-xxxxxxxxxxxx
// - dígito 13 debe ser "4" (versión)
// - dígito 17 debe estar en [8-b] (variante)
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isUuidV4(value: string): boolean {
  return UUID_V4_REGEX.test(value.toLowerCase());
}
