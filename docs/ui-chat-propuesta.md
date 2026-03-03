# Propuesta UI - Chat y Gestión de Convenios

**Versión:** 1.0 | **Fecha:** 2026-02-22 | **Estado:** Propuesta inicial

---

## 1. Elementos Base Confirmados

### Panel Izquierdo (Sidebar)
- Logo WorkRules
- Botón "Nueva consulta"
- Gestión de PDFs/Convenios (usuarios con permisos)
- Histórico de conversaciones

### Zona Central
- Chat con input desplazable a inferior

### Zona Superior Derecha
- Avatar usuario
- Toggle tema (light/dark)

### Footer
- Aviso legal permanente

---

## 2. Elementos Adicionales Necesarios (Caso WorkRules)

### 2.1 Selector de Convenio - RESPUESTA A TU PREGUNTA

**Recomendación: SÍ, pero con matices**

El selector de convenio **NO debería ser obligatorio**, pero sí **prominente y sugerido**. Razones:

| Enfoque | Pros | Contras |
|---------|------|---------|
| **Obligatorio** | Evita ambigüedad inicial | Fricción alta, el usuario puede no saber el convenio exacto |
| **Opcional prominente** | UX fluida, la IA puede deducir o preguntar | Puede requerir 1 pregunta adicional |
| **Híbrido (recomendado)** | Mejor de ambos mundos | - |

#### Propuesta Híbrida:

```
┌─────────────────────────────────────────────────────────────┐
│  [🔍 Buscar convenio...]  [Hostelería Valencia ▼]  [✕]     │
│                                                             │
│  💬 Escribe tu consulta laboral...                    [➤]  │
└─────────────────────────────────────────────────────────────┘
```

- **Campo de búsqueda/autocompletado** encima del input de chat
- **Chip removible** cuando se selecciona un convenio
- **Si no se selecciona**: La IA pregunta en el primer turno
- **Si se selecciona**: El contexto queda fijado para toda la conversación

### 2.2 Indicador de Contexto Activo

Cuando hay un convenio seleccionado, mostrar un banner sutil:

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Convenio activo: Hostelería Valencia 2026        [Cambiar] │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Panel de Variables del Convenio (Sidebar derecho o modal)

Según el Perfil JSON del convenio, mostrar las variables críticas:

```
┌──────────────────────────┐
│ Variables del Convenio   │
├──────────────────────────┤
│ Categoría: [Seleccionar] │
│ Nivel Hotel: [3★ 4★ 5★]  │
│ Jornada: [Completa ○ ●]  │
│ Antigüedad: [0-2 años]   │
└──────────────────────────┘
```

---

## 3. Elementos de UI en una Conversación

### 3.1 Mensajes del Usuario

```
┌─────────────────────────────────────────────────────────────┐
│                                              [Avatar] 10:32 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ¿Cuánto cobra un ayudante de cocina en Valencia?   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Mensajes del Sistema (Respuesta IA)

```
┌─────────────────────────────────────────────────────────────┐
│ [W] WorkRules                                        10:32  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ He localizado el **Convenio de Hostelería de Valencia**.    │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📄 Convenio Hostelería Valencia 2026                    │ │
│ │ ├─ Art. 32 - Horas extraordinarias                      │ │
│ │ └─ Art. 35 - Plus de nocturnidad                        │ │
│ │                                    [📥 Ver PDF original] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ## Conceptos Base (Cálculo 2026)                            │
│ - **Salario Base Anual:** 19.850,00 €                       │
│ - **Valor Hora Ordinaria:** 10,87 €                         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Concepto          │ Cantidad │ Precio  │ Total         │ │
│ │ Horas Extra       │ 12h      │ 19,02€  │ 228,24€       │ │
│ │ Plus Nocturnidad  │ 40h      │ 2,72€   │ 108,80€       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💰 TOTAL BRUTO MENSUAL: 1.991,21 €                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│ [👍] [👎] [📋 Copiar] [📄 Exportar PDF] [🔄 Recalcular]     │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Tarjeta de Referencia al Convenio (Tu pregunta sobre enlaces)

