# _shared/lib - Servicios de Infraestructura

Modulos de infraestructura para las Edge Functions de WorkRules. Encapsulan integraciones con servicios externos (APIs, bases de datos) siguiendo un patron funcional optimizado para entornos serverless.

---

## Arquitectura

```
_shared/lib/
├── openai.ts          # Servicio de Embeddings (OpenAI) ✅
├── openai.test.ts     # Tests unitarios
├── openai.integration.test.ts  # Test de integracion
├── anthropic.ts       # Servicio de IA (Claude) con streaming ✅
├── anthropic.test.ts  # Tests unitarios
├── anthropic.integration.test.ts  # Test de integracion
├── supabase.ts        # Repository de BD (PostgreSQL + pgvector) ✅
├── supabase.test.ts   # Tests unitarios
├── cors.ts            # Headers CORS ✅
├── cors.test.ts       # Tests unitarios
└── README.md          # Este archivo
```

### Patron de diseno

**Funciones exportadas** en lugar de clases:

```typescript
// SI - Patron funcional (sin estado, cold start rapido)
export async function embedQuestion(text: string): Promise<number[]>

// NO - Patron OOP (overhead innecesario en serverless)
class OpenAIService { ... }
```

**Ventajas:**
- Sin overhead de instanciacion en cada request
- Stateless por defecto
- Testing directo con imports
- Idomiatico en Deno/Edge Functions

---

## Modulos

### openai.ts - Servicio de Embeddings

**Estado:** ✅ Implementado (I2.3)

Convierte texto a vectores de embedding usando OpenAI `text-embedding-3-small`.

#### Funcion principal

```typescript
import { embedQuestion } from '../_shared/lib/openai.ts';

const embedding = await embedQuestion("Cual es el salario de un camarero?");
console.log(embedding.length); // 1536
```

#### Especificaciones

| Parametro | Valor |
|-----------|-------|
| Modelo | `text-embedding-3-small` |
| Dimensiones | 1536 |
| Max input | ~8000 tokens (~32000 chars) |
| Timeout | 30 segundos |
| Retries | 3 (backoff exponencial) |

#### Manejo de errores

```typescript
import { embedQuestion, EmbeddingError } from '../_shared/lib/openai.ts';

try {
  const embedding = await embedQuestion(text);
} catch (error) {
  if (error instanceof EmbeddingError) {
    switch (error.code) {
      case 'INVALID_INPUT':  // Texto vacio o null
      case 'API_ERROR':      // Error de OpenAI
      case 'RATE_LIMIT':     // 429 despues de reintentos
      case 'TIMEOUT':        // Timeout despues de reintentos
    }
  }
}
```

#### Validacion automatica

- Rechaza `null`, `undefined`, strings vacios
- Elimina espacios innecesarios (trim)
- Trunca textos > 32000 caracteres con warning

#### Retry con backoff exponencial

```
Intento 1 -> Falla (429 o 5xx)
  [espera 1s]
Intento 2 -> Falla
  [espera 2s]
Intento 3 -> Falla
  [espera 4s]
Intento 4 -> Exito o Error final
```

#### Variables de entorno

| Variable | Requerida | Descripcion |
|----------|-----------|-------------|
| `OPENAI_API_KEY` | Si | API key de OpenAI |

```bash
# Produccion
supabase secrets set OPENAI_API_KEY=sk-...

# Local
echo "OPENAI_API_KEY=sk-..." >> supabase/.env.local
```

---

### supabase.ts - Repository de Base de Datos

**Estado:** ✅ Implementado (I2.2)

Encapsula todas las operaciones con PostgreSQL y pgvector.

#### Funciones disponibles

```typescript
import {
  // Busqueda vectorial
  searchChunksByConvenio,

  // Datos de convenio
  getPerfilByConvenio,
  getConvenioById,

  // Semantic cache
  searchSemanticCache,
  saveToSemanticCache,

  // Chat
  getOrCreateChatSession,
  saveChatMessage,

  // Cuotas
  checkUserQuota,
  incrementQueryCount,
} from '../_shared/lib/supabase.ts';
```

#### Ejemplo: Busqueda RAG

```typescript
// 1. Generar embedding de la pregunta
const embedding = await embedQuestion("Cual es el salario base?");

// 2. Buscar chunks relevantes
const chunks = await searchChunksByConvenio(
  embedding,
  convenioId,
  5,    // limit
  0.7   // threshold
);

// 3. Obtener perfil JSON
const perfil = await getPerfilByConvenio(convenioId);
```

#### Manejo de errores

