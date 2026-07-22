/** Mensaje del historial de conversación */
export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/** Request del endpoint POST /chat */
export interface ChatRequest {
  convenio_id: string;
  pregunta: string;
  variables?: Record<string, string>;
  session_id?: string;
  stream?: boolean;
  /** Historial de mensajes anteriores para contexto multi-turno */
  messages?: ChatHistoryMessage[];
  /** Modo forzado por el usuario. Sobrescribe la heuristica de clasificacion.
   *  - 'salary': fuerza calculateSalary
   *  - undefined: comportamiento heuristico (default) */
  mode?: "salary";
}

/** Respuesta no-streaming */
export interface ChatResponse {
  status: "ok" | "error" | "incomplete";
  respuesta: string;
  fuentes: ChatCitation[];
  metadata: ChatMetadata;
}

/** Citacion a un articulo del convenio o a una tabla/anexo sin articulo */
export interface ChatCitation {
  articulo?: string;
  seccion: string | null;
  chunk_id: string;
  relevance_score: number;
  url_pdf: string | null;
  pagina: number | null;
}

/** Metadata de la respuesta */
export interface ChatMetadata {
  model: string;
  tokens_used: number;
  chunks_retrieved: number;
  cache_hit: boolean;
  classification: "general" | "salary" | "incomplete" | "invalid";
  latency_ms: number;
}

/** Evento SSE para streaming */
export type SSEEvent =
  | { type: "text"; content: string }
  | { type: "citation"; articulo?: string; seccion: string | null; url_pdf: string | null; pagina: number | null }
  | { type: "done"; metadata: ChatMetadata }
  | { type: "error"; message: string };

// ============================================
// CALCULATE SALARY TYPES
// ============================================

/**
 * Variables extraidas del mensaje del usuario
 */
export interface ExtractedVariables {
  categoria?: string;
  jornada?: "completa" | "parcial";
  horasSemanales?: number;
  horasExtra?: number;
  horasNocturnas?: number;
  antiguedadAnos?: number;
  nivelEstablecimiento?: string;
  /** Otras variables especificas del convenio */
  [key: string]: string | number | undefined;
}

/**
 * Estado de clasificacion de datos
 */
export type DataState = "complete" | "incomplete" | "invalid" | "conflicting";

/**
 * Variable invalida con detalle del error
 */
export interface InvalidVariable {
  name: string;
  reason: string;
  value: unknown;
}

/**
 * Variables en conflicto
 */
export interface ConflictingVariables {
  variables: string[];
  reason: string;
}

/**
 * Resultado de la clasificacion de datos
 */
export interface DataClassificationResult {
  state: DataState;
  extractedVariables: ExtractedVariables;
  /** Variables identificadoras faltantes: bloquean el calculo */
  missingVariables: string[];
  /** Variables moduladoras faltantes: NO bloquean; Claude asume default */
  missingModulators?: string[];
  invalidVariables: InvalidVariable[];
  conflictingVariables: ConflictingVariables[];
  /** Variable -> opciones validas del perfil */
  suggestions: Record<string, string[]>;
}

/**
 * Input para el calculo de salario
 */
export interface CalculateSalaryInput {
  /** Comando validado por `toChatCommand` en el router. */
  command: ChatCommandRef;
  /**
   * Perfil del convenio, pre-fetched por el router. `null` explícito significa
   * "el convenio no tiene perfil registrado".
   */
  perfil: Record<string, unknown> | null;
}

/**
 * Alias interno tipado laxo para evitar el ciclo con `domain/chat-command`
 * desde `core/chat/types.ts`. El use case lo trata como `ChatCommand`.
 */
type ChatCommandRef = import("../../domain/chat-command/chat-command.ts").ChatCommand;

/**
 * Metadata del calculo salarial
 */
export interface CalculateSalaryMetadata {
  cacheHit: boolean;
  chunksUsed: number;
  model: string;
  latencyMs: number;
  variablesUsadas: ExtractedVariables;
  /**
   * Variables resueltas con las claves crudas del perfil (las mismas que usa el
   * panel del frontend). Permite que el front sincronice los chips activos con
   * lo que el backend ha entendido del mensaje.
   */
  resolvedVariables?: Record<string, string>;
}

/**
 * Concepto del desglose salarial
 */
export interface SalaryBreakdownItem {
  nombre: string;
  importe: number;
}

/**
 * Desglose del calculo salarial
 */
export interface SalaryBreakdown {
  conceptos: SalaryBreakdownItem[];
  totalBruto: number;
}

/**
 * Resultado exitoso de calculo completo
 */
export interface CalculateSalarySuccess {
  type: "salary_calculated";
  response: string;
  metadata: CalculateSalaryMetadata;
  citations: ChatCitation[];
  desglose: SalaryBreakdown;
}

/**
 * Datos incompletos - necesita mas info
 */
export interface CalculateSalaryIncomplete {
  type: "incomplete_data";
  message: string;
  missingVariables: string[];
  suggestions: Record<string, string[]>;
  /** Citaciones de chunks recuperados (para mostrar Sources aunque falte info) */
  citations?: ChatCitation[];
  /**
   * Variables que SI se resolvieron en este turno, con claves crudas del perfil.
   * Permite que el front pre-marque los chips ya conocidos antes de mostrar el
   * DataRequestCard para las que faltan.
   */
  resolvedVariables?: Record<string, string>;
}

/**
 * Datos invalidos o conflictivos
 */
export interface CalculateSalaryInvalid {
  type: "invalid_data";
  message: string;
  invalidVariables: InvalidVariable[];
  conflictingVariables?: ConflictingVariables[];
  /** Citaciones de chunks recuperados (para mostrar Sources aunque haya error) */
  citations?: ChatCitation[];
}
