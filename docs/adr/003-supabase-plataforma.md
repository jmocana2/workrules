# ADR-003: Supabase como Plataforma Backend (BaaS)

**Fecha:** Enero 2026
**Estado:** Aceptado
**Decisores:** Solo-dev

---

## Contexto

WorkRules requiere una infraestructura backend que soporte:

1. **Base de datos relacional** para convenios, usuarios, suscripciones
2. **Búsqueda vectorial** para RAG (embeddings de 1536 dimensiones)
3. **Autenticación** con niveles Free/Premium/Enterprise
4. **Almacenamiento** de PDFs originales
5. **Compute serverless** para lógica de negocio
6. **Row Level Security** para documentos privados

### Restricciones del proyecto

| Restricción | Valor |
|-------------|-------|
| Presupuesto total | ~100€/mes |
| Equipo | Solo-dev |
| Región prioritaria | Europa (España) |
| Escalabilidad inicial | < 1000 usuarios |
| Tiempo de setup | < 1 semana |

---

## Decisión

**Usar Supabase como plataforma Backend-as-a-Service (BaaS) unificada.**

### Componentes utilizados

| Componente | Función en WorkRules |
|------------|---------------------|
| **PostgreSQL** | Datos relacionales (convenios, usuarios, chats) |
| **pgvector** | Embeddings y búsqueda semántica |
| **Auth** | Autenticación JWT, niveles de suscripción |
| **Storage** | PDFs originales de convenios |
| **Edge Functions** | API del chat RAG (retriever) |
| **Realtime** | (Futuro) Notificaciones de nuevos convenios |

### Arquitectura resultante

```
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Auth       │  │   Storage    │  │ Edge Fn      │       │
│  │   (JWT)      │  │   (PDFs)     │  │ (Deno)       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│          │                │                 │                │
│          └────────────────┼─────────────────┘                │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              PostgreSQL + pgvector                   │    │
│  │                                                      │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │ convenios  │ │ chunks     │ │ perfiles   │       │    │
│  │  │ (metadata) │ │ (vectors)  │ │ (JSONB)    │       │    │
│  │  └────────────┘ └────────────┘ └────────────┘       │    │
│  │                                                      │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │ auth.users │ │ cache      │ │ chats      │       │    │
│  │  │ (built-in) │ │ (semantic) │ │ (history)  │       │    │
│  │  └────────────┘ └────────────┘ └────────────┘       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Alternativas Consideradas

### 1. Firebase (Google Cloud)

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Ecosistema maduro, excelente documentación, Auth robusto |
| **Contras** | Firestore es NoSQL (no ideal para datos relacionales), sin pgvector, vendor lock-in fuerte |
| **Coste** | Gratuito limitado, Blaze plan impredecible |
| **Descartado porque** | NoSQL no apto para consultas relacionales complejas, sin búsqueda vectorial nativa |

### 2. AWS (RDS + Lambda + Cognito + S3)

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Escalabilidad infinita, servicios maduros |
| **Contras** | Complejidad de IAM, múltiples servicios que gestionar, curva alta |
| **Coste** | ~50-100€/mes mínimo para esta configuración |
| **Descartado porque** | Over-engineering para solo-dev, fragmentación de servicios |

### 3. PlanetScale + Vercel + Clerk

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | MySQL serverless (PlanetScale), Auth moderno (Clerk) |
| **Contras** | Sin pgvector (PlanetScale es MySQL), 3 proveedores diferentes |
| **Coste** | ~40-60€/mes combinado |
| **Descartado porque** | No soporta búsqueda vectorial nativa |

### 4. Railway + PostgreSQL self-managed

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Control total, PostgreSQL con extensiones |
| **Contras** | Sin Auth integrado, sin Storage, más DevOps |
| **Coste** | ~20-30€/mes |
| **Descartado porque** | Requiere gestionar Auth y Storage por separado |

### 5. Neon + Supabase Auth + Cloudflare R2

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Neon tiene branching de DB, R2 es barato |
| **Contras** | Fragmentación, Edge Functions de Neon menos maduras |
| **Coste** | ~25-40€/mes |
| **Descartado porque** | Complejidad de integración entre proveedores |

---

## Justificación de Supabase

### Ventajas clave

| Ventaja | Detalle |
|---------|---------|
| **Plataforma unificada** | DB + Auth + Storage + Compute en un solo dashboard |
| **PostgreSQL real** | SQL completo, no emulación, extensiones disponibles |
| **pgvector integrado** | Búsqueda vectorial sin servicios adicionales |
| **Open source** | Posibilidad de self-host si es necesario |
| **Row Level Security** | Seguridad a nivel de fila sin código adicional |
| **Región EU** | Datacenter en eu-west (Frankfurt), cumple GDPR |
| **SDK tipado** | Cliente TypeScript con tipos generados de la DB |
| **Pricing predecible** | Plan Pro fijo (25$/mes), sin sorpresas |

### Por qué pgvector sobre alternativas vectoriales

| Solución | Pros | Contras | Decisión |
|----------|------|---------|----------|
| **pgvector** | Integrado en PostgreSQL, sin servicio extra | Menos optimizado que DBs especializadas | ✅ Elegido |
| **Pinecone** | Optimizado para vectores, escalable | Coste adicional (~70$/mes), servicio extra | ❌ |
| **Qdrant** | Open source, rápido | Requiere hosting separado | ❌ (futuro) |
| **Weaviate** | GraphQL, multimodal | Complejidad innecesaria | ❌ |

### Desventajas aceptadas

| Desventaja | Mitigación |
|------------|------------|
| Vendor lock-in parcial | Open source permite migrar, SQL estándar |
| Edge Functions solo Deno | Deno es competente, curva de aprendizaje asumible |
| Dashboard puede ser lento | CLI disponible para operaciones frecuentes |
| Límites en plan gratuito | Plan Pro (25$/mes) elimina límites críticos |

---

## Consecuencias

### Positivas

- **Time-to-market reducido**: Setup completo en < 1 día
- **Coste predecible**: ~25€/mes (Pro) cubre todas las necesidades
- **Una sola factura**: No gestionar múltiples proveedores
- **DX excelente**: Dashboard intuitivo, SDK tipado, CLI completo
- **Escalabilidad vertical**: Upgrade de plan sin migración
- **Backups automáticos**: Incluidos en Plan Pro (diarios, 7 días retención)

### Negativas

- **Dependencia de Supabase**: Si cierra, migración requerida
- **Límites de Edge Functions**: 50MB por función, 60s timeout
- **Sin multi-región**: Un solo datacenter (aceptable para España/EU)

### Neutrales

- Aprender Supabase-specific features (RLS policies, SQL functions)
- Gestión de migraciones via Supabase CLI o SQL directo

---

## Modelo de Datos Principal

```sql
-- Convenios (metadatos)
CREATE TABLE convenios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  codigo_regcon TEXT UNIQUE,
  ambito TEXT,
  vigencia_inicio DATE,
  vigencia_fin DATE,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks vectorizados (RAG)
