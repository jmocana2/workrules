/**
 * Expansión de vecinos: dado un set de chunks recuperados por búsqueda
 * vectorial, trae los chunks hermanos del mismo `articulo` o `seccion` para
 * que respuestas enumerables (áreas, grupos, categorías) lleguen completas al
 * LLM aunque la búsqueda solo haya puntuado alto al primero.
 *
 * Estrategia:
 *   1. Para cada chunk recuperado, mira si tiene `articulo` o, en su defecto,
 *      `seccion` en metadata.
 *   2. Por cada grupo único (articulo o seccion), pide a la BD todos los chunks
 *      de ese grupo en este convenio (función `fetchGroup`).
 *   3. Fusiona los originales con los vecinos, deduplica por `chunkId` y
 *      mantiene la `similarity` original cuando existe (los vecinos añadidos
 *      llevan similarity = 0 para que no afecten al ranking).
 *   4. Limita el total a `EXPANDED_CHUNK_CAP` para no inflar el contexto.
 *
 * Si la consulta falla para algún grupo, se ignora silenciosamente y se
 * devuelve lo que se haya podido reunir; nunca debe romper el flujo principal.
 */

import type { RetrievedChunk } from "../../ports/dtos.ts";
import { EXPANDED_CHUNK_CAP } from "../rag/config.ts";
import type { AskQuestionDeps } from "./types.ts";

type ChunkGroup = { key: "articulo" | "seccion"; value: string };

type FetchGroupFn = AskQuestionDeps["getChunksByGroup"];

function detectChunkGroups(
  base: RetrievedChunk[],
): Map<string, ChunkGroup> {
  const groups = new Map<string, ChunkGroup>();
  for (const chunk of base) {
    const meta = chunk.metadata as Record<string, unknown>;
    const articulo = typeof meta?.articulo === "string"
      ? meta.articulo.trim()
      : "";
    const seccion = typeof meta?.seccion === "string"
      ? meta.seccion.trim()
      : "";

    if (articulo) {
      groups.set(`articulo:${articulo}`, { key: "articulo", value: articulo });
    } else if (seccion) {
      groups.set(`seccion:${seccion}`, { key: "seccion", value: seccion });
    }
  }
  return groups;
}

async function fetchNeighborsForGroups(
  groups: ChunkGroup[],
  convenioId: string,
  fetchGroup: FetchGroupFn,
): Promise<RetrievedChunk[][]> {
  return await Promise.all(
    groups.map((g) =>
      fetchGroup(convenioId, g.key, g.value).catch((err) => {
        console.error(
          `[ask-question] Error expanding chunks for ${g.key}=${g.value}:`,
          err,
        );
        return [] as RetrievedChunk[];
      })
    ),
  );
}

function mergeChunks(
  base: RetrievedChunk[],
  neighborResults: RetrievedChunk[][],
): RetrievedChunk[] {
  const byId = new Map<string, RetrievedChunk>();
  for (const c of base) byId.set(c.chunkId, c);

  for (const list of neighborResults) {
    for (const neighbor of list) {
      if (!byId.has(neighbor.chunkId)) {
        byId.set(neighbor.chunkId, neighbor);
      }
    }
  }

  // Ordenar: similarity desc primero, luego numero_chunk asc para los vecinos
  // (orden natural del documento).
  return Array.from(byId.values()).sort((a, b) => {
    if (a.similarity !== b.similarity) return b.similarity - a.similarity;
    const ia = (a.metadata as Record<string, unknown>)?.numero_chunk as
      | number
      | undefined;
    const ib = (b.metadata as Record<string, unknown>)?.numero_chunk as
      | number
      | undefined;
    return (ia ?? 0) - (ib ?? 0);
  });
}

export async function expandChunksWithNeighbors(
  base: RetrievedChunk[],
  convenioId: string,
  fetchGroup: FetchGroupFn,
): Promise<RetrievedChunk[]> {
  if (base.length === 0) return base;

  const groups = detectChunkGroups(base);
  if (groups.size === 0) return base;

  const neighborResults = await fetchNeighborsForGroups(
    Array.from(groups.values()),
    convenioId,
    fetchGroup,
  );

  return mergeChunks(base, neighborResults).slice(0, EXPANDED_CHUNK_CAP);
}
