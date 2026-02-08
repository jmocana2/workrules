// supabase/functions/webhook-pdf/handlers.ts

export interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    name: string;
    bucket_id: string;
    [key: string]: unknown;
  };
  old_record?: Record<string, unknown>;
}

export interface WebhookResponse {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Valida que el payload sea un webhook válido de Supabase Storage
 */
export function validateWebhookPayload(body: unknown): {
  valid: boolean;
  error?: string;
  payload?: WebhookPayload;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid payload' };
  }

  const payload = body as Partial<WebhookPayload>;

  if (!payload.type) {
    return { valid: false, error: 'Missing type field' };
  }

  if (!['INSERT', 'UPDATE', 'DELETE'].includes(payload.type)) {
    return { valid: false, error: 'Invalid type value' };
  }

  if (!payload.record) {
    return { valid: false, error: 'Missing record field' };
  }

  if (!payload.record.id || !payload.record.name) {
    return { valid: false, error: 'Invalid record structure' };
  }

  return { valid: true, payload: payload as WebhookPayload };
}

/**
 * Verifica si el archivo es un PDF válido para procesar
 */
export function isPdfFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

/**
 * Extrae el convenio_id del path del archivo
 * Esperamos: convenios/{convenio_id}/{filename}.pdf
 */
export function extractConvenioId(path: string): string | null {
  const parts = path.split('/');
  if (parts.length >= 2 && parts[0] === 'convenios') {
    return parts[1];
  }
  return null;
}

/**
 * Construye respuesta de not implemented (placeholder)
 */
export function buildNotImplementedResponse(): WebhookResponse {
  return {
    status: 501,
    body: {
      status: 'not_implemented',
      message: 'webhook-pdf: Pendiente de implementacion (Fase 3+)',
    },
  };
}

/**
 * Construye respuesta de error
 */
export function buildWebhookErrorResponse(
  status: number,
  error: string
): WebhookResponse {
  return {
    status,
    body: { error },
  };
}