**SÍ, definitivamente**. Es parte del sistema "Zero Hallucinations":

```
┌─────────────────────────────────────────────────────────────┐
│ 📄 Fuentes utilizadas                                       │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📋 Convenio Hostelería Valencia                       │   │
│ │    Publicado: BOE-A-2026-1234 | Vigencia: 2026        │   │
│ │ ┌─────────────────────────────────────────────────┐   │   │
│ │ │ Art. 32 - Horas extraordinarias          [📄→]  │   │   │
│ │ │ Art. 35 - Plus de nocturnidad            [📄→]  │   │   │
│ │ │ Anexo I - Tablas salariales              [📄→]  │   │   │
│ │ └─────────────────────────────────────────────────┘   │   │
│ │                         [📥 Descargar PDF completo]   │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

Cada `[📄→]` abre el PDF en la página exacta del artículo.

### 3.4 Componentes de Solicitud de Datos (Estado B - Incompletos)

Cuando la IA necesita más información:

```
┌─────────────────────────────────────────────────────────────┐
│ [W] WorkRules                                               │
├─────────────────────────────────────────────────────────────┤
│ Para calcular el salario exacto, necesito saber:            │
│                                                             │
│ **Categoría del hotel:**                                    │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │  ★★★    │ │  ★★★★   │ │ ★★★★★   │                        │
│ │3 estrell│ │4 estrell│ │5 estrell│                        │
│ └─────────┘ └─────────┘ └─────────┘                        │
│                                                             │
│ **Zona del establecimiento:**                               │
│ ○ Valencia capital                                          │
│ ○ Resto de provincia                                        │
│ ○ Costa (temporada alta)                                    │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ℹ️ No lo sé → Ver tabla con todos los rangos          │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Alertas del Protocolo (Estados D, E, F)

#### Alerta SMI (Estado E)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ ALERTA: SALARIO MÍNIMO INTERPROFESIONAL                  │
├─────────────────────────────────────────────────────────────┤
│ El cálculo según convenio resulta en **1.050€/mes**,        │
│ pero el SMI 2026 es de **1.323€/mes**.                      │
│                                                             │
│ 👉 **Por ley, se aplica el salario mayor: 1.323€**          │
│                                                             │
│ Referencia: Art. 27 del Estatuto de los Trabajadores        │
│                                         [Ver desglose →]    │
└─────────────────────────────────────────────────────────────┘
```

#### Alerta Datos Inválidos (Estado D)
```
┌─────────────────────────────────────────────────────────────┐
│ 🚫 DATO FUERA DE RANGO                                      │
├─────────────────────────────────────────────────────────────┤
│ Has indicado **90 horas extra mensuales**, pero el          │
│ límite legal es **80 horas extra ANUALES** (Art. 35.2 ET).  │
│                                                             │
│ ¿Quizás te refieres a?                                      │
│ ┌────────────────────┐ ┌────────────────────┐               │
│ │ 90 horas nocturnas │ │ 9 horas extra      │               │
│ └────────────────────┘ └────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

#### Alerta Datos Conflictivos (Estado F)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ INCONSISTENCIA DETECTADA                                  │
├─────────────────────────────────────────────────────────────┤
│ Has indicado:                                               │
│ • "Jornada completa" → 40h/semana                           │
│ • "20 horas semanales"                                      │
│                                                             │
│ ¿Cuál es la situación correcta?                             │
│ ┌────────────────────┐ ┌────────────────────┐               │
│ │ Jornada completa   │ │ Tiempo parcial 50% │               │
│ │ (40h/semana)       │ │ (20h/semana)       │               │
│ └────────────────────┘ └────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 3.6 Acciones de Continuidad

Al final de cada respuesta completa:

```
┌─────────────────────────────────────────────────────────────┐
│ ¿Qué deseas hacer ahora?                                    │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │📄 Generar    │ │🔄 Comparar   │ │💼 Calcular   │          │
│ │   informe    │ │   con 4★     │ │   Seg. Social│          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Wireframe Completo - Vista Principal

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐                                              [🌙] [Avatar ▼]         │
│ │              │                                                                       │
│ │   WORKRULES  │                              Chat Principal                           │
│ │              │                                                                       │
│ └──────────────┘                                                                       │
├────────────────────┬───────────────────────────────────────────────────────────────────┤
│                    │                                                                   │
│ [+ Nueva consulta] │  ┌─────────────────────────────────────────────────────────────┐  │
│                    │  │ 📋 Convenio activo: Hostelería Valencia 2026     [Cambiar]  │  │
│ ─────────────────  │  └─────────────────────────────────────────────────────────────┘  │
│                    │                                                                   │
│ 📁 MIS CONVENIOS   │  ┌─────────────────────────────────────────────────────────────┐  │
│ ─────────────────  │  │                                                             │  │
│ [Solo Premium]     │  │  [W] Bienvenido a WorkRules                                 │  │
│                    │  │                                                             │  │
│  📄 Hostelería BCN │  │  Soy tu consultor laboral automatizado. Puedo ayudarte a:   │  │
│  📄 Metal Madrid   │  │                                                             │  │
│  + Subir convenio  │  │  • Calcular salarios según convenio                         │  │
│                    │  │  • Consultar períodos de prueba                             │  │
│ ─────────────────  │  │  • Interpretar pluses y complementos                        │  │
│                    │  │  • Verificar límites legales                                │  │
│ 💬 HISTORIAL       │  │                                                             │  │
│ ─────────────────  │  │  ┌───────────────────────────────────────────────────────┐  │  │
│                    │  │  │ 💡 Convenios disponibles: 47 estatales + 12 privados  │  │  │
│  Ayer              │  │  └───────────────────────────────────────────────────────┘  │  │
│  └ Salario cocina  │  │                                                             │  │
│  └ Horas extra     │  │  ─────────────────────────────────────────────────────────  │  │
│                    │  │  ℹ️ Ver aviso legal                                         │  │
│  Hace 3 días       │  │                                                             │  │
│  └ Período prueba  │  └─────────────────────────────────────────────────────────────┘  │
│                    │                                                                   │
│                    │                                                                   │
│                    │                                                                   │
│ [☰ Contraer]       │                                                                   │
│                    │  ┌─────────────────────────────────────────────────────────────┐  │
├────────────────────┤  │  [🔍 Buscar convenio...]  [Hostelería Valencia ▼]  [✕]     │  │
│                    │  │                                                             │  │
│ ⚙️ Configuración   │  │  💬 Escribe tu consulta laboral...                    [➤]  │  │
│ ❓ Ayuda           │  └─────────────────────────────────────────────────────────────┘  │
│                    │                                                                   │
└────────────────────┴───────────────────────────────────────────────────────────────────┘
│                           Aviso Legal | Términos | Privacidad | © WorkRules 2026       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Wireframe - Conversación Activa con Respuesta

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐                                              [🌙] [Avatar ▼]         │
│ │   WORKRULES  │                                                                       │
│ └──────────────┘                                                                       │
├────────────────────┬───────────────────────────────────────────────────────────────────┤
│                    │  ┌─────────────────────────────────────────────────────────────┐  │
│ [+ Nueva consulta] │  │ 📋 Hostelería Valencia 2026                       [Cambiar] │  │
│                    │  └─────────────────────────────────────────────────────────────┘  │
│ ─────────────────  │                                                                   │
│                    │  ┌─────────────────────────────────────────────────────────────┐  │
│ 📁 MIS CONVENIOS   │  │                                                    [👤] Tú  │  │
│ ─────────────────  │  │  ¿Cuánto cobra un ayudante de cocina en un hotel            │  │
│                    │  │  de 3 estrellas con 12 horas extra este mes?                │  │
│  📄 Hostelería BCN │  └─────────────────────────────────────────────────────────────┘  │
│  📄 Metal Madrid   │                                                                   │
│                    │  ┌─────────────────────────────────────────────────────────────┐  │
│ ─────────────────  │  │ [W] WorkRules                                               │  │
│                    │  ├─────────────────────────────────────────────────────────────┤  │
│ 💬 HISTORIAL       │  │                                                             │  │
│ ─────────────────  │  │ He localizado el Convenio de Hostelería de Valencia.        │  │
│                    │  │                                                             │  │
│  Hoy               │  │ ┌─────────────────────────────────────────────────────────┐ │  │
│  └ Ayudante cocina │  │ │ 📄 Convenio Hostelería Valencia 2026                    │ │  │
│                    │  │ │    BOE-A-2026-1234 | Vigencia: 01/01/2026               │ │  │
│  Ayer              │  │ │ ┌─────────────────────────────────────────────────────┐ │ │  │
│  └ Salario cocina  │  │ │ │ • Art. 32 - Horas extraordinarias          [📄 →]  │ │ │  │
│                    │  │ │ │ • Anexo I - Tablas salariales 2026         [📄 →]  │ │ │  │
│                    │  │ │ └─────────────────────────────────────────────────────┘ │ │  │
│                    │  │ │                              [📥 Ver PDF completo]      │ │  │
│                    │  │ └─────────────────────────────────────────────────────────┘ │  │
│                    │  │                                                             │  │
│                    │  │ ## Desglose Salarial - Ayudante de Cocina (3★)              │  │
│                    │  │                                                             │  │
│                    │  │ ┌───────────────────────────────────────────────────────┐   │  │
│                    │  │ │ Concepto              │ Valor      │ Total            │   │  │
│                    │  │ ├───────────────────────┼────────────┼──────────────────┤   │  │
│                    │  │ │ Salario Base          │ 1.654,17€  │ 1.654,17€        │   │  │
│                    │  │ │ Horas Extra (12h)     │ 19,02€/h   │ 228,24€          │   │  │
│                    │  │ └───────────────────────┴────────────┴──────────────────┘   │  │
│                    │  │                                                             │  │
│                    │  │ ┌───────────────────────────────────────────────────────┐   │  │
│                    │  │ │        💰 TOTAL BRUTO MENSUAL: 1.882,41 €             │   │  │
│                    │  │ └───────────────────────────────────────────────────────┘   │  │
│                    │  │                                                             │  │
│                    │  │ ─────────────────────────────────────────────────────────   │  │
│                    │  │ [👍] [👎]   [📋 Copiar]  [📄 PDF]  [🔄 Recalcular]          │  │
│                    │  │                                                             │  │
│                    │  │ ¿Qué deseas hacer ahora?                                    │  │
│                    │  │ [Comparar 4★] [Añadir nocturnidad] [Calcular SS]            │  │
│                    │  └─────────────────────────────────────────────────────────────┘  │
│                    │                                                                   │
│ [☰]                │  ┌─────────────────────────────────────────────────────────────┐  │
├────────────────────┤  │  [🔍 Hostelería Valencia]                            [✕]    │  │
│ ⚙️  ❓             │  │  💬 Escribe tu consulta laboral...                    [➤]  │  │
└────────────────────┴──┴─────────────────────────────────────────────────────────────┴──┘
│                           Aviso Legal | Términos | Privacidad | © WorkRules 2026       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Wireframe - Solicitud de Datos (Estado Incompleto)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                                               [🌙] [Avatar ▼]         │
├────────────────────┬───────────────────────────────────────────────────────────────────┤
│ [Sidebar...]       │                                                                   │
│                    │  ┌─────────────────────────────────────────────────────────────┐  │
│                    │  │                                                    [👤] Tú  │  │
│                    │  │  ¿Salario de recepcionista en Baleares?                     │  │
│                    │  └─────────────────────────────────────────────────────────────┘  │
│                    │                                                                   │
│                    │  ┌─────────────────────────────────────────────────────────────┐  │
│                    │  │ [W] WorkRules                                               │  │
│                    │  ├─────────────────────────────────────────────────────────────┤  │
│                    │  │                                                             │  │
│                    │  │ He localizado el **Convenio de Hostelería de Baleares**.    │  │
│                    │  │                                                             │  │
│                    │  │ Para calcular el salario exacto de recepcionista,           │  │
│                    │  │ necesito dos datos adicionales:                             │  │
│                    │  │                                                             │  │
│                    │  │ **1. Zona del establecimiento:**                            │  │
│                    │  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │  │
│                    │  │ │   📍 Palma   │ │  📍 Resto    │ │ 📍 Ibiza/    │          │  │
│                    │  │ │   (Nivel 1)  │ │  Mallorca    │ │ Formentera   │          │  │
│                    │  │ │              │ │  (Nivel 2)   │ │ (Nivel 3)    │          │  │
│                    │  │ └──────────────┘ └──────────────┘ └──────────────┘          │  │
│                    │  │                                                             │  │
│                    │  │ **2. Categoría del hotel:**                                 │  │
│                    │  │ ┌────────┐ ┌────────┐ ┌────────┐                            │  │
│                    │  │ │  ★★★   │ │  ★★★★  │ │ ★★★★★  │                            │  │
│                    │  │ └────────┘ └────────┘ └────────┘                            │  │
│                    │  │                                                             │  │
│                    │  │ ┌───────────────────────────────────────────────────────┐   │  │
│                    │  │ │ ℹ️ ¿No conoces estos datos?                           │   │  │
│                    │  │ │    [Ver tabla completa con todos los rangos →]        │   │  │
│                    │  │ └───────────────────────────────────────────────────────┘   │  │
│                    │  │                                                             │  │
│                    │  └─────────────────────────────────────────────────────────────┘  │
│                    │                                                                   │
└────────────────────┴───────────────────────────────────────────────────────────────────┘
```

