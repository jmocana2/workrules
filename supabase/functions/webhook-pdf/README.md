# Webhook PDF Edge Function

Webhook que recibe notificaciones de Supabase Storage cuando se sube un nuevo PDF de convenio colectivo.

## Endpoint

```
POST /functions/v1/webhook-pdf
```

## Estado

**Estado:** Not Implemented (Fase 3+)
**Codigo:** 501

## Descripcion

Esta funcion actua como receptor de webhooks desde Supabase Storage. Cuando se sube un PDF a la carpeta de convenios, esta funcion sera notificada y disparara el pipeline de procesamiento en n8n.

### Flujo previsto (Fase 3+)

1. Recibir webhook de Supabase Storage (INSERT en bucket)
2. Validar que el archivo sea un PDF
3. Extraer `convenio_id` del path (`convenios/{convenio_id}/archivo.pdf`)
4. Disparar workflow de n8n via HTTP
5. n8n procesa: PDF -> LlamaParse -> Chunks -> Embeddings -> PostgreSQL

## Request

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer <supabase_anon_key>` | Si |
| `Content-Type` | `application/json` | Si |

### Webhook Payload (Supabase Storage)

```typescript
interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";  // Tipo de evento
  table: string;                          // Tabla origen
  record: {
    id: string;                           // ID del objeto
    name: string;                         // Nombre del archivo
    bucket_id: string;                    // ID del bucket
    [key: string]: unknown;
  };
  old_record?: Record<string, unknown>;   // Solo en UPDATE/DELETE
}
```

### Ejemplo de payload

```json
{
  "type": "INSERT",
  "table": "objects",
  "record": {
    "id": "abc123",
    "name": "convenios/66499/convenio-comercio-2024.pdf",
    "bucket_id": "convenios"
  }
}
```

## Response

### Not Implemented (501)

```json
{
  "status": "not_implemented",
  "message": "webhook-pdf: Pendiente de implementacion (Fase 3+)"
}
```

### Errores previstos

| Codigo | Descripcion |
|--------|-------------|
| 400 | Payload invalido o estructura incorrecta |
| 400 | Archivo no es PDF |
| 400 | No se pudo extraer convenio_id del path |
| 500 | Error al disparar workflow de n8n |

## Estructura de paths esperada

Los PDFs deben subirse siguiendo esta convencion:

```
convenios/{convenio_id}/{nombre_archivo}.pdf
```

Ejemplos validos:
- `convenios/66499/convenio-comercio-2024.pdf`
- `convenios/12345/texto-consolidado.pdf`

## Ejemplo con cURL

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/webhook-pdf' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "INSERT",
    "table": "objects",
    "record": {
      "id": "abc123",
      "name": "convenios/66499/convenio-comercio-2024.pdf",
      "bucket_id": "convenios"
    }
  }'
```

## Archivos relacionados

- `index.ts` - Punto de entrada de la funcion
- `handlers.ts` - Logica de validacion y utilidades
- `../_shared/lib/cors.ts` - Configuracion CORS

## Configuracion del webhook en Supabase

Para activar este webhook cuando se implemente:

1. Ir a Supabase Dashboard > Database > Webhooks
2. Crear nuevo webhook apuntando a `/functions/v1/webhook-pdf`
3. Configurar trigger en tabla `storage.objects`
4. Filtrar por `bucket_id = 'convenios'` y operacion `INSERT`

## Integracion con n8n

El workflow de n8n que procesara los PDFs:

```
Webhook (esta funcion)
  -> n8n HTTP Trigger
  -> Descargar PDF de Storage
  -> LlamaParse API
  -> Chunking
  -> Embeddings (OpenAI)
  -> Upsert PostgreSQL
```