CREATE TABLE convenio_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convenio_id UUID REFERENCES convenios(id),
  contenido TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfiles JSON extraídos
CREATE TABLE convenio_perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convenio_id UUID REFERENCES convenios(id) UNIQUE,
  perfil JSONB NOT NULL,  -- Categorías, salarios, variables
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda vectorial
CREATE INDEX ON convenio_chunks
USING hnsw (embedding vector_cosine_ops);
```

---

## Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Tiempo de setup inicial | < 1 día |
| Coste mensual infraestructura | < 30€ |
| Uptime de Supabase | > 99.9% (SLA Pro) |
| Latencia DB desde Edge Function | < 10ms |
| Tiempo de búsqueda vectorial | < 100ms |

---

## Plan de Contingencia

### Si Supabase deja de ser viable

1. **Base de datos**: Exportar con `pg_dump`, importar en cualquier PostgreSQL
2. **Auth**: Migrar a Auth0/Clerk (JWT compatible)
3. **Storage**: Migrar a S3/R2 (API compatible con S3)
4. **Edge Functions**: Migrar a Cloudflare Workers o AWS Lambda

### Señales de alerta para reconsiderar

- Latencia de DB > 50ms constante
- Costes superan 50€/mes sin crecimiento de usuarios
- Downtime > 1% mensual
- Falta de soporte para features críticas (ej: mejor pgvector)

---

## Referencias

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Pricing](https://supabase.com/pricing)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [docs/arquitectura.md](../arquitectura.md)
- [docs/arquitectura-back.md](../arquitectura/arquitectura-back.md)
- [database/schema.sql](../../database/schema.sql)
