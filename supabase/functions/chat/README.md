# Chat Edge Function

Endpoint principal para consultas sobre convenios colectivos usando RAG (Retrieval-Augmented Generation).

## Endpoint

```
POST /functions/v1/chat
```

## Estado

**Versión:** 0.1.0
**Estado:** Scaffold operativo (RAG pendiente en I2.8)

## Descripcion

Esta función recibe preguntas en lenguaje natural sobre convenios colectivos y devuelve respuestas contextualizadas. Actualmente retorna un placeholder mientras se implementa el pipeline RAG completo.

### Flujo previsto (I2.8+)

1. Recibir pregunta + convenio_id
2. Generar embedding de la pregunta
3. Buscar chunks relevantes en pgvector
4. Construir prompt con contexto
5. Llamar a Claude 3.5 Sonnet
6. Retornar respuesta con citaciones

## Request

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer <supabase_anon_key>` | Si |
| `Content-Type` | `application/json` | Si |

### Body

```typescript
interface ChatRequest {
  convenio_id: string;      // ID del convenio a consultar (requerido)
  pregunta: string;         // Pregunta en lenguaje natural (requerido, min 3 chars)
  variables?: Record<string, string>;  // Variables del perfil del usuario
  session_id?: string;      // ID de sesion para contexto conversacional
  stream?: boolean;         // Activar streaming SSE (futuro)
}
```

### Ejemplo

```json
{
  "convenio_id": "66499",
  "pregunta": "¿Cuantos dias de vacaciones corresponden?",
  "session_id": "test-session-123"
}
```

## Response

### Exito (200)

```typescript
interface ChatResponse {
  status: 'ok' | 'error' | 'incomplete';
  respuesta: string;
  fuentes: ChatCitation[];
  metadata: ChatMetadata;
}

interface ChatCitation {
  articulo: string;
  seccion: string | null;
  chunk_id: string;
  relevance_score: number;
}

interface ChatMetadata {
  model: string;
  tokens_used: number;
  chunks_retrieved: number;
  cache_hit: boolean;
  classification: 'general' | 'salary' | 'incomplete' | 'invalid';
  latency_ms: number;
}
```

### Errores

| Codigo | Descripcion |
|--------|-------------|
| 400 | Body JSON invalido o campos requeridos faltantes |
| 405 | Metodo no permitido (solo POST) |
| 500 | Error interno del servidor |

## Ejemplo con cURL

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/chat' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --header 'Content-Type: application/json' \
  --data '{
    "convenio_id": "66499",
    "pregunta": "¿Cuantos dias de vacaciones corresponden?",
    "session_id": "test-session-123"
  }'
```

## Archivos relacionados

- `index.ts` - Punto de entrada de la funcion
- `../_shared/application/chat/types.ts` - Definicion de tipos
- `../_shared/application/chat/handlers.ts` - Logica de validacion y procesamiento
- `../_shared/lib/cors.ts` - Configuracion CORS

## Streaming (futuro)

Cuando `stream: true`, la respuesta sera via Server-Sent Events:

```typescript
type SSEEvent =
  | { type: 'text'; content: string }
  | { type: 'citation'; articulo: string; seccion: string | null }
  | { type: 'done'; metadata: ChatMetadata }
  | { type: 'error'; message: string };
```
