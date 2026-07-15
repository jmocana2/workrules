/**
 * Barrel del use case CalculateSalary.
 * Los consumidores externos importan desde aquí.
 */

export { calculateSalary, isSalaryQuery } from "./calculate-salary.ts";
export { defaultDeps } from "./deps.ts";
export type { CalculateSalaryDeps, CalculateSalaryResult } from "./types.ts";
