import type { Convenio, PerfilJson, UserConvenio } from "@core/types";
import { E2E_MOCK_CONVENIOS, E2E_MOCK_USER_CONVENIOS, isE2ETesting } from "@/application/use-cases/e2e";
import type { IConvenioRepository } from "@/application/ports";

interface ConvenioDeps {
  repo: IConvenioRepository;
}

export async function getConvenioById(
  id: string | null,
  deps: ConvenioDeps,
): Promise<Convenio | null> {
  if (!id) return null;
  return deps.repo.getById(id);
}

export async function listConvenios(
  input: {
    searchTerm?: string;
    authenticatedUserId?: string | null;
  },
  deps: ConvenioDeps,
): Promise<Convenio[]> {
  if (isE2ETesting) {
    if (input.searchTerm && input.searchTerm.trim().length > 0) {
      const needle = input.searchTerm.toLowerCase();
      return E2E_MOCK_CONVENIOS.filter((c) =>
        c.nombre.toLowerCase().includes(needle),
      );
    }
    return E2E_MOCK_CONVENIOS;
  }
  return deps.repo.list(input);
}

export async function listUserConvenios(
  userId: string | null,
  deps: ConvenioDeps,
): Promise<UserConvenio[]> {
  if (isE2ETesting) return E2E_MOCK_USER_CONVENIOS;
  if (!userId) return [];
  return deps.repo.listOwnedByUser(userId);
}

export async function getConvenioVariables(
  convenioId: string | null,
  deps: ConvenioDeps,
): Promise<PerfilJson | null> {
  if (!convenioId) return null;
  return deps.repo.getPerfil(convenioId);
}

/**
 * Abre el PDF oficial del convenio en una pestaña nueva.
 * Si se pasa `options.page`, se añade `#page=N` al final de la URL firmada para
 * que el visor de PDF del navegador navegue directamente a esa página.
 * Side effect: window.open. Solo se usa desde la UI tras un click.
 */
export async function openConvenioPdf(
  convenioId: string,
  deps: ConvenioDeps,
  options?: { page?: number | null },
): Promise<void> {
  try {
    const url = await deps.repo.getSignedPdfUrl(convenioId);
    if (!url) return;
    const page = options?.page;
    const target = typeof page === "number" && page > 0
      ? `${url}#page=${page}`
      : url;
    window.open(target, "_blank", "noopener,noreferrer");
  } catch (err) {
    console.error("[openConvenioPdf] unexpected error", err);
  }
}
