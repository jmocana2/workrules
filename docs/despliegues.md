# Despliegues a Producción

Guía única para llevar a producción cada componente de WorkRules: frontend, edge functions, base de datos, workflows de n8n y CI/CD. Pensado como referencia de "qué comando ejecuto y qué verifico".

## Mapa de componentes

| Componente | Repo path | Hosting prod | Mecanismo de deploy |
|---|---|---|---|
| Frontend (Vite + React) | `src/` | Vercel | `git push` a `main` → auto deploy |
| Edge Functions (Deno) | `supabase/functions/` | Supabase Cloud | `supabase functions deploy` (manual) |
| Base de datos (schema + RLS) | `supabase/migrations/` | Supabase Cloud (Postgres) | `supabase db push` (manual) |
| Workflow indexer (n8n) | `n8n/Workrules-Indexer.json` | n8n self-hosted (Hostinger) | Build con `n8n/build-prod.mjs` + import manual en UI |
| Workflow errors (n8n) | `n8n/Workrules-Errors.json` | n8n self-hosted | Igual que indexer |

---

## 1. Frontend (`src/`)

**Hosting:** Vercel. Configuración en `vercel.json` (framework `vite`, build `pnpm build`, output `dist/`, redirects para `/storybook` y `/presentacion-TFM`, headers de seguridad incl. CSP).

**Build incluye 3 artefactos en `dist/`:**
1. App principal (`vite build`)
2. Storybook (`pnpm build-storybook`)
3. Slides TFM (`pnpm build-slides`)

### Deploy

```bash
git push origin main
```

Vercel detecta el push, ejecuta `pnpm install --frozen-lockfile && pnpm -C presentacion-tfm install --frozen-lockfile`, luego `pnpm build`, y publica `dist/`.

### Variables de entorno en Vercel

Project Settings → Environment Variables (Production):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN` (si aplica)

Tras cambiar variables hay que **redeploy** desde Vercel (no basta con guardar).

### Preview deploys

Cada PR genera un preview deploy automático en una URL `*.vercel.app`. Útil para revisar antes de mergear.

### Verificar tras deploy

- Abrir `https://<dominio>/` → home carga.
- DevTools → Network: `/functions/v1/chat` responde 200.
- Console limpia (sin errores de CSP).

---

## 2. Edge Functions (`supabase/functions/`)

**Hosting:** Supabase Cloud. Runtime Deno. Funciones actuales: `chat`, `sign-pdf`, `upload-convenio`, `webhook-pdf`, `webhook-progress` (`_shared/` se incluye automáticamente como dependencia, no se despliega como función).

### Setup inicial (solo la primera vez)

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
```

### Deploy

```bash
# Una sola función
supabase functions deploy webhook-progress

# Todas
supabase functions deploy

# Funciones que no validan JWT de Supabase (autenticación propia con X-Webhook-Secret)
supabase functions deploy webhook-progress --no-verify-jwt
supabase functions deploy webhook-pdf --no-verify-jwt
```

Las que usan JWT estándar (`chat`, `upload-convenio`, `sign-pdf`) van sin flag.

### Secrets

`Deno.env.get(...)` lee secrets que se gestionan **aparte del código**, no se redeployan con `functions deploy`.

```bash
# Listar
supabase secrets list

# Setear / actualizar
supabase secrets set WEBHOOK_PROGRESS_SECRET=wp_secret_a7f3e9b2c8d4e5f6
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Bulk desde archivo
supabase secrets set --env-file ./supabase/.env.prod
```

⚠️ **No setees manualmente** `SUPABASE_URL`, `SUPABASE_ANON_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` — Supabase los inyecta automáticamente.

### Verificar tras deploy

```bash
# Logs en tiempo real
supabase functions logs webhook-progress --tail

# Smoke test
curl -i -X POST "$SUPABASE_URL/functions/v1/webhook-progress" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_PROGRESS_SECRET" \
  -d '{"convenio_id":"00000000-0000-0000-0000-000000000000","stage":"queued","progress":0}'
```

### Tests locales antes de deployar

```bash
pnpm test:deno          # Tests unitarios Deno
pnpm test:coverage      # Con cobertura
```

---

## 3. Base de Datos (`supabase/migrations/`)

**Hosting:** Postgres en Supabase Cloud. Schema versionado con migraciones SQL en `supabase/migrations/` con timestamp prefix.

### Filosofía

- **Cambios al schema → siempre via migración nueva**, nunca editar una existente ya aplicada en prod.
- Migraciones aditivas (`ALTER TABLE ... ADD COLUMN`, `CREATE INDEX`, etc.) son seguras. Las destructivas (`DROP`, `ALTER ... NOT NULL`) requieren plan de backfill.
- Preferir `supabase db push` sobre `db reset` para preservar datos de prod.

### Crear una migración

```bash
# Genera archivo con timestamp en supabase/migrations/
supabase migration new add_<descripcion>
# Edita el .sql generado
```

### Aplicar a producción

```bash
# Dry-run: muestra qué migraciones falta aplicar
supabase db push --dry-run

# Aplicar
supabase db push
```

### Verificar

```bash
# Listar migraciones aplicadas en remoto
supabase migration list