---

## 7. Wireframe - Gestión de Convenios (Panel Premium)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐                                              [🌙] [Avatar ▼]         │
│ │   WORKRULES  │            📁 Gestión de Convenios                                    │
│ └──────────────┘                                                                       │
├────────────────────┬───────────────────────────────────────────────────────────────────┤
│                    │                                                                   │
│ [← Volver al chat] │  ┌─────────────────────────────────────────────────────────────┐  │
│                    │  │ [🔍 Buscar convenio...]           [+ Subir convenio privado] │  │
│ ─────────────────  │  └─────────────────────────────────────────────────────────────┘  │
│                    │                                                                   │
│ FILTROS            │  ┌────── Convenios Estatales (47) ──────┐                         │
│ ─────────────────  │  │                                      │                         │
│ ○ Todos            │  │  ┌────────────────────────────────┐  │                         │
│ ● Estatales        │  │  │ 📋 Hostelería (Estatal)        │  │                         │
│ ○ Autonómicos      │  │  │ Vigencia: 2024-2027            │  │                         │
│ ○ Mis privados     │  │  │ Última actualización: Feb 2026 │  │                         │
│                    │  │  │ [📄 Ver] [💬 Consultar]        │  │                         │
│ SECTORES           │  │  └────────────────────────────────┘  │                         │
│ ─────────────────  │  │                                      │                         │
│ ☑ Hostelería       │  │  ┌────────────────────────────────┐  │                         │
│ ☑ Comercio         │  │  │ 📋 Metal                       │  │                         │
│ ☐ Construcción     │  │  │ Vigencia: 2025-2028            │  │                         │
│ ☐ Oficinas         │  │  │ [📄 Ver] [💬 Consultar]        │  │                         │
│ ☐ Transporte       │  │  └────────────────────────────────┘  │                         │
│                    │  │                                      │                         │
│                    │  └──────────────────────────────────────┘                         │
│                    │                                                                   │
│                    │  ┌────── Mis Convenios Privados (3) ──────┐                       │
│                    │  │                                        │                       │
│                    │  │  ┌────────────────────────────────┐    │                       │
│                    │  │  │ 🔒 Hotel Mediterráneo (interno) │    │                       │
│                    │  │  │ Subido: 15/02/2026              │    │                       │
│                    │  │  │ Estado: ✅ Procesado            │    │                       │
│                    │  │  │ [📄 Ver] [💬 Consultar] [🗑️]    │    │                       │
│                    │  │  └────────────────────────────────┘    │                       │
│                    │  │                                        │                       │
│                    │  │  ┌────────────────────────────────┐    │                       │
│                    │  │  │ 🔒 Acuerdo empresa XYZ         │    │                       │
│                    │  │  │ Subido: 10/01/2026              │    │                       │
│                    │  │  │ Estado: ⏳ Procesando...        │    │                       │
│                    │  │  │ [Ver progreso]                  │    │                       │
│                    │  │  └────────────────────────────────┘    │                       │
│                    │  │                                        │                       │
│                    │  └────────────────────────────────────────┘                       │
│                    │                                                                   │
└────────────────────┴───────────────────────────────────────────────────────────────────┘
```

---

## 8. Wireframe - Modal Subir Convenio

```
┌─────────────────────────────────────────────────────────────┐
│               📤 Subir Convenio Privado              [✕]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │         📄                                            │  │
│  │                                                       │  │
│  │    Arrastra tu PDF aquí o haz clic para seleccionar   │  │
│  │                                                       │  │
│  │    Formatos: PDF | Máx: 50MB                          │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Nombre del convenio: [                                  ]  │
│                                                             │
│  Sector: [Seleccionar sector            ▼]                  │
│                                                             │
│  Ámbito:                                                    │
│  ○ Empresa    ○ Provincial    ○ Autonómico                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ℹ️ El procesamiento puede tardar hasta 24 horas.      │  │
│  │    Te notificaremos cuando esté listo.                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│                          [Cancelar]  [📤 Subir y procesar]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Componentes Clave Identificados

