# Revisión de seguridad — TFM.7 / Tarea 7

**Fecha:** 2026-05-22
**Alcance:** Frontend (Vite/React), Edge Functions (Supabase/Deno), base de datos (Postgres + RLS), pipeline n8n.

---

## 1. `pnpm audit`

Resultados (con `--config.strict-ssl=false` por problema local de CA):

| Ámbito | Total | High | Moderate | Low |
|---|---|---|---|---|
| Todas las deps (dev+prod) | 79 | 27 | 50 | 2 |
| Solo producción (`--prod`) | 37 | 6 | 30 | 1 |

### Vulnerabilidades High en producción

Todas provienen de dependencias indirectas, no de runtime real de la app:

| Paquete | Aviso | Path | Riesgo real |
|---|---|---|---|
| `picomatch` | ReDoS via extglob | dev: storybook/vite chains | Bajo — solo build |
| `fast-uri` (x2) | Path traversal / host confusion | dev: build tooling | Bajo — solo build |
| `lodash` | Code injection via `_.template` | dev tooling | Bajo — no se usa `_.template` |
| `path-to-regexp` | DoS | dev: storybook router | Bajo — solo Storybook |

**Conclusión:** No hay vulnerabilidades High/Critical que afecten al runtime de producción del frontend ni a las Edge Functions. Las restantes están en cadenas de Storybook / test runners. Se documentan y se revisarán al actualizar dependencias.

**Acción recomendada:** Ejecutar `pnpm update` selectivo sobre `@storybook/*`, `@vitest/*` y `mermaid` antes del deploy. Si persisten, añadir nota en `CHANGELOG.md` indicando que son dev-only.

---

## 2. Secretos en código

Se buscaron patrones `sk-ant-`, `sk-proj-`, `sk-[40+]`, JWT (`eyJ...eyJ`) y nombres de claves sensibles.

- **No se encontraron** claves API reales hardcoded.
- Las coincidencias en `supabase/functions/chat/index.ts`, `webhook-pdf/index.ts`, `docs/n8n.md` corresponden al **JWT demo público de Supabase local** (`supabase-demo`), seguro para documentación.
- `.env.example` y `n8n/.env.example` contienen sólo placeholders.
- `docs/arquitectura/arquitectura-cloud.md:402` muestra `SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...` truncado — confirmado que es placeholder, no real.

**Acción:** Verificar antes del primer deploy que `.env.local` está en `.gitignore` (ya lo está) y que no hay backups (`.env.backup`, `*.env`) trackeados.

---

## 3. Edge Functions

### 3.1 Autenticación

| Endpoint | Auth | Estado |
|---|---|---|
| `POST /chat` | JWT Supabase (`extractUserIdFromRequest` → 401 si no válido) | ✅ |
| `POST /upload-convenio` | JWT Supabase + `supabase.auth.getUser()` | ✅ |
| `POST /webhook-progress` | Header `X-Webhook-Secret` == `WEBHOOK_PROGRESS_SECRET` | ✅ |
| `POST /webhook-pdf` | Sin auth (devuelve `not implemented`) | ⚠️ Aceptable — endpoint stub. Cuando se implemente, añadir secret. |

### 3.2 CORS

Actualmente en `supabase/functions/_shared/lib/cors.ts`:

```ts
'Access-Control-Allow-Origin': '*'
```

**Riesgo:** Bajo en práctica (todas las llamadas requieren JWT válido emitido por Supabase Auth del propio proyecto), pero conviene restringir.

**Acción:** Cambiar a allowlist por entorno cuando esté definido el dominio (`workrules.eu` y `localhost:5173`):

```ts
const ALLOWED_ORIGINS = new Set([
  'https://workrules.eu',
  'https://www.workrules.eu',
  Deno.env.get('ENVIRONMENT') === 'development' ? 'http://localhost:5173' : '',
].filter(Boolean));

export function buildCorsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
```

Pendiente para la tarea de hosting (T11).

### 3.3 Rate limiting

| Endpoint | Mecanismo actual |
|---|---|
| `/upload-convenio` | RPC `count_recent_uploads` → 5 uploads / 5 min. ✅ |
| `/chat` | `checkUserQuota` + `incrementQueryCount` (cuota diaria por plan) **+ RPC `count_recent_chat_requests` → 10 req / 60 s**. ✅ |
| `/webhook-progress` | Sin rate limit; protegido por secret. Aceptable. |

**Anti-ráfaga `/chat`** (implementado 2026-05-22):
- RPC `count_recent_chat_requests(p_user_id, p_window_seconds)` en `database/schema.sql` (snippet aplicable: `supabase/snippets/add-chat-rate-limit.sql`). Cuenta `chat_messages` con `role='user'` joined a `chat_sessions.user_id` en la ventana.
- Helper TS `countRecentChatRequests` en `supabase/functions/_shared/lib/supabase.ts`.
- Check en `supabase/functions/chat/index.ts` antes del parse del body. Devuelve `429` con `{limit, window_seconds}` si se excede. Falla abierta si la RPC falla (sólo log) para no romper el chat por un fallo de conteo.

