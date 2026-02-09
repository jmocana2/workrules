# ADR-001: n8n como RAG Indexer

**Fecha:** Enero 2026
**Estado:** Aceptado
**Decisores:** Solo-dev

---

## Contexto

WorkRules necesita un pipeline de ingesta de documentos (convenios colectivos en PDF) que:

1. Descargue PDFs desde URLs o almacenamiento
2. Convierta PDFs complejos (con tablas) a texto estructurado
3. Extraiga metadatos y perfiles JSON mediante IA
4. Genere embeddings vectoriales
5. Almacene chunks y embeddings en PostgreSQL/pgvector

Este proceso es **asíncrono** y **pesado** (30s - 5min por documento), por lo que no puede ejecutarse en el "fast path" de consultas de usuario.

### Requisitos del pipeline

| Requisito | Prioridad |
|-----------|-----------|
| Orquestación visual de flujos complejos | Alta |
| Integración con APIs externas (LlamaParse, OpenAI, Anthropic) | Alta |
| Webhooks para triggers desde Supabase Storage | Alta |
| Bajo coste operativo (< 30€/mes) | Alta |
| Mantenibilidad por solo-dev | Alta |
| Ejecución programada (BOE Watchdog) | Media |
| Reintentos automáticos en caso de error | Media |

---

## Decisión

**Usar n8n (self-hosted, Community Edition) como orquestador del pipeline de indexación RAG.**

El pipeline se divide en dos ramas paralelas tras el parsing:

```
Webhook → PDF → LlamaParse → Markdown
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
     Rama Chunks                        Rama Perfil JSON
     ├─ Chunking (~450 tokens)           ├─ Claude Sonnet
     ├─ OpenAI Embeddings (1536d)        ├─ Validación JSON
     └─ Bulk Insert                      └─ Upsert perfiles
               │                                 │
               └────────────┬────────────────────┘
                            ▼
                      Response OK
```

---

## Alternativas Consideradas

### 1. LangChain + Servidor Node.js

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Control total del código, ecosistema amplio |
| **Contras** | Requiere mantener servidor 24/7, más código que mantener, sin UI de debugging |
| **Coste** | ~25-50€/mes (servidor dedicado) |
| **Descartado porque** | Mayor complejidad operativa para solo-dev |

### 2. AWS Step Functions + Lambda

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Escalabilidad infinita, pago por uso |
| **Contras** | Vendor lock-in, curva de aprendizaje, debugging complejo |
| **Coste** | Variable, potencialmente alto con muchas ejecuciones |
| **Descartado porque** | Over-engineering para el volumen actual (<100 convenios) |

### 3. Temporal.io

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | Orquestación robusta, workflows como código |
| **Contras** | Requiere infraestructura propia, complejidad alta |
| **Coste** | ~50€/mes mínimo (hosting) |
| **Descartado porque** | Diseñado para equipos, no para solo-dev |

### 4. Pipedream / Make / Zapier

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | SaaS gestionado, fácil de usar |
| **Contras** | Límites en plan gratuito, coste alto en Pro, menos control |
| **Coste** | 20-50€/mes por límites de ejecuciones |
| **Descartado porque** | Límites de ejecución y coste impredecible |

---

## Justificación de n8n

### Ventajas clave

| Ventaja | Detalle |
|---------|---------|
| **UI Visual** | Debugging en tiempo real, logs por nodo, fácil iteración |
| **Self-hosted gratuito** | Community Edition sin límites de workflows ni ejecuciones |
| **400+ integraciones** | Conectores nativos para Supabase, OpenAI, HTTP, Code |
| **Nodos de código** | JavaScript/Python para lógica personalizada (chunking) |
| **Webhooks** | Triggers desde Supabase Storage sin configuración compleja |
| **Cron/Schedule** | Ideal para BOE Watchdog diario |
| **Credenciales encriptadas** | Gestión segura de API keys |
| **Bajo mantenimiento** | Docker pull + restart para actualizar |

### Desventajas aceptadas

| Desventaja | Mitigación |
|------------|------------|
| No escala horizontalmente | Suficiente para <1000 convenios, evaluar Temporal si crece |
| Dependencia de UI | Workflows exportables como JSON, versionables en Git |
| Single point of failure | Backups diarios automatizados |

---

## Consecuencias

### Positivas

- Pipeline operativo en <1 semana de desarrollo
- Costes fijos: ~12€/mes (incluido en VPS Hostinger)
- Debugging visual reduce tiempo de resolución de errores
- Cambios en el pipeline no requieren despliegue de código
- Separación clara entre "slow path" (n8n) y "fast path" (Edge Functions)

### Negativas

- Aprender una herramienta adicional (curva suave)
- Vendor lock-in en la orquestación (mitigado: JSON exportable)
- No es código "puro", algunos desarrolladores lo consideran anti-patrón

### Neutrales

- Requiere VPS propio para self-hosting
- Actualizaciones manuales (no automáticas)

---

## Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Tiempo de procesamiento por PDF | < 3 minutos |
| Tasa de éxito del pipeline | > 95% |
| Tiempo de debugging de errores | < 15 minutos |
| Coste mensual de orquestación | < 20€ |

---

## Referencias

- [n8n Documentation](https://docs.n8n.io/)
- [n8n vs Alternatives](https://n8n.io/vs/)
- [docs/n8n.md](../n8n.md) - Configuración específica del proyecto
- [docs/arquitectura-back.md](../arquitectura/arquitectura-back.md) - Pipeline detallado
