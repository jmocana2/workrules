/**
 * Barrel del use case CalculateSalary.
 * Los consumidores externos importan desde aquí (o desde `../calculate-salary.ts`,
 * que en el paso 3 pasará a ser un shim que re-exporta este módulo).
 */

export { defaultDeps } from "./deps.ts";
export type { CalculateSalaryDeps, CalculateSalaryResult } from "./types.ts";