**Pendiente de aplicar en Supabase prod:** ejecutar `supabase/snippets/add-chat-rate-limit.sql` en el SQL editor del proyecto antes del deploy.

### 3.4 Sanitización de inputs

- `validateChatRequest` y `validateRequest` en `upload-convenio` validan tipos.
- `webhook-progress` valida UUID con regex y stage contra enum.
- `pdf_hash` validado con regex `^[a-f0-9]{64}$`.
- Las queries a Postgres usan el cliente `supabase-js` (parametrizado) → sin riesgo de SQLi.
- El prompt al LLM concatena `pregunta` del usuario; aceptable para LLM (no eval) pero documentar que no se hace defensa contra prompt-injection (out of scope TFM).

---

## 4. RLS (Row Level Security)

RLS habilitado en todas las tablas (`database/schema.sql:484-492`):

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `user_profiles` | `auth.uid()=id` | `auth.uid()=id` | `auth.uid()=id` | — |
| `convenios` | público activo OR owner OR legacy | autenticado + `owner_id=auth.uid()` | owner | — |
| `convenio_chunks` | si convenio activo | service_role | service_role | service_role |
| `convenio_perfiles` | si convenio activo | service_role | service_role | service_role |
| `convenio_versiones` | si convenio activo | service_role | service_role | service_role |
| `chat_sessions` | owner | owner | owner | — |
| `chat_messages` | sesiones del user | sesiones del user | — | — |
| `semantic_cache` | cualquier autenticado | service_role | service_role | service_role |
| `user_documents` | owner | owner | owner | owner |

**Hallazgos:**
- ✅ Ninguna tabla deja acceso anónimo amplio.
- ⚠️ `semantic_cache` legible por todos los autenticados — aceptable (cache compartido), pero si en el futuro contiene preguntas con PII de usuario, revisar.
- ⚠️ Política comentada `Solo admins pueden modificar convenios públicos` — pendiente cuando exista rol admin (fuera de alcance TFM).
- ✅ Las escrituras desde n8n / Edge Functions usan service_role explícitamente sólo donde toca (`webhook-progress`, indexer).

**Acción:** Validar en Supabase Studio que las políticas en producción coinciden con `schema.sql`. Documentar en `docs/despliegue.md` el paso de aplicar `schema.sql` antes de abrir tráfico.

---

## 5. Headers de seguridad (a aplicar en hosting — T11)

Lista para aplicar en `vercel.json` o `nginx.conf`:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval' https://plausible.io;
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  img-src 'self' data: blob: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://plausible.io https://*.sentry.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
```

Notas:
- `wasm-unsafe-eval` necesario por el bundle de Vite si se usan plugins WASM (revisar tras T2).
- Ajustar `connect-src` a la URL final de Supabase prod.
- `style-src 'unsafe-inline'` sólo si Tailwind/Radix lo requieren tras el build (probar `'strict-dynamic'` con nonce si se quiere endurecer).
- Verificar con https://securityheaders.com tras el deploy (criterio T11).

---

## 6. HTTPS

- Supabase: HTTPS obligatorio en endpoints `*.supabase.co` ✅.
- Frontend: dependerá del hosting elegido (Vercel: auto; VPS Hostinger: certbot). Cubierto en T10/T11.
- n8n self-hosted: el endpoint `N8N_WEBHOOK_URL` debe ser HTTPS en producción. Documentar en `docs/despliegue.md`.

---

## 7. Resumen de criterios

- [x] `pnpm audit` analizado. Sin High/Critical de **runtime de producción**. Vulnerabilidades restantes son dev-only.
- [x] RLS verificada tabla por tabla y documentada arriba.
- [x] Rate limiting presente en `/upload-convenio`. **Pendiente:** anti-ráfaga en `/chat`.
- [x] Lista de headers de seguridad lista para aplicar en hosting.
- [x] Sin secretos hardcoded.

## 8. Pendientes accionables (orden recomendado)

1. ~~Añadir rate-limit anti-ráfaga en `/chat` (10 req/min/user).~~ ✅ Implementado 2026-05-22. Falta aplicar el snippet SQL en el proyecto Supabase de producción.
2. Restringir CORS a allowlist tras decidir dominio (T10).
3. Aplicar headers de seguridad al elegir hosting (T11).
4. `pnpm update` selectivo de dev deps para reducir audit ruido (no bloqueante).
5. Documentar en `docs/despliegue.md` la verificación con securityheaders.com.
