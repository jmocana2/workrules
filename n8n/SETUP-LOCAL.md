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
## 2. Importar el Workflow

1. En n8n, ve a **Workflows** > **Import from File**
2. Selecciona `Workrules-Indexer.json`
3. El workflow se importará con todas las conexiones
## 3. Configurar Credenciales

En n8n, ve a **Settings** > **Credentials** y crea:

### 3.1 Supabase API (para inserts en DB)

- **Name**: `Supabase Local`
- **Type**: `Header Auth`
- **Header Name**: `apikey`
- **Header Value**: (tu anon key de `supabase status`)

También necesitas crear otra credencial para el service role:
- **Name**: `Supabase Service Role`
- **Type**: `Header Auth`
- **Header Name**: `Authorization`
- **Header Value**: `Bearer <SERVICE_ROLE_KEY>`

### 3.2 LlamaParse

- **Name**: `LlamaParse`
- **Type**: `Header Auth`
- **Header Name**: `Authorization`
- **Header Value**: `Bearer <LLAMAPARSE_API_KEY>`

### 3.3 OpenAI

- **Name**: `OpenAI`
- **Type**: `OpenAI API`
- **API Key**: tu key de OpenAI

### 3.4 Anthropic (Claude)

- **Name**: `Anthropic`
- **Type**: `Anthropic API`
- **API Key**: tu key de Anthropic

## 4. Actualizar URLs en el Workflow

Después de importar, edita estos nodos para usar Supabase local:
| Nodo | URL Original | URL Local |
|------|--------------|-----------|
| `HTTP Supabase storage PDF` | `https://xxx.supabase.co/storage/v1/...` | `http://host.docker.internal:54321/storage/v1/...` |
| `Save md in supabase1` | `https://xxx.supabase.co/rest/v1/convenios` | `http://host.docker.internal:54321/rest/v1/convenios` |
| `Bulk Insert Chunks` | `https://xxx.supabase.co/rest/v1/convenio_chunks` | `http://host.docker.internal:54321/rest/v1/convenio_chunks` |
| `HTTP Supabase Delete Perfil` | `https://xxx.supabase.co/rest/v1/convenio_perfiles` | `http://host.docker.internal:54321/rest/v1/convenio_perfiles` |
| `HTTP Supabase Insert Perfil` | `https://xxx.supabase.co/rest/v1/convenio_perfiles` | `http://host.docker.internal:54321/rest/v1/convenio_perfiles` |

> **Nota**: Usa `host.docker.internal` en lugar de `localhost` porque n8n corre dentro de Docker.

## 5. Crear Bucket de Storage

Antes de indexar, crea el bucket en Supabase local:

```sql
-- Ejecutar en Supabase Studio (http://127.0.0.1:54323)
-- SQL Editor > New Query

INSERT INTO storage.buckets (id, name, public)
VALUES ('convenios-pdf', 'convenios-pdf', true)
ON CONFLICT (id) DO NOTHING;
```

## 6. Activar el Workflow

1. Abre el workflow importado
2. Click en **Activate** (toggle arriba a la derecha)
3. El webhook estara disponible en: `http://localhost:5678/webhook/ingesta-convenio`

## 7. Probar con un Convenio

```bash
curl -X POST http://localhost:5678/webhook/ingesta-convenio \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Convenio Colectivo de Hosteleria de Madrid",
    "codigo_regcon": "28000005011981",
    "ambito": "provincial",
    "fecha_vigencia": "2024-01-01",
    "pdf_url": "https://www.boe.es/boe/dias/2024/01/15/pdfs/BOE-A-2024-123.pdf"
  }'
```

> **Tip**: Busca PDFs de convenios reales en el BOE: https://www.boe.es/buscar/boe.php

## Troubleshooting

### n8n no conecta con Supabase

- Verifica que Supabase esta corriendo: `supabase status`
- Usa `host.docker.internal` no `localhost`
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
