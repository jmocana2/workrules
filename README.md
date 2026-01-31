# 📘 Documento de Análisis Integral: WorkRules.eu
**Versión:** 1.0 (Final Session) | **Estatus:** Listo para Ejecución | **Año:** 2026

---

## 1. Visión Estratégica y Negocio

### Contexto y Problema
El acceso a la normativa laboral en España es tradicionalmente ineficiente. Los convenios colectivos se publican como PDFs densos y no estructurados. Los usuarios (trabajadores y RRHH) no solo necesitan encontrar un texto, sino **interpretarlo y aplicarlo** a casos concretos de contratación y salarios.

### Propuesta de Valor
WorkRules.eu transforma documentos legales en un **Asistente Experto Laboral**. A diferencia de una IA genérica, utiliza una arquitectura RAG especializada que garantiza:
1.  **Cálculo Preciso:** Capacidad de interpretar variables (categoría, jornada, horario) para dar cifras exactas.
2.  **Cero Alucinaciones:** Respuestas basadas estrictamente en el texto del BOE/REGCON, citando siempre la fuente.
3.  **Guía Inteligente:** Interfaz que sugiere variables basadas en el convenio seleccionado.

### Modelo de Monetización (Freemium SaaS)
* **Free:** Consultas básicas a convenios generales.
* **Pro (Pago):** Consultas ilimitadas, calculadora de costes, alertas del BOE y **PDFs Privados** (análisis de documentos propios con privacidad total).
* **Enterprise:** Herramientas de análisis masivo para gestorías y ETTs.

---

## 2. Arquitectura del Software (Senior Architect Level)

Hemos definido una arquitectura **Serverless / Event-Driven Hybrid** diseñada para un *Solo Developer*, priorizando el bajo coste operativo y la alta mantenibilidad.



### A. Frontend (Capa de Presentación)
* **Stack:** React 19 + Vite + Tailwind CSS + shadcn/ui.
* **Patrón:** **Clean Architecture**. Separación estricta entre:
    * **Domain:** Entidades puras (Convenio, Usuario).
    * **Application:** Casos de uso (AskQuestion, IngestDocument).
    * **Infrastructure:** Adaptadores para Supabase y APIs externas.

### B. Backend (Capa de Servicios y API)
* **Stack:** Supabase Edge Functions (Deno).
* **Patrón:** **Clean Architecture Lite**. Centralización en `_shared` para evitar duplicidad.
* **Lógica:** Request-Response para el Chat (Fast Path).

### C. Pipeline de Datos y Eventos (Capa de Ingesta)
* **Stack:** n8n (Orquestador) + LlamaParse (OCR/Markdown).
* **Patrón:** **Event-Driven (Asíncrono)**. La subida de un PDF o la detección en el BOE dispara un flujo asíncrono que no bloquea la aplicación.



### D. Base de Datos
* **Motor:** PostgreSQL (Supabase).
* **Extensiones:** `pgvector` para búsqueda semántica.
* **Estructura:** Relacional (metadatos) + Vectorial (embeddings) + JSONB (perfiles de cálculo).
* **Documentación:** Ver `database/README.md` para detalles completos del esquema y uso.

## Supabase
- Project URL: `https://<SUPABASE_PROJECT_REF>.supabase.co`
- Región: eu-west-1

#### Tablas Principales
1. **convenios**: Información principal de convenios colectivos (nombre, código REGCON, ámbito, vigencia)
2. **convenio_chunks**: Fragmentos de texto con embeddings vectoriales para búsqueda semántica (RAG)
3. **convenio_perfiles**: Perfiles profesionales extraídos en formato JSONB con categorías y salarios

---

## 3. Estrategia de IA y Datos

### El Motor RAG (Retrieval-Augmented Generation)
1.  **Embeddings:** Uso de `text-embedding-3-small` para vectorizar fragmentos de texto.
2.  **Perfil JSON (El Diferenciador):** n8n procesa el convenio y le pide a la IA que genere un "Esquema de Variables" (Diccionario). Este JSON mapea categorías profesionales, pluses y jornadas.
3.  **Razonamiento:** **Anthropic Claude 3.5 Sonnet**. Elegido por su capacidad superior para seguir instrucciones lógicas y procesar tablas Markdown sin errores.

