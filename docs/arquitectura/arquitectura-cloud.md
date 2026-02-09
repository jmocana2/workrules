# Arquitectura Cloud & Contenedores

**Proveedor:** Hostinger VPS (Alemania)
**Orquestación:** Docker Compose (sin Kubernetes)
**Contenedores:** 1 actual (n8n) → 2 en producción (Nginx + n8n)

---

## 1. Visión General de las 3 Capas

Este documento complementa las otras arquitecturas del proyecto:

| Capa | Documento | Qué define |
|------|-----------|------------|
| **Frontend** | [arquitectura-front.md](./arquitectura-front.md) | React 19, estructura de código, componentes |
| **Backend** | [arquitectura-back.md](./arquitectura-back.md) | Supabase, Edge Functions, eventos |
| **Cloud** | Este documento | VPS, Docker, Nginx, despliegue |

### Diagrama Completo del Sistema

```
                              INTERNET
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  Hostinger VPS  │  │    Supabase     │  │   APIs Externas │
   │   (Alemania)    │  │     Cloud       │  │                 │
   │                 │  │                 │  │  - Anthropic    │
   │  ┌───────────┐  │  │  - PostgreSQL   │  │  - OpenAI       │
   │  │   Nginx   │  │  │  - pgvector     │  │  - LlamaParse   │
   │  │  :80/443  │  │  │  - Auth         │  │                 │
   │  └─────┬─────┘  │  │  - Storage      │  └─────────────────┘
   │        │        │  │  - Edge Fn      │
   │   ┌────┴────┐   │  └─────────────────┘
   │   │         │   │           ▲
   │   ▼         ▼   │           │
   │ React    n8n    │───────────┘
   │ /dist   :5678   │  (webhooks, API calls)
   └─────────────────┘
```

---

## 2. Estado Actual vs Objetivo

### Estado Actual (Desarrollo) ✅

```
Hostinger VPS (Ubuntu 24.04)
│
├── /root/www/workrules/     # Repo clonado (Frontend React)
│   ├── apps/web/            # Código fuente
│   └── ...
│
└── /root/n8n/               # n8n independiente
    ├── docker-compose.yml   # Config desarrollo
    └── data/                # Datos persistentes
```

**Acceso actual:**
- n8n: `http://IP-VPS:5678` (HTTP, sin dominio)
- Frontend: No desplegado aún

### Estado Objetivo (Producción) 🎯

```
Hostinger VPS (Ubuntu 24.04)
│
└── /root/workrules/              # Directorio principal
    ├── docker-compose.yml        # Orquesta todo
    ├── .env                      # Variables (no commitear)
    │
    ├── nginx/
    │   └── conf.d/
    │       └── default.conf      # Reverse proxy config
    │
    ├── frontend/
    │   └── dist/                 # Build de React (CI/CD)
    │
    ├── n8n/
    │   └── data/                 # Workflows, credentials
    │
    └── certbot/
        ├── conf/                 # Certificados SSL
        └── www/                  # ACME challenge
```

**Acceso en producción:**
- Frontend: `https://workrules.es`
- n8n: `https://n8n.workrules.es`

---

## 3. Diagrama de Producción

```
                         INTERNET
                            │
                            ▼
                 ┌─────────────────────┐
                 │    Hostinger VPS    │
                 │   Ubuntu 24.04 LTS  │
                 │   Alemania (EU)     │
                 │   ~30-40ms España   │
                 └─────────────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │       Nginx         │
                 │   (Reverse Proxy)   │
                 │   Puertos 80/443    │
                 │   SSL: Let's Encrypt│
                 └─────────────────────┘
                      │           │
           ┌──────────┘           └──────────┐
           ▼                                 ▼
┌────────────────────┐           ┌────────────────────┐
│   workrules.es     │           │  n8n.workrules.es  │
│                    │           │                    │
│  Archivos estáticos│           │  Proxy → :5678     │
│  React Build /dist │           │  Container n8n     │
└────────────────────┘           └────────────────────┘
```

---

## 4. Decisiones de Arquitectura

### ¿Por qué NO Kubernetes?

