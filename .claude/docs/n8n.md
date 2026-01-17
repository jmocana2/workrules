# n8n - Documentación de Instalación y Configuración

**Fecha de instalación:** Enero 2026
**Versión:** 2.3.6
**Tipo:** Self-hosted (Community Edition - Gratis)

---

## 1. Resumen de la Instalación

### Estado Actual ✅

| Componente | Estado | Detalles |
|------------|--------|----------|
| Docker | ✅ Instalado | Ubuntu 24.04 |
| n8n Container | ✅ Corriendo | Puerto 5678 |
| Usuario Admin | ✅ Creado | Email personal |
| Acceso Web | ✅ Funcionando | HTTP (temporal) |

### Datos de Acceso

| Campo | Valor |
|-------|-------|
| **URL temporal** | `http://76.13.0.223:5678` |
| **URL producción** | `https://n8n.TU-DOMINIO.com` (pendiente) |
| **Usuario** | El email que configuraste |
| **Contraseña** | La que elegiste en setup |

---

## 2. Arquitectura en el VPS

```
/root/
├── www/
│   └── workrules/        # Proyecto React (Frontend)
└── n8n/
    ├── docker-compose.yml
    └── data/             # Datos persistentes de n8n
                          # (workflows, credentials, config)
```

---

## 3. Configuración Actual

### docker-compose.yml

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - GENERIC_TIMEZONE=Europe/Madrid
      - TZ=Europe/Madrid
      - N8N_SECURE_COOKIE=false    # ⚠️ Temporal - cambiar en producción
    volumes:
      - ./data:/home/node/.n8n
```

### Ubicación en el servidor

```
/root/n8n/
```

---

## 4. Comandos Útiles

### Gestión del contenedor

```bash
# Ir al directorio de n8n
cd /root/n8n

# Ver estado
docker ps

# Ver logs (tiempo real)
docker logs -f n8n

# Reiniciar n8n
docker compose restart

# Parar n8n
docker compose down

# Iniciar n8n
docker compose up -d

# Actualizar n8n a última versión
docker compose pull
docker compose up -d
```

### Backup manual

```bash
# Crear backup de workflows y configuración
tar -czvf n8n-backup-$(date +%Y%m%d).tar.gz /root/n8n/data

# Restaurar backup
tar -xzvf n8n-backup-YYYYMMDD.tar.gz -C /
docker compose restart
```

---

## 5. Solución de Problemas Conocidos

### Error: Permission denied

```bash
# Si n8n no arranca por permisos
docker compose down
sudo chown -R 1000:1000 ./data
docker compose up -d
```

### Error: Secure cookie (acceso por HTTP)

Añadir en environment del docker-compose.yml:
```yaml
- N8N_SECURE_COOKIE=false
```

### Ver logs de errores

```bash
docker logs n8n --tail 50
```

---

## 6. Licencia y Costes

| Aspecto | Detalle |
|---------|---------|
| **Licencia** | Community Edition (Fair Code) |
| **Coste software** | Gratis |
| **Límites** | Sin límites de workflows, ejecuciones ni usuarios |
| **Coste real** | Solo el VPS (~12€/mes incluido en Hostinger) |

### Funciones incluidas en Community Edition

- ✅ Workflows ilimitados
- ✅ Ejecuciones ilimitadas
- ✅ Todas las integraciones (400+)
- ✅ Webhooks
- ✅ Credenciales encriptadas
- ✅ API REST

### Funciones de pago (NO necesarias para el proyecto)

- ❌ SSO/SAML
- ❌ Environments (dev/staging/prod)
- ❌ Git sync nativo
- ❌ Log streaming

---

## 7. Tareas Pendientes

### Prioridad Alta (antes de producción)

- [ ] **Contratar dominio**
  - Sugerencia: `workrules.es` o similar
  - Necesario para SSL y webhooks

- [ ] **Configurar Nginx como reverse proxy**
  - Frontend en `workrules.es`
  - n8n en `n8n.workrules.es`

- [ ] **Instalar SSL con Let's Encrypt**
  - Certificados gratuitos
  - Renovación automática con Certbot

- [ ] **Cambiar `N8N_SECURE_COOKIE=true`**
  - Una vez tengamos HTTPS

### Prioridad Media (después de producción)

- [ ] **Configurar credenciales de APIs**
  - Supabase (URL + Service Key)
  - Anthropic (API Key)
  - OpenAI (API Key para embeddings)
  - LlamaParse (API Key)

- [ ] **Crear workflow de ingesta de PDFs**
  - Trigger: Webhook desde Supabase Storage
  - Proceso: PDF → LlamaParse → Chunks → Embeddings → DB

- [ ] **Crear workflow watchdog BOE**
  - Trigger: Cron diario
  - Proceso: Scraping BOE → Detectar convenios → Notificar

- [ ] **Configurar backups automáticos**
  - Cron job diario
  - Retención de 30 días

### Prioridad Baja (mejoras opcionales)

- [ ] **Instalar Portainer** (UI para Docker)
- [ ] **Configurar monitorización** (Uptime Kuma)
- [ ] **Alertas por email** si n8n se cae

---

## 8. Configuración de Producción (Futura)

### docker-compose.yml (versión producción)

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"  # Solo local (Nginx hace proxy)
    environment:
      # General
      - N8N_HOST=n8n.workrules.es
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.workrules.es
      - GENERIC_TIMEZONE=Europe/Madrid
      - TZ=Europe/Madrid

      # Seguridad (activar con HTTPS)
      - N8N_SECURE_COOKIE=true

      # Limpieza de ejecuciones
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168  # 7 días

      # APIs (cargar desde .env)
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LLAMAPARSE_API_KEY=${LLAMAPARSE_API_KEY}
    volumes:
      - ./data:/home/node/.n8n
```

---

## 9. Recursos y Documentación

### Enlaces útiles

- [Documentación oficial n8n](https://docs.n8n.io/)
- [n8n Community Forum](https://community.n8n.io/)
- [Integraciones disponibles](https://n8n.io/integrations/)
- [Templates de workflows](https://n8n.io/workflows/)

### Integraciones que usaremos

| Integración | Uso en el proyecto |
|-------------|-------------------|
| **Webhook** | Recibir eventos de Supabase |
| **HTTP Request** | Llamar a LlamaParse, APIs |
| **Supabase** | CRUD en base de datos |
| **OpenAI** | Generar embeddings |
| **Code** | Lógica personalizada (chunking, etc.) |
| **Cron/Schedule** | Watchdog BOE diario |

---

## 10. Historial de Cambios

| Fecha | Cambio |
|-------|--------|
| Enero 2025 | Instalación inicial en Hostinger VPS |
| Enero 2025 | Configuración de Docker + n8n Community |
| Enero 2025 | Creación de usuario admin |
| - | Pendiente: Dominio + SSL + Nginx |