```typescript
import { RepositoryError } from '../_shared/lib/supabase.ts';

try {
  const convenio = await getConvenioById(id);
} catch (error) {
  if (error instanceof RepositoryError) {
    switch (error.code) {
      case 'NOT_FOUND':     // Registro no existe
      case 'DB_ERROR':      // Error de conexion/query
      case 'QUOTA_EXCEEDED': // Usuario sin cuota
      case 'INVALID_INPUT': // Parametros invalidos
    }
  }
}
```

#### Variables de entorno

| Variable | Requerida | Descripcion |
|----------|-----------|-------------|
| `SUPABASE_URL` | Si | URL del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Si | Key con bypass RLS |

---

### anthropic.ts - Servicio de IA (Claude)

**Estado:** ✅ Implementado (I2.4)

Cliente para llamadas a Claude con streaming SSE.

#### Funciones principales

```typescript
import { streamChatResponse, createChatResponse } from '../_shared/lib/anthropic.ts';

// Con streaming (para Edge Functions)
const stream = await streamChatResponse({
  systemPrompt: "Eres un experto en convenios colectivos...",
  userMessage: "Cual es el salario base de un camarero?",
});

return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' }
});

// Sin streaming (para tests o cache)
const response = await createChatResponse({
  systemPrompt: "...",
  userMessage: "...",
});
```

#### Especificaciones

| Parametro | Valor |
|-----------|-------|
| Modelo | `claude-sonnet-4-20250514` |
| Max tokens | 2048 (configurable) |
| Temperature | 0.3 (configurable) |
| Context window | 200K tokens |

#### Formato SSE

El streaming emite eventos en formato Server-Sent Events:

```
data: {"type":"text","content":"El "}

data: {"type":"text","content":"salario "}

data: {"type":"done"}
```

#### Manejo de errores

```typescript
import { streamChatResponse, AnthropicError } from '../_shared/lib/anthropic.ts';

try {
  const stream = await streamChatResponse(options);
} catch (error) {
  if (error instanceof AnthropicError) {
    switch (error.code) {
      case 'INVALID_INPUT':  // Parametros invalidos
      case 'AUTH_ERROR':     // API key invalida (401)
      case 'RATE_LIMIT':     // Limite excedido (429)
      case 'OVERLOADED':     // API sobrecargada (529)
      case 'API_ERROR':      // Error del servidor (5xx)
    }
    // error.retryable indica si se puede reintentar
  }
}
```

#### Variables de entorno

| Variable | Requerida | Descripcion |
|----------|-----------|-------------|
| `ANTHROPIC_API_KEY` | Si | API key de Anthropic |

```bash
# Produccion
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Local
echo "ANTHROPIC_API_KEY=sk-ant-..." >> supabase/.env.local
```

---

### cors.ts - Headers CORS

**Estado:** ✅ Implementado

Headers CORS para respuestas HTTP.

```typescript
import { corsHeaders } from '../_shared/lib/cors.ts';

// En handler
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}

// En respuesta
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

---

## Testing

### Ejecutar todos los tests

```bash
cd supabase/functions
deno task test
```

### Tests por modulo

```bash
# OpenAI (unitarios)
deno task test _shared/lib/openai.test.ts

# OpenAI (integracion - requiere API key)
OPENAI_API_KEY=sk-... deno test --allow-env --allow-net _shared/lib/openai.integration.test.ts

# Supabase
deno task test _shared/lib/supabase.test.ts

# CORS
deno task test _shared/lib/cors.test.ts

# Anthropic (unitarios)
deno task test _shared/lib/anthropic.test.ts

# Anthropic (integracion - requiere API key)
ANTHROPIC_API_KEY=sk-ant-... deno test --allow-env --allow-net _shared/lib/anthropic.integration.test.ts
```

### Coverage actual

| Modulo | Tests | Estado |
|--------|-------|--------|
| openai.ts | 17 unitarios + 1 integracion | ✅ |
| supabase.ts | 33 unitarios | ✅ |
| cors.ts | 4 unitarios | ✅ |
| anthropic.ts | 21 unitarios + 3 integracion | ✅ |

---

## Dependencias

```json
// deno.json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@^1.0.0",
    "@std/testing": "jsr:@std/testing@^1.0.0",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## Documentacion relacionada

- [Estrategia de Testing](../../../../docs/tests/estrategia-testing.md)
- [Testing Edge Functions](../../../../docs/tests/edge-functions-testing.md)
- [I2.3 README](../../../../.claude/docs/fases/fase2/I2.3/I2.3_README.md)
- [I2.2 README](../../../../.claude/docs/fases/fase2/I2.2/I2.2_README.md)

---

**Ultima actualizacion:** 2026-02-14