| Factor | Nuestra situación | K8s recomendado cuando... |
|--------|-------------------|---------------------------|
| Contenedores | 2 | 10+ microservicios |
| Equipo | Solo-dev | 5+ desarrolladores |
| Escalabilidad | n8n no escala horizontalmente | Auto-scaling necesario |
| Presupuesto | 100€/mes total | 500€+/mes solo en infra |
| Complejidad | Mínima deseada | Equipo DevOps dedicado |

### ¿Por qué Docker Compose?

- Suficiente para 1-5 contenedores en un solo servidor
- Configuración declarativa simple
- Reinicio automático de contenedores
- Sin overhead de orquestación distribuida

### ¿Por qué Nginx en lugar de CDN externo?

- Servidor en Alemania = ~30-40ms latencia a España
- Audiencia objetivo: España/Europa
- Simplifica gestión (un solo proveedor)
- Coste predecible incluido en VPS

---

## 5. Inventario de Contenedores

| Contenedor | Imagen | Puerto | Propósito |
|------------|--------|--------|-----------|
| **nginx** | `nginx:alpine` | 80, 443 | Reverse proxy + servir frontend |
| **n8n** | `n8nio/n8n:latest` | 5678 (interno) | Orquestación ETL, workflows |

### Servicios que NO contenerizamos

| Servicio | Razón | Proveedor |
|----------|-------|-----------|
| PostgreSQL + pgvector | Base de datos gestionada | Supabase |
| Edge Functions | Serverless gestionado | Supabase |
| Auth & Storage | BaaS gestionado | Supabase |
| IA (Claude) | API externa | Anthropic |
| Embeddings | API externa | OpenAI |
| Parsing PDF | API externa | LlamaParse |

---

## 6. Docker Compose (Producción)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ===========================================
  # NGINX - Reverse Proxy + Frontend
  # ===========================================
  nginx:
    image: nginx:alpine
    container_name: workrules-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./frontend/dist:/var/www/frontend:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - n8n
    networks:
      - workrules-network

  # ===========================================
  # N8N - Workflow Automation
  # ===========================================
  n8n:
    image: n8nio/n8n:latest
    container_name: workrules-n8n
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"  # Solo accesible localmente
    environment:
      # Configuración general
      - N8N_HOST=n8n.${DOMAIN}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.${DOMAIN}
      - GENERIC_TIMEZONE=Europe/Madrid

      # Seguridad
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}

      # Base de datos (SQLite por defecto, suficiente para nuestro uso)
      - DB_TYPE=sqlite
      - DB_SQLITE_VACUUM_ON_STARTUP=true

      # Ejecuciones
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168  # 7 días

      # Supabase (para webhooks)
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}

      # APIs externas
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LLAMAPARSE_API_KEY=${LLAMAPARSE_API_KEY}
    volumes:
      - ./n8n/data:/home/node/.n8n
    networks:
      - workrules-network

  # ===========================================
  # CERTBOT - SSL Certificates
  # ===========================================
  certbot:
    image: certbot/certbot
    container_name: workrules-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  workrules-network:
    driver: bridge
```

---

## 7. Configuración de Nginx (Producción)

```nginx
# nginx/conf.d/default.conf

# =========================================
# Redirección HTTP → HTTPS
# =========================================
server {
    listen 80;
    listen [::]:80;
    server_name workrules.es n8n.workrules.es;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirección a HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# =========================================
# FRONTEND - workrules.es
# =========================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name workrules.es www.workrules.es;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/workrules.es/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workrules.es/privkey.pem;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json;

    # Root directory
    root /var/www/frontend;
    index index.html;

    # SPA Routing - Todas las rutas van a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cachear index.html (para actualizaciones)
    location = /index.html {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}

# =========================================
# N8N - n8n.workrules.es
# =========================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name n8n.workrules.es;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/workrules.es/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workrules.es/privkey.pem;

    # SSL Security (misma config)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Proxy a n8n
    location / {
        proxy_pass http://n8n:5678;
        proxy_http_version 1.1;

        # Headers para proxy
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (necesario para n8n)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts largos para workflows
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # Buffer settings
        proxy_buffering off;
        proxy_buffer_size 4k;
    }
}
```

---

## 8. Variables de Entorno

```bash
# .env (NO commitear - añadir a .gitignore)

