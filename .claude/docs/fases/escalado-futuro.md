# Escalado de features en un futuro

> **Aviso importante:** Esta página contiene ideas y planteamientos para un futuro. Su desarrollo **no está planificado actualmente** y sirve como referencia para evaluar posibles direcciones de crecimiento del producto.

---

## Tier 1: Expansión del Core

### Auditor de Nóminas

| Campo | Descripción |
|---|---|
| **Descripción** | El usuario sube una nómina PDF + selecciona convenio → El sistema detecta errores o incumplimientos |
| **Valor potencial** | Muy Alto - Resuelve un dolor crítico |
| **Complejidad** | Alta - Requiere parsing de nóminas + lógica de validación |

### Generador de Contratos

| Campo | Descripción |
|---|---|
| **Descripción** | A partir del convenio y datos del empleado, genera un borrador de contrato laboral |
| **Valor potencial** | Alto |
| **Complejidad** | Alta - Plantillas legales + personalización |

### API Pública

| Campo | Descripción |
|---|---|
| **Descripción** | Endpoint REST para que gestorías y ERPs integren los cálculos de WorkRules |
| **Valor potencial** | Muy Alto - Abre canal B2B |
| **Complejidad** | Media |

---

## Tier 2: Inteligencia de Mercado

### Dashboard de Tendencias

| Campo | Descripción |
|---|---|
| **Descripción** | Visualización de evolución salarial por sector, comparativas regionales, históricos |
| **Valor potencial** | Alto |
| **Complejidad** | Alta - Requiere datos históricos + visualización |

### Benchmark Salarial

| Campo | Descripción |
|---|---|
| **Descripción** | "¿Estás pagando por encima o debajo del mercado para esta categoría?" |
| **Valor potencial** | Alto |
| **Complejidad** | Media |

---

## Tier 3: Escala y Automatización

### Multi-Idioma / Multi-País

| Campo | Descripción |
|---|---|
| **Descripción** | Convenios colectivos de Francia, Alemania, UK (cada país tiene su "BOE") |
| **Valor potencial** | Muy Alto |
| **Complejidad** | Muy Alta - Cada país tiene estructura diferente |

---

## Próximos Pasos

Esta página se revisará cuando:
1. Las Fases 1-6 estén completadas
2. Existan al menos 10 usuarios Premium activos
3. Se haya validado el product-market fit

**Fecha estimada de revisión:** A determinar tras completar Fase 6
