# n8n Local Setup para WorkRules

Guia para levantar n8n en local y conectarlo con Supabase local para indexar convenios.

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Supabase local corriendo (`supabase start`)
- API Keys: LlamaParse, OpenAI, Anthropic

## 1. Levantar n8n

```bash
cd n8n
docker-compose up -d
```

Espera ~30 segundos y accede a: **http://localhost:5678**

**IMPORTANTE**: En el primer acceso, configura tus credenciales de administrador.
Si usas las credenciales por defecto del docker-compose, cámbialas inmediatamente por seguridad.
## 2. Importar los Workflows

En n8n, ve a **Workflows** > **Import from File** e importa, en este orden:

1. `Workrules-Errors.json` — handler global de errores (Error Trigger).
2. `Workrules-Indexer.json` — pipeline de ingesta (Webhook).

Tras importar, los nodos aparecerán con las credenciales en rojo (esperado: los IDs internos cambian entre instancias). Se reasignan en el paso 3.

## 3. Configurar Credenciales

En **Settings > Credentials** crea las siguientes 4 credenciales. **El nombre debe coincidir exactamente** con el que esperan los JSON, si no, al reasignar habrá que hacerlo nodo por nodo.

### 3.1 Supabase account

- **Name**: `Supabase account`
- **Type**: `Supabase API` (tipo nativo, no Header Auth)
- **Host**: `http://host.docker.internal:54321`
- **Service Role Secret**: tu `service_role` key de `supabase status`

### 3.2 LlamaParse

- **Name**: `LlamaParse`
- **Type**: `Header Auth`
- **Header Name**: `Authorization`
- **Header Value**: `Bearer <LLAMAPARSE_API_KEY>`

### 3.3 OpenAi account

- **Name**: `OpenAi account`
- **Type**: `OpenAI API`
- **API Key**: tu key de OpenAI

### 3.4 Anthropic account

- **Name**: `Anthropic account`
- **Type**: `Anthropic API`
- **API Key**: tu key de Anthropic

Después abre cada workflow y, en los nodos que sigan en rojo, selecciona la credencial recién creada del desplegable.

## 4. Variable de Entorno SUPABASE_URL

Los workflows usan `$env.SUPABASE_URL` para todas las conexiones a Supabase (REST, Storage, Edge Functions). El mismo JSON funciona en local y en producción: solo cambia el valor de la variable.

Configurado en `.env` (copiado de `.env.example`):

```env
# Local
SUPABASE_URL=http://host.docker.internal:54321

# Producción
# SUPABASE_URL=https://tu-proyecto.supabase.co
```

> **Nota**: Desde dentro del contenedor Docker, `host.docker.internal` apunta a tu host (donde corre Supabase local). `localhost` no funcionaría.

> **Importante**: `docker-compose.yml` incluye `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`. Sin esa línea, n8n bloquea el acceso a `$env.*` desde los nodos y todas las URLs del workflow se evalúan vacías.

## 5. Crear Bucket de Storage

Antes de indexar, crea el bucket en Supabase local:

```sql
-- Ejecutar en Supabase Studio (http://127.0.0.1:54323)
-- SQL Editor > New Query

INSERT INTO storage.buckets (id, name, public)
VALUES ('convenios-pdf', 'convenios-pdf', false)
ON CONFLICT (id) DO UPDATE
SET public = false;
```

> **Nota**: El bucket es **privado**. Para leer PDFs usa signed URLs o requests autenticadas; evita cualquier URL pública del bucket.

## 6. Activar el Workflow

1. Abre el workflow importado
2. Click en **Activate** (toggle arriba a la derecha)
3. El webhook estara disponible en: `http://localhost:5678/webhook/ingesta-convenio`

## 7. Probar con un Convenio

```bash
curl -X POST http://localhost:5678/webhook/ingesta-convenio -H "Content-Type: application/json" -d '{"nombre": "Convenio Colectivo de Hosteleria de Madrid", "codigo_regcon": "28000005011981", "ambito": "provincial", "fecha_vigencia": "2024-01-01", "pdf_url": "https://www.ccoo-servicios.es/archivos/BOCM-20240406-Conv-hosteleria.pdf"}'
```

> **Tip**: Busca PDFs de convenios reales en el BOE: https://www.boe.es/buscar/boe.php

## Troubleshooting

### n8n no conecta con Supabase

- Verifica que Supabase esta corriendo: `supabase status`
- Verifica que `SUPABASE_URL` esta configurado en `.env`
- Para local debe ser `http://host.docker.internal:54321` (no `localhost`)
- Verifica que las credenciales estan bien configuradas

### Error de CORS en Storage

Supabase local puede necesitar configuracion CORS. Edita `supabase/config.toml`:

```toml
[storage]
enabled = true

[storage.cors]
allowed_origins = ["*"]
```

### Ver logs de n8n

```bash
docker-compose logs -f n8n
```

### Reiniciar n8n

```bash
docker-compose restart n8n
```

### Parar n8n

```bash
docker-compose down
```

## URLs de Referencia

| Servicio | URL |
|----------|-----|
| n8n | http://localhost:5678 |
| Supabase Studio | http://127.0.0.1:54323 |
| Supabase API | http://127.0.0.1:54321 |
| Webhook Indexer | http://localhost:5678/webhook/ingesta-convenio |