---

## 4. Ciclo de Vida y Roadmap

Adoptamos un modelo **Iterativo e Incremental** dividido en 5 hitos:

1.  **Incremento 1 (Cimientos):** Infraestructura, DB y Pipeline ETL básico (PDF -> DB).
2.  **Incremento 2 (Cerebro):** Desarrollo de la lógica RAG y el Agente de Cálculo en el Back.
3.  **Incremento 3 (Interfaz):** Chat con streaming, SEO especializado y UI de calculadora.
4.  **Incremento 4 (Negocio):** Sistema de suscripción, Auth y procesamiento de PDFs privados.
5.  **Incremento 5 (Escala):** Automatización total con el Watchdog del BOE.

---

## 5. Análisis Detallado: Fase 1 (Incremento 1)

Esta fase establece la fábrica de datos.

### Tareas Atómicas:
* **[I1.1] Setup:** Configuración de API Keys (Anthropic, OpenAI, LlamaParse) y entornos Supabase/n8n.
* **[I1.2] DB Design (SQL):** ✅ Despliegue de tablas `convenios`, `chunks` (vectoriales) y `perfiles` (JSONB). (Ver `database/schema.sql`)
* **[I1.3] n8n Extraction:** Workflow que transforma PDF a Markdown estructurado vía LlamaParse.
* **[I1.4] n8n Profile Generator:** Prompting para extraer el diccionario de variables (JSON) del convenio.
* **[I1.5] Vectorización:** Segmentación de texto y carga masiva en `pgvector`.
* **[I1.6] Validación:** Test de integración con un "Golden PDF" de alta complejidad.

### Criterios de Calidad (DoD):
* Código subido a `main`.
* Tablas creadas en Supabase con RLS (Row Level Security).
* n8n genera un JSON válido que mapea al menos el 90% de las categorías salariales del PDF.

---

## 6. Configuración del Proyecto

### Requisitos previos
- Cuenta en [Supabase](https://supabase.com) con extensión `pgvector` habilitada
- Instancia de [n8n](https://n8n.io) (self-hosted o cloud)
- API Keys: OpenAI, LlamaParse, Anthropic

### Base de datos
1. Crear un proyecto en Supabase
2. Ejecutar `database/schema.sql` para crear las tablas
3. Ejecutar los scripts en `database/functions/` para las funciones de búsqueda

### Workflows de n8n
Los workflows se encuentran en `n8n/workflows/`. Antes de importarlos:

1. **Reemplazar placeholders:** Buscar `<SUPABASE_PROJECT_REF>` en los archivos JSON y sustituirlo por el project ref de tu instancia de Supabase (el subdominio de tu URL, ej: `abcdefghijklmnop`)
2. **Configurar credenciales en n8n:**
   - **Supabase API** — con tu `service_role` key y URL del proyecto
   - **OpenAI API** — con tu API key
   - **LlamaParse** — Header Auth con tu API key de LlamaParse (`Authorization: Bearer <key>`)
3. **Importar los workflows** desde la UI de n8n (Settings > Import from file)
4. **Asignar las credenciales** creadas en el paso 2 a cada nodo que las requiera

| Workflow | Archivo | Descripción |
|---|---|---|
| Indexer | `Workrules-Indexer.json` | Pipeline completo: descarga PDF, extrae markdown, genera chunks y embeddings, guarda en Supabase |
| Errors | `Workrules-Errors.json` | Gestión de errores del pipeline con clasificación y logging |

---

## 7. Seguridad y Rendimiento
* **Seguridad:** Row Level Security (RLS) para proteger documentos privados. Webhooks firmados entre Supabase y n8n.
* **Rendimiento:** Latencia mínima mediante Edge Functions distribuidas globalmente.
* **SEO:** Implementación de HTML semántico y Core Web Vitals 100/100 para captar tráfico de consultas laborales orgánicas.