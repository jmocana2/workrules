# WorkRules.eu - Documento de Análisis Integral

**Versión:** 2.0 | **Estatus:** Listo para Ejecución

---

## 1. Visión y Propuesta de Valor

### Problema
El acceso a convenios colectivos en España es complejo. Los documentos en PDF del BOE/REGCON son difíciles de navegar, y las herramientas genéricas (ChatGPT) no están optimizadas para la precisión numérica y la jerarquía de variables (categorías, niveles, pluses) que exige el sector laboral.

RETO BDL: "Lo que no hace nadie a día de hoy es analizar el convenio, que es muy complicado. Decirle a la IA tengo que contratar camareras de piso y gobernantas, que van a trabajar tantas horas a la semana en tal horario en el hotel x que es de categoria tal y cuanto tengo que pagar" 

### Solución
**WorkRules.eu** es un Consultor Laboral Automatizado que utiliza RAG (Retrieval-Augmented Generation) para:
- Interpretar y calcular condiciones basadas en variables específicas del usuario
- Garantizar cero alucinaciones citando siempre la fuente oficial (BOE)
- Guiar al usuario mediante sugerencias dinámicas basadas en el convenio

### Diferenciador Técnico: El "Perfil de Convenio"
Cada convenio procesado genera dos activos:
1. **Vectores:** Para búsqueda semántica de texto legal
2. **Esquema JSON:** Diccionario dinámico que mapea variables críticas para que la IA sepa qué preguntar

```json
// Ejemplo: Hostelería
{
  "convenio": "Hostelería Madrid",
  "variables_criticas": ["Categoría Profesional", "Categoría Hotel", "Años Antigüedad"],
  "valores_posibles": {
    "Categoría Hotel": ["3 estrellas", "4 estrellas", "5 estrellas"],
    "Categoría Profesional": ["Gobernanta", "Camarera", "Recepcionista"]
  }
}

// Ejemplo: Consultoría TIC
{
  "convenio": "Consultoras TIC",
  "variables_criticas": ["Área Funcional", "Grupo", "Nivel"],
  "valores_posibles": {
    "Área Funcional": ["1", "2", "3"],
    "Grupo": ["A", "B", "C"]
  }
}
```

---

## 2. Modelo de Negocio

### SaaS Freemium
| Plan | Características |
|------|-----------------|
| **Free** | Consultas limitadas a convenios públicos |
| **Pro** | Consultas ilimitadas, cálculos avanzados, alertas BOE, PDFs privados |
| **Enterprise** | Herramientas de análisis masivo para gestorías y ETTs |

### Restricciones y Mitigaciones
| Restricción | Mitigación |
|-------------|------------|
| Presupuesto 100€/mes | Cachear respuestas, usar Claude Haiku para consultas simples |
| Riesgo de alucinaciones | Mostrar siempre el "paso a paso" del cálculo y citar artículo |
| Mantenibilidad | Sistema agnóstico basado en metadatos JSON, sin código específico por convenio |

### KPIs de Éxito
- Precisión de cálculo: 100% en tests sobre convenios piloto
- Retención: >3 consultas por sesión
- Conversión: 5-10 usuarios Premium iniciales vía ETTs y SEO

---

## 3. Arquitectura del Sistema

### Patrón: Serverless / Event-Driven Hybrid

**Justificación:**
- **Escalabilidad:** Delegada en proveedores (Vercel/Supabase)
- **Mantenibilidad:** Separación entre ingesta (n8n) y consulta (Edge Functions)
- **Coste:** Optimizado mediante capas gratuitas y procesamiento asíncrono

### Componentes

#### A. Frontend (Capa de Presentación)
- **Framework:** React 19 + Vite
- **Estado:** TanStack Query (server) + Zustand (client)
- **UI:** shadcn/ui + Tailwind CSS
- **IA Integration:** Vercel AI SDK (streaming)
- **Patrón:** Clean Architecture

#### B. Backend (BaaS)
- **Auth & Gateway:** Supabase Auth
- **Compute:** Supabase Edge Functions (Deno)
- **Database:** PostgreSQL + pgvector

#### C. Pipeline de Datos (Ingesta Asíncrona)
- **Orquestador:** n8n
- **Parsing:** LlamaParse (tablas a Markdown)

### Stack Tecnológico Completo

| Categoría | Tecnología | Función |
|-----------|------------|---------|
| Frontend | React 19, Vite, TanStack Query, shadcn/ui | UI/UX y gestión de estado |
| Backend | Supabase Edge Functions (Deno) | API Gateway y lógica serverless |
| Base de Datos | PostgreSQL + pgvector | Datos relacionales + búsqueda semántica |
| IA (Cerebro) | Anthropic Claude 3.5 Sonnet | Razonamiento y cálculo |
| ETL | n8n + LlamaParse | Ingesta y parsing de PDFs |
| Embeddings | OpenAI text-embedding-3-small | Vectorización de texto |
| Fuentes | RSS/API del BOE | Monitorización de actualizaciones |