# Dominio
DOMAIN=workrules.es

# n8n Auth
N8N_USER=admin
N8N_PASSWORD=tu_password_seguro_aqui

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...

# APIs de IA
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
LLAMAPARSE_API_KEY=llx-...
```

---

## 9. Migración: Desarrollo → Producción

### Paso 1: Reorganizar estructura (cuando tengas dominio)

```bash
# Conectar al VPS
ssh root@IP-VPS

# Crear nueva estructura unificada
mkdir -p /root/workrules/{nginx/conf.d,frontend/dist,certbot/{conf,www}}

# Mover datos de n8n existentes
mv /root/n8n/data /root/workrules/n8n/data

# El repo de desarrollo puede quedarse donde está o eliminarse
# /root/www/workrules/ → solo para desarrollo local
```

### Paso 2: Configurar dominio + SSL

```bash
cd /root/workrules

# 1. Subir docker-compose.yml y nginx config (ver secciones 6 y 7)

# 2. Obtener certificados SSL
docker compose up -d nginx
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d TU-DOMINIO.es -d www.TU-DOMINIO.es -d n8n.TU-DOMINIO.es \
  --email tu@email.com --agree-tos --no-eff-email

# 3. Reiniciar con SSL activo
docker compose down
docker compose up -d
```

### Paso 3: Desplegar frontend

```bash
# Desde tu máquina local (después de build)
cd apps/web
npm run build
scp -r dist/* root@IP-VPS:/root/workrules/frontend/dist/

# En el VPS
docker compose exec nginx nginx -s reload
```

## 10. Comandos de Mantenimiento

### Actualizar n8n

```bash
docker compose pull n8n
docker compose up -d n8n
```

### Ver logs

```bash
# Todos los servicios
docker compose logs -f

# Solo n8n
docker compose logs -f n8n

# Solo nginx
docker compose logs -f nginx
```

---

## 11. Backups

### Backup de n8n (workflows + credentials)

```bash
# Crear backup
tar -czvf n8n-backup-$(date +%Y%m%d).tar.gz ~/workrules/n8n/data

# Restaurar backup
tar -xzvf n8n-backup-YYYYMMDD.tar.gz -C ~/workrules/
docker compose restart n8n
```

### Backup automatizado (cron)

```bash
# Añadir a crontab (crontab -e)
0 3 * * * tar -czvf /backups/n8n-$(date +\%Y\%m\%d).tar.gz ~/workrules/n8n/data
0 4 * * 0 find /backups -name "n8n-*.tar.gz" -mtime +30 -delete
```

---

## 12. Monitorización

### Health checks básicos

```bash
# Verificar que los contenedores están corriendo
docker compose ps

# Uso de recursos
docker stats

# Espacio en disco
df -h
```

### URLs de verificación

| URL | Esperado |
|-----|----------|
| `https://workrules.es` | Frontend React |
| `https://n8n.workrules.es` | Login de n8n |
| `https://n8n.workrules.es/healthz` | `{"status":"ok"}` |

---

## 13. Costes Estimados

| Servicio | Coste mensual |
|----------|---------------|
| Hostinger VPS KVM2 (4GB RAM) | ~12€ |
| Supabase Pro | ~25€ |
| Anthropic API (estimado) | ~30-50€ |
| LlamaParse | ~10€ |
| Let's Encrypt SSL | 0€ |
| **Total** | **~77-97€/mes** |

---

## 14. Escalabilidad Futura

### Cuándo reconsiderar esta arquitectura

| Señal | Acción |
|-------|--------|
| CPU VPS > 80% constante | Upgrade a VPS superior |
| RAM > 90% | Upgrade a VPS superior |
| Múltiples regiones geográficas | Añadir CDN (Cloudflare) |
| +10 contenedores | Evaluar Docker Swarm |
| +50 contenedores | Evaluar Kubernetes |
| Equipo > 5 devs | Evaluar separación de servicios |

### Mejoras opcionales

1. **Cloudflare** (gratis): CDN + protección DDoS + DNS
2. **Portainer** (gratis): UI para gestionar Docker
3. **Uptime Kuma** (gratis): Monitorización de uptime
