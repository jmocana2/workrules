# WorkRules - TODOs y Mejoras Futuras

## 📋 Backlog

### 2. Optimizar Timeout del Webhook n8n
**Archivo**: `supabase/functions/upload-convenio/index.ts:119-155`
**Estado**: Implementado (timeout 5s), mejorable
**Complejidad**: Baja

Actualmente el timeout es de 5 segundos. Considerar:
- Usar `fetch` sin esperar respuesta (fire-and-forget)
- O verificar solo que n8n recibió el request (200 OK en <1s)

---

### 3. Notificaciones Push para Convenios Listos
**Estado**: Pendiente
**Complejidad**: Media

Si el usuario cierra la pestaña mientras procesa, no sabrá cuándo termina. Opciones:
- Web Push Notifications
- Email notification cuando estado = "activo"
- Realtime subscriptions de Supabase

---

### 4. Sistema de Reintentos para Errores de n8n
**Estado**: Pendiente
**Complejidad**: Media

Si n8n falla (LlamaParse timeout, Claude API error, etc.):
- Detectar el error en el workflow
- Actualizar estado = "error" con mensaje descriptivo
- Permitir al usuario "Reintentar" desde el frontend
- Considerar reintentos automáticos con backoff exponencial

---

## 🐛 Bugs Conocidos

*(Ninguno actualmente)*

---

## ✅ Completados

### ~~Sistema de Progreso Real para Upload de Convenios~~
**Fecha**: 2026-05 (TFM.6)
**Implementado**: Edge Function `supabase/functions/webhook-progress/` + tabla `convenio_processing_status` + nodos `Notify Progress *` en `n8n/Workrules-Indexer.json` + polling en `src/ui/hooks/useConvenioUpload.ts`.
**Stages emitidos**: `parsing` (20), `saving_markdown` (40), `chunking` (60), `profile` (80), `completed` (100). Contrato completo en `supabase/functions/webhook-progress/README.md`.

### ~~Fix: Race Condition en Actualización de Estado~~
**Fecha**: 2026-04-21
**Problema**: El estado cambiaba de "procesando" → "activo" → "procesando"
**Solución**: Mover actualización a "procesando" ANTES del webhook n8n
**Archivos**: `supabase/functions/upload-convenio/index.ts`

### ~~Fix: Estado "activo" Prematuro~~
**Fecha**: 2026-04-21
**Problema**: n8n actualizaba estado a "activo" a los 30s en lugar de al final
**Solución**: Eliminar actualización de estado del nodo "Save md in supabase1"
**Archivos**: `n8n/Workrules-Indexer.json` (nodo "Save md in supabase1")

---

**Última actualización**: 2026-05-23