---

## 4. Flujos del Sistema

### Flujo A: Consulta (Tiempo Real)
```
Usuario -> Frontend -> Edge Function -> Query pgvector -> Obtener chunks + Perfil JSON -> Claude 3.5 -> Streaming Response -> Usuario
```

**Detalle:**
1. Usuario envía pregunta + ID convenio
2. Edge Function valida JWT (Free/Pro)
3. Genera embedding de la pregunta
4. Query vectorial: Top 5 chunks relevantes
5. Obtiene Perfil JSON del convenio
6. Envía contexto + pregunta a Claude
7. Streaming response al frontend

### Flujo B: Ingesta (Asíncrono)
```
PDF subido/BOE detectado -> Webhook -> n8n -> LlamaParse -> Markdown -> Chunking -> Embeddings -> Perfil JSON -> Upsert DB
```

**Detalle:**
1. Trigger: Webhook (nuevo PDF) o Cron (BOE Watchdog)
2. n8n descarga PDF
3. LlamaParse convierte a Markdown estructurado
4. Chunking (~500 tokens con solapamiento)
5. Generación de embeddings
6. Claude extrae Perfil JSON
7. Upsert en PostgreSQL

### Flujo C: Watchdog BOE (Actualización Automática)
```
Cron diario -> RSS BOE -> Filtrar convenios -> ¿Existe código REGCON? -> Si existe: Actualizar versión -> Notificar usuarios
```

---

## 5. Modelo de Datos

### Esquema SQL Base

```sql
-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Tabla de Convenios (Metadatos)
CREATE TABLE convenios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo_regcon text UNIQUE,
  ambito text,
  fecha_vigencia date,
  url_pdf text,
  version int DEFAULT 1,
  estado text DEFAULT 'activo',
  created_at timestamptz DEFAULT now()
);

-- Tabla de Fragmentos (Vectores)
CREATE TABLE convenio_chunks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id uuid REFERENCES convenios(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabla de Perfiles JSON (Diccionario de Variables)
CREATE TABLE convenio_perfiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id uuid REFERENCES convenios(id) ON DELETE CASCADE,
  perfil_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(convenio_id)
);

-- Índice para búsqueda vectorial
CREATE INDEX idx_chunks_embedding ON convenio_chunks
  USING ivfflat (embedding vector_cosine_ops);
```

---

## 6. Clean Architecture

### Frontend (src/)
```
src/
├── domain/                 # Entidades y contratos
│   ├── entities/           # Convenio, Usuario, Calculo
│   ├── repositories/       # IConvenioRepository, IChatRepository
│   └── value-objects/      # ConvenioId, Email
├── application/            # Casos de uso
│   ├── use-cases/          # GetConvenio, AskQuestion, CalculateSalary
│   └── dtos/               # ConvenioDTO, ChatMessageDTO
├── infrastructure/         # Implementaciones
│   ├── repositories/       # SupabaseConvenioRepository
│   ├── services/           # SupabaseClient, AnalyticsService
│   └── mappers/            # ConvenioMapper
├── presentation/           # UI
│   ├── components/         # Componentes shadcn/ui
│   ├── hooks/              # useConvenio, useChat
│   ├── pages/              # HomePage, ChatPage
│   └── stores/             # useAuthStore (Zustand)
└── shared/                 # Utilidades
```

### Backend (supabase/functions/)
```
supabase/
└── functions/
    ├── _shared/                # Código compartido
    │   ├── domain/             # Entidades e interfaces
    │   ├── application/        # Casos de uso
    │   └── infrastructure/     # Repositorios y servicios
    ├── chat-bot/               # Edge Function: Chat
    └── salary-calculator/      # Edge Function: Cálculos
```

---

## 7. Ciclo de Vida (Iterativo-Incremental)

### Fase 1: Fundamentos (El "Build")
**Objetivo:** Pipeline ETL funcional (PDF -> DB)

| ID | Tarea | Prioridad |
|----|-------|-----------|
| I1.1 | Crear proyecto Supabase y configurar región EU | Alta |
| I1.2 | Habilitar extensiones pgvector y uuid-ossp | Alta |
| I1.3 | Crear esquema SQL (convenios, chunks, perfiles) | Alta |
| I1.4 | Configurar Storage bucket para PDFs | Alta |
| I1.5 | Instalar n8n (Docker/self-hosted) | Alta |
| I1.6 | Crear workflow de ingesta (webhook + descarga PDF) | Alta |
| I1.7 | Implementar chunking inteligente (~500 tokens) | Media |
| I1.8 | Integrar generación de embeddings (OpenAI) | Alta |
| I1.9 | Crear nodo de extracción de Perfil JSON (Claude) | Alta |
| I1.10 | Implementar manejo de errores y reintentos | Media |
| I1.11 | Test con convenio real (ej: Oficinas y Despachos) | Alta |
| I1.12 | Documentar APIs y endpoints | Baja |

### Fase 2: Motor RAG (El "Core")
**Objetivo:** IA responde preguntas y realiza cálculos básicos

