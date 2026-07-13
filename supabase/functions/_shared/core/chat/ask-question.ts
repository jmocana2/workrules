/**
 * Shim de compatibilidad: re-exporta el use case AskQuestion desde su carpeta.
 *
 * Los consumidores existentes (`handlers.ts`, `calculate-salary.ts`, tests)
 * siguen importando `from "./ask-question.ts"` sin cambios. La implementación
 * vive ahora en `./ask-question/`.
 */

export * from "./ask-question/index.ts";