# Conectar a SQL editor y comprobar el schema
# o psql con la connection string del project
```

### Rollback

Supabase no tiene rollback automático. Si una migración falla a medias, hay que:
1. Investigar el error en SQL editor.
2. Crear una **nueva** migración que revierta lo aplicado.
3. `supabase db push` otra vez.

Nunca borrar archivos de migración ya aplicados — rompe la integridad del histórico.

---

## 4. Workflows de n8n (`n8n/*.json`)

**Hosting:** n8n self-hosted (Hostinger). Los IDs de credenciales son distintos en local y prod, así que **no se puede importar el JSON local directamente**.

### Sistema actual

- Workflows editables en local con instancia n8n propia.
- `n8n/credential-map.json` mapea IDs local ↔ prod.
- `n8n/build-prod.mjs` reescribe IDs al exportar.

### Deploy del indexer

```bash
# Genera n8n/dist/Workrules-Indexer-PROD.json
node n8n/build-prod.mjs
```

Luego en la UI de n8n prod:
1. **Workflows** → abrir el workflow existente.
2. Menú `...` → **Import from File** → seleccionar `n8n/dist/Workrules-Indexer-PROD.json`.
3. Confirmar overwrite.
4. **Activate** el workflow (toggle arriba derecha).

### Deploy de otros workflows

```bash
node n8n/build-prod.mjs --input n8n/Workrules-Errors.json --output n8n/dist/Workrules-Errors-PROD.json
```

### Dirección inversa (cambios hechos en prod)

```bash
node n8n/build-prod.mjs --direction prod-to-local --input <export-de-prod.json>
```

### Cuándo actualizar `credential-map.json`

- Creas, rotas o borras una credencial en cualquiera de las dos instancias.
- Añades un nodo nuevo que usa un tipo de credencial todavía no mapeado (el script avisa con `! tipo X sin entrada`).
- Un nodo necesita una credencial distinta de la default de su tipo → añadir en `overrides`.

### Verificar tras deploy

```bash
# Smoke test del webhook indexer
curl -X POST '<N8N_WEBHOOK_URL>' \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Test","codigo_regcon":"99999999-TEST","ambito":"provincial","fecha_vigencia":"2026-01-01","pdf_url":"<url>"}'
```

Comprobar ejecución en n8n UI → **Executions**.

Detalles completos en `n8n/BUILD-PROD.md`.

---

## 5. CI/CD

Configurado en `.github/workflows/`. **No hay un workflow de deploy automático** — el deploy lo dispara Vercel (frontend) o se hace manualmente (resto). Los workflows de CI ejecutan tests y auditorías.

### `.github/workflows/playwright.yml`

**Trigger:** push y PR a `main` / `master`.

**Job:** E2E con Playwright (Chromium) en container oficial `mcr.microsoft.com/playwright`.

Pasos:
1. Checkout + setup pnpm/node + install deps.
2. `pnpm exec vite build` (sin storybook ni slides; `VITE_E2E_TESTING=true`).
3. `pnpm exec playwright test --project=chromium`.
4. Upload artifacts: `playwright-report/` (30 días) y `test-results/` solo en failure (7 días).

**Secrets esperados** (con fallback a placeholders si faltan):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`

### `.github/workflows/security.yml`

**Trigger:** PR/push a `main`, cron semanal (`0 6 * * 1`), o `workflow_dispatch`.

**Jobs:**
1. `pnpm-audit` — falla si hay vulnerabilidades **high+** en deps de producción.
2. `snyk` — Snyk Open Source (dependencias) + Snyk Code (SAST). Suben SARIF a GitHub Security. `continue-on-error: true` (informativo).

**Secrets:** `SNYK_TOKEN`.

### Lo que NO hay

- ❌ Deploy automático de edge functions a Supabase.
- ❌ Migración automática de BD.
- ❌ Deploy automático del JSON de n8n.

Razón: queremos control manual sobre cambios que afectan datos y costes (Claude/OpenAI/LlamaParse). Si en el futuro se quiere automatizar el deploy de edge functions, sería un workflow con [`supabase/setup-cli`](https://github.com/marketplace/actions/supabase-cli-action) corriendo `supabase functions deploy` en push a `main`.

---

## Orden recomendado al desplegar una feature que toca varias capas

1. **DB** primero (`supabase db push`) — los cambios deben ser aditivos para no romper el front actual.
2. **Edge Functions** (`supabase functions deploy <fn>`) — ya pueden usar el schema nuevo.
3. **n8n** si aplica (`node n8n/build-prod.mjs` + import) — pipelines pueden escribir contra el schema nuevo.
4. **Frontend** (`git push`) — la UI nueva ve la DB y las funciones ya actualizadas.

Hacerlo al revés rompe usuarios en producción (front pide algo que el backend aún no expone).

---

## Checklist de release

- [ ] `pnpm typecheck` y `pnpm lint` limpios.
- [ ] `pnpm test:deno` y `pnpm test` (Playwright local) pasan.
- [ ] Migración de BD revisada (aditiva, sin destructivas sin plan).
- [ ] `CHANGELOG.md` actualizado si toca.
- [ ] Tras deploy: smoke test del flujo crítico (subir convenio, hacer una pregunta al chat).
- [ ] Sentry sin errores nuevos en los primeros minutos.

---

**Última actualización:** 2026-06-15
