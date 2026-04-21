# WorkRules - TODOs y Mejoras Futuras

## 🚀 Alta Prioridad

### 1. Sistema de Progreso Real para Upload de Convenios
**Archivo**: `src/ui/hooks/useConvenioUpload.ts`
**Estado**: Pendiente
**Complejidad**: Media

**Problema Actual**:
El progreso durante el procesamiento de convenios es **estimado** usando una curva logarítmica de ~2.5 minutos. Si n8n tarda más o menos tiempo, el progreso no será preciso (ejemplo: puede saltar de 70% a 100%).

**Solución Propuesta**:

1. **Modificar workflow de n8n** para enviar eventos de progreso:
   ```javascript
   // Después de cada etapa importante, llamar webhook
   POST /functions/v1/webhook-progress
   {
     "convenio_id": "uuid",
     "stage": "parsing|chunking|embedding|profile|completed",
     "progress": 20, // 0-100
     "message": "LlamaParse completado"
   }
   ```

2. **Crear Edge Function** `webhook-progress`:
   - Recibe eventos de n8n
   - Actualiza tabla `convenio_processing_status`
   - Retorna 200 OK inmediatamente

3. **Crear tabla en BD**:
   ```sql
   CREATE TABLE convenio_processing_status (
     convenio_id UUID PRIMARY KEY REFERENCES convenios(id) ON DELETE CASCADE,
     stage TEXT NOT NULL, -- 'parsing', 'chunking', 'embedding', 'profile', 'completed'
     progress INT NOT NULL CHECK (progress BETWEEN 0 AND 100),
     message TEXT,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. **Modificar polling en frontend**:
   ```typescript
   // En lugar de solo consultar convenios.estado
   // También consultar convenio_processing_status
   const { data } = await supabase
     .from("convenio_processing_status")
     .select("stage, progress, message")
     .eq("convenio_id", convenioId)
     .single();
   ```

5. **Etapas sugeridas** (n8n → webhook):
   - **20%**: LlamaParse completado (después del nodo "Get MD Result")
   - **40%**: Markdown guardado (después del nodo "Save md in supabase")
   - **60%**: Chunks insertados (después del nodo "Bulk Insert Chunks")
   - **80%**: Perfil extraído (después del nodo "Upsert Perfil Supabase")
   - **90%**: Embeddings completados (antes del nodo "Update Convenio Status")
   - **100%**: Todo listo (cuando estado = "activo")

**Beneficios**:
- ✅ Progreso preciso en tiempo real
- ✅ Usuario sabe exactamente en qué etapa está el procesamiento
- ✅ Mejor UX si hay errores en etapas intermedias
- ✅ Mensajes informativos por etapa ("Extrayendo texto del PDF...", "Generando embeddings...")

**Estimación**: 4-6 horas
- 1h: Crear tabla y Edge Function
- 2h: Modificar workflow n8n para enviar eventos
- 1h: Modificar polling en frontend
- 1-2h: Testing y ajustes

---

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

**Última actualización**: 2026-04-21
