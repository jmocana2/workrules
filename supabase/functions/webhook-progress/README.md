# webhook-progress

Edge Function que recibe eventos de progreso emitidos por el workflow n8n `Workrules-Indexer` durante la indexación de un convenio y los persiste en la tabla `convenio_processing_status`. El frontend hace polling de esa tabla para mostrar el progreso real (no estimado) durante el upload.

## Endpoint

```
POST /functions/v1/webhook-progress
```

## Autenticación

Header `X-Webhook-Secret` con el valor de la variable de entorno `WEBHOOK_PROGRESS_SECRET`. No usa JWT (n8n no maneja sesión de usuario). La función escribe con `SERVICE_ROLE` para saltarse RLS.

| Variable de entorno | Descripción |
|---|---|
| `WEBHOOK_PROGRESS_SECRET` | Secreto compartido con n8n. Si falta, la función responde `500`. |
| `SUPABASE_URL` | Inyectada por Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Inyectada por Supabase. |

## Request

```json
{
  "convenio_id": "uuid",
  "stage": "parsing",
  "progress": 20,
  "message": "Leyendo el contenido del PDF…"
}
```

| Campo | Tipo | Validación |
|---|---|---|
| `convenio_id` | string | UUID v4 (regex `^[0-9a-f]{8}-...$`) |
| `stage` | string | Uno de: `queued`, `downloading`, `parsing`, `classifying`, `saving_markdown`, `chunking`, `embedding`, `profile`, `completed`, `failed` |
| `progress` | number | Entero 0..100 (se redondea si llega float) |
| `message` | string \| undefined | Opcional, texto humano para la UI |

## Contrato de stages emitidos por n8n

El workflow `Workrules-Indexer` emite los siguientes eventos (nodos `Notify Progress *`):

| Nodo n8n | stage | progress | message |
|---|---|---|---|
| Notify Progress Parsing | `parsing` | 20 | "Leyendo el contenido del PDF…" |
| Notify Progress Markdown | `saving_markdown` | 40 | "Guardando el contenido…" |
| Notify Progress Chunks | `chunking` | 60 | "Organizando la información…" |
| Notify Progress Profile | `profile` | 80 | "Extrayendo los datos del convenio…" / "Casi listo…" (si perfil saltado) |
| Notify Progress Completed | `completed` | 100 | "¡Listo!" |

Stages adicionales (`queued`, `downloading`, `classifying`, `embedding`, `failed`) están reservados en el enum pero el workflow actual no los emite.

## Respuestas

| Status | Significado |
|---|---|
| `200` | Evento persistido (upsert por `convenio_id`). |
| `400` | Body inválido (ver campo `error`). |
| `403` | `X-Webhook-Secret` ausente o incorrecto. |
| `405` | Método distinto de POST. |
| `500` | `WEBHOOK_PROGRESS_SECRET` no configurada o fallo en Supabase. |

## Tabla destino

`convenio_processing_status` — upsert por `convenio_id`:

```sql
CREATE TABLE convenio_processing_status (
  convenio_id UUID PRIMARY KEY REFERENCES convenios(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  progress INT NOT NULL CHECK (progress BETWEEN 0 AND 100),
  message TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Consumo desde frontend

`src/ui/hooks/useConvenioUpload.ts` hace polling de `convenio_processing_status` para mostrar `stage`/`progress`/`message` en vez de la curva estimada anterior.

## Notas

- La función responde rápido para no bloquear al workflow (n8n trata el `200` como ACK).
- No tiene rate limit propio; está protegida por el secret. Si se expone públicamente, considerar añadir uno.