### Atoms
- `Logo` - Logotipo WorkRules
- `Badge` - Etiquetas de estado (Premium, Procesando, etc.)
- `ThemeToggle` - Switch light/dark
- `StarRating` - Indicador de estrellas para hoteles
- `ArticleLink` - Enlace a artículo con icono PDF

### Molecules
- `ConvenioChip` - Chip removible con nombre de convenio
- `ConvenioSearchInput` - Autocompletado de convenios
- `ChatBubbleUser` - Mensaje del usuario
- `ChatBubbleSystem` - Mensaje de la IA
- `SourceCard` - Tarjeta de fuentes/referencias
- `DataRequestCard` - Solicitud de datos con opciones
- `AlertCard` - Alertas de SMI/inválido/conflicto
- `ActionChip` - Botones de acción (Comparar, Exportar, etc.)
- `ConvenioListItem` - Item en lista de convenios

### Organisms
- `Sidebar` - Panel lateral completo
- `ChatWindow` - Zona de conversación
- `ChatInput` - Input + selector de convenio
- `ConvenioManager` - Gestión de PDFs
- `ResponseActions` - Barra de acciones post-respuesta
- `ContinuityOptions` - Opciones de seguimiento
- `CalculationTable` - Tabla de cálculo salarial

### Pages
- `ChatPage` - Vista principal del chat
- `ConvenioPage` - Gestión de convenios
- `SettingsPage` - Configuración de usuario

---

## 10. Resumen de Respuestas a tus Preguntas

| Pregunta | Respuesta |
|----------|-----------|
| **¿Selector de convenio obligatorio?** | NO obligatorio, pero SÍ prominente. Enfoque híbrido: chip opcional + IA pregunta si no se selecciona |
| **¿Enlaces a PDF en respuestas?** | SÍ, fundamental. Cada artículo citado debe enlazar a la página exacta del PDF |
| **¿Qué elementos en conversación?** | Ver sección 3: mensajes, tarjetas de fuentes, solicitud de datos, alertas, acciones de continuidad |
| **¿Elementos adicionales para WorkRules?** | Indicador de contexto activo, panel de variables, alertas de protocolo (SMI, inválidos, conflictos) |

---

## 11. Próximos Pasos

1. [ ] Definir paleta de colores y tipografía
2. [ ] Crear componentes en Figma/diseño visual
3. [ ] Mapear componentes a la arquitectura Atomic Design existente
4. [ ] Definir estados de loading/error para cada componente
5. [ ] Diseñar versión responsive (mobile)
