# ADR-002: Deno + Supabase Edge Functions como RAG Retriever

**Fecha:** Enero 2026
**Estado:** Aceptado
**Decisores:** Solo-dev

---

## Contexto

WorkRules necesita un backend que:

1. Reciba preguntas de usuarios en tiempo real
2. Genere embeddings de las preguntas
3. Realice búsquedas vectoriales en pgvector
4. Construya prompts con contexto recuperado
5. Envíe streaming de respuestas desde Claude
6. Valide datos según el protocolo de chat (SMI, límites legales)

Este proceso es el **"fast path"** de la aplicación: debe responder en < 8 segundos (P95) con streaming para feedback inmediato.

### Requisitos del retriever

| Requisito | Prioridad |
|-----------|-----------|
| Latencia mínima (edge computing) | Alta |
| Streaming SSE para respuestas IA | Alta |
| Conexión directa a PostgreSQL/pgvector | Alta |
| Bajo coste en reposo (serverless) | Alta |
| TypeScript con tipos estrictos | Alta |
| Cold start < 100ms | Media |
| Testing unitario sin infraestructura | Media |

---

## Decisión

**Usar Supabase Edge Functions (basadas en Deno) como backend para el retriever RAG.**

### Arquitectura del flujo

```
Usuario → Edge Function /chat
              │
              ├─ 1. Validar JWT (Free/Pro)
              ├─ 2. Generar embedding de pregunta (OpenAI)
              ├─ 3. Buscar chunks similares (pgvector)
              ├─ 4. Obtener Perfil JSON del convenio
              ├─ 5. Construir prompt con contexto
              ├─ 6. Llamar a Claude (streaming)
              └─ 7. Retornar SSE stream al frontend
```

### Estructura de código

```
supabase/functions/
├── _shared/
│   ├── core/           # Lógica de negocio (testeable)
│   │   ├── chat/       # Handlers, prompts, types
│   │   ├── convenio/   # Tipos de convenio
│   │   └── salary/     # Validadores SMI, límites
│   └── lib/            # Clientes externos
│       ├── supabase.ts
│       ├── anthropic.ts
│       └── openai.ts
├── chat/
│   └── index.ts        # POST /functions/v1/chat
└── webhook-pdf/
    └── index.ts        # Trigger para n8n (futuro)
```

---

## Alternativas Consideradas

### 1. Node.js + Express/Fastify (servidor tradicional)

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Ecosistema maduro, familiaridad, control total |
| **Contras** | Requiere servidor 24/7, gestión de escalado, coste fijo |
| **Coste** | ~25-50€/mes (VPS dedicado) |
| **Descartado porque** | Coste no justificado para tráfico inicial bajo |

### 2. AWS Lambda + API Gateway

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Escalabilidad automática, pago por uso |
| **Contras** | Cold starts lentos (500ms+), complejidad IAM, vendor lock-in |
| **Coste** | Variable, impredecible |
| **Descartado porque** | Cold starts incompatibles con UX de chat |

### 3. Cloudflare Workers

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Edge computing real, cold start < 5ms |
| **Contras** | Sin conexión directa a PostgreSQL, límites de CPU (50ms) |
| **Coste** | Gratuito para bajo volumen |
| **Descartado porque** | No puede conectar directamente a pgvector |

### 4. Vercel Edge Functions

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Integración con Next.js, edge computing |
| **Contras** | Límites de tiempo (30s), no tiene pgvector nativo |
| **Coste** | Gratuito limitado, Pro ~20€/mes |
| **Descartado porque** | Separación forzada de backend (Supabase) y compute (Vercel) |

### 5. Supabase Edge Functions (Node.js runtime)

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Mismo proveedor que DB, Node.js familiar |
| **Contras** | En beta, menos documentación que Deno runtime |
| **Descartado porque** | Deno runtime es más maduro en Supabase |

---

## Justificación de Deno + Supabase Edge Functions

### Ventajas clave

| Ventaja | Detalle |
|---------|---------|
| **Colocación con DB** | Edge Functions en el mismo datacenter que PostgreSQL |
| **pgvector nativo** | Conexión directa sin latencia de red externa |
| **Cold start < 50ms** | Deno es más rápido que Node.js en arranque |
| **TypeScript nativo** | Sin transpilación, tipos en runtime |
| **Streaming SSE** | Soporte nativo para `ReadableStream` |
| **Auth integrado** | JWT de Supabase Auth validado automáticamente |
| **Coste cero en reposo** | Solo paga por invocaciones |
| **Testing nativo** | `Deno.test()` sin configuración adicional |

### Por qué Deno sobre Node.js

| Aspecto | Deno | Node.js |
|---------|------|---------|
| **Cold start** | ~40ms | ~200ms |
| **TypeScript** | Nativo | Requiere build |
| **Testing** | Integrado | Requiere Jest/Vitest |
| **Permissions** | Explícitos (`--allow-net`) | Implícitos |
| **Imports** | URLs/JSR | npm |
| **Estabilidad en Supabase** | Producción | Beta |

### Desventajas aceptadas

| Desventaja | Mitigación |
|------------|------------|
| Ecosistema npm limitado | JSR cubre 95% de necesidades, esm.sh para el resto |
| Curva de aprendizaje | Sintaxis similar a Node, documentación oficial excelente |
| Debugging remoto complejo | Logs de Supabase + testing local extensivo |
| Sin hot reload en producción | Despliegue rápido con `supabase functions deploy` |

---

## Consecuencias

### Positivas

- Latencia P95 < 100ms para búsqueda vectorial (sin contar Claude)
- Coste de compute: ~0€ en desarrollo, < 10€/mes en producción estimado
- Código testeable sin levantar infraestructura
- Un solo proveedor para DB + Auth + Compute + Storage
- Actualizaciones de Supabase incluyen mejoras de runtime

### Negativas

- Dependencia de Supabase como proveedor único de compute
- Límite de 50MB por función (suficiente para nuestro caso)
- Debugging de errores requiere revisar logs en dashboard

### Neutrales

- Aprender particularidades de Deno (imports, permisos)
- Gestión de secrets via dashboard de Supabase

---

## Patrón de Testing

Para mantener la testabilidad, separamos:

```
index.ts      → Orquestación (Deno.serve, HTTP) - NO se testea
handlers.ts   → Lógica de negocio pura - SE TESTEA
handlers.test.ts → Tests unitarios con Deno.test()
```

### Ejemplo de test

```typescript
// handlers.test.ts
import { assertEquals } from '@std/assert';
import { validateChatRequest } from './handlers.ts';

Deno.test('validateChatRequest - rechaza sin convenio_id', () => {
  const result = validateChatRequest({ pregunta: 'test' });
  assertEquals(result.valid, false);
});
```

---

## Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Cold start | < 50ms |
| Latencia búsqueda vectorial | < 100ms |
| Latencia total (con Claude) | < 8s P95 |
| Error rate | < 1% |
| Test coverage (functions) | > 90% |

---

## Referencias

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://docs.deno.com/)
- [Deno Testing](https://docs.deno.com/runtime/manual/basics/testing/)
- [docs/arquitectura-back.md](../arquitectura/arquitectura-back.md)
- [docs/tests/edge-functions-testing.md](../tests/edge-functions-testing.md)