| ID | Tarea |
|----|-------|
| I2.1 | Crear Edge Function base con validación JWT |
| I2.2 | Implementar búsqueda vectorial (pgvector) |
| I2.3 | Desarrollar prompt engineering para Claude |
| I2.4 | Implementar streaming con Vercel AI SDK |
| I2.5 | Crear lógica de cálculo salarial |
| I2.6 | Implementar caché semántico |
| I2.7 | Tests de precisión con casos reales |

### Fase 3: Frontend MVP (El "Ship")
**Objetivo:** Interfaz de chat funcional con SEO

| ID | Tarea |
|----|-------|
| I3.1 | Configurar proyecto React 19 + Vite |
| I3.2 | Implementar selector de convenios (ComboBox) |
| I3.3 | Desarrollar chat con streaming |
| I3.4 | Crear chips de sugerencias dinámicas |
| I3.5 | Implementar visualización de Markdown/tablas |
| I3.6 | Optimizar Core Web Vitals (LCP < 1.5s) |
| I3.7 | Configurar SEO y meta tags |

### Fase 4: Usuarios y Pagos (El "Monetize")
**Objetivo:** Sistema de suscripción y PDFs privados

| ID | Tarea |
|----|-------|
| I4.1 | Implementar Supabase Auth |
| I4.2 | Crear sistema de roles (Free/Pro/Enterprise) |
| I4.3 | Integrar Stripe (checkout + webhooks) |
| I4.4 | Configurar RLS para PDFs privados |
| I4.5 | Desarrollar flujo de subida de documentos |
| I4.6 | Implementar límites de uso por plan |

### Fase 5: Watchdog BOE (El "Scale")
**Objetivo:** Automatización completa de actualizaciones

| ID | Tarea |
|----|-------|
| I5.1 | Investigar API/RSS del BOE |
| I5.2 | Diseñar sistema de versionado |
| I5.3 | Implementar workflow Cron en n8n |
| I5.4 | Desarrollar motor de Diff (detectar cambios) |
| I5.5 | Crear sistema de notificaciones |
| I5.6 | Dashboard de administración |

---

## 8. Seguridad y Rendimiento

### Seguridad
- **RLS (Row Level Security):** Filtrado a nivel de DB para PDFs privados
- **Validación:** Zod para inputs del chat
- **Webhooks firmados:** n8n solo acepta peticiones de Supabase
- **Secrets:** API Keys solo en variables de entorno de Edge Functions

### Rendimiento
- **Semantic Cache:** Respuestas comunes cacheadas
- **Cold Starts:** Edge Functions en Deno (<50ms)
- **Bundle Size:** Vite tree-shaking para LCP < 1.5s
- **Índices:** pgvector con ivfflat para queries vectoriales

### Escalabilidad
- Coste cero en reposo (serverless)
- Capacidad de 100 a 10.000 convenios sin cambios de arquitectura
- n8n con reintentos automáticos para resiliencia

---

## 9. Convenios Prioritarios (Top 100)

### Sectoriales Estatales
- Construcción (>1M trabajadores)
- Metal
- Hostelería (provinciales: Madrid, Barcelona, Baleares)
- Consultoría TIC ("Cárnicas")
- Comercio / ANGED
- Limpieza de Edificios
- Seguridad Privada
- Transporte de Mercancías

### Grandes Empresas
- Mercadona
- El Corte Inglés
- Telefónica
- SEAT
- Inditex

---

## 10. Herramientas Necesarias

| Herramienta | Propósito |
|-------------|-----------|
| Supabase CLI | Gestión de Edge Functions y migraciones |
| Docker | n8n self-hosted |
| LlamaParse Account | Parsing de tablas (1k páginas/mes gratis) |
| VS Code + SQL Extension | Desarrollo |
| Anthropic API Key | Claude 3.5 Sonnet |
| OpenAI API Key | Embeddings |

---

## 11. Notas de Implementación

### Chat Asistido por Metadatos
El frontend es siempre el mismo. Cuando el usuario elige un convenio, el chat "sabe" qué etiquetas o preguntas sugerir porque lee el Perfil JSON de la base de datos.

### Normalización de Datos
No intentar que todos los convenios tengan los mismos campos. La IA trata variables diferentes (Grupo A, Nivel 1) como inputs equivalentes para buscar el salario en el JSON.

### Reglas Globales de Negocio
- Al procesar convenio: extraer obligatoriamente `numero_pagas`
- Prompt del sistema: "Si el usuario pregunta 'cuánto pagar', busca el salario base anual. Divide por el número de pagas (X) para mensual, o por 1760 horas para precio/hora"

### Anti-Alucinación
- Priorizar "No lo sé" si el dato no está en el contexto
- Siempre mostrar paso a paso del cálculo
- Enlace al artículo y PDF oficial en cada respuesta

### Disclaimer Obligatorio
"Esta herramienta es informativa y no sustituye a un asesor laboral. Verifique siempre con la fuente oficial."
