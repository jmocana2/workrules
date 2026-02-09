# Arquitectura en el Front

**Framework:** React 19 + Vite
**Patrón:** Clean Architecture Pragmática + Atomic Design

---

## 1. Filosofía: Pragmatismo sobre Purismo

Se ha optado por una **Clean Architecture simplificada** que mantiene la separación de responsabilidades sin el boilerplate excesivo de la versión académica.

---

## 2. Estructura de Carpetas

```javascript
src/
├── core/                      # Lógica de negocio (agnóstica a React)
│   ├── convenio/
│   │   ├── convenio.types.ts
│   │   ├── convenio.repository.ts
│   │   └── convenio.service.ts
│   ├── chat/
│   │   ├── chat.types.ts
│   │   ├── chat.repository.ts
│   │   └── chat.service.ts
│   └── auth/
│       └── ...
│
├── ui/                        # Todo lo visual
│   ├── components/
│   │   ├── shadcn/            # Componentes base de shadcn/ui
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   └── workrules/         # Componentes propios (Atomic Design)
│   │       ├── atoms/         # Elementos indivisibles
│   │       ├── molecules/     # Combinación de átomos
│   │       ├── organisms/     # Secciones completas
│   │       └── pages/         # Páginas completas
│   ├── hooks/                 # Hooks por feature
│   │   ├── useChat.ts
│   │   ├── useConvenio.ts
│   │   └── useAuth.ts
│   └── layouts/
│       └── MainLayout.tsx
│
├── lib/                       # Infraestructura compartida
│   ├── supabase.ts
│   ├── api.ts
│   └── utils.ts
│
└── app.tsx
```

---

## 3. Capas y Responsabilidades

### Core (Lógica de Negocio)
Contiene todo lo que **no depende de React**. Podría reutilizarse en una app móvil o CLI.

### Atomic Design en `components/workrules/`

| Nivel | Descripción | Ejemplos |
|---|---|---|
| **Atoms** | Elementos indivisibles, sin lógica de negocio | Logo, Badge, Chip, Icon |
| **Molecules** | Combinación de átomos con interacción simple | SearchInput, ConvenioCard, ChatBubble |
| **Organisms** | Secciones completas con lógica propia | ChatWindow, ConvenioSelector, Navbar |
| **Pages** | Composición de organisms + layout | HomePage, ChatPage, ConvenioPage |

---

## Componentes del Protocolo de Interacción (Guardrails UI)

| Componente | Estado del Protocolo | Descripción |
|---|---|---|
| **AlertSMI** | E) Resultado < SMI | Card amarilla con salario ajustado y referencia Art. 27 ET |
| **AlertInvalidData** | D) Datos inválidos | Card roja con explicación del límite y sugerencias |
| **AlertConflict** | F) Datos conflictivos | Card con las dos opciones contradictorias para elegir |
| **ConvenioNotFound** | C) No disponible | Card con alternativas (notificar, buscar similar, estatal) |
| **DataRequestForm** | B) Datos incompletos | Formulario con selects/chips de opciones del Perfil JSON |
| **RangeDisplay** | B.4) "No lo sé" | Tabla con rango mín/máx de valores posibles |

---

## 5. Gestión de Estado

### TanStack Query (Server State)
- Caché automático de datos del servidor
- Sincronización y revalidación
- Estados de loading/error integrados

### Zustand (Client State)
- Estado de UI (modales, sidebar)
- Sesión de usuario
- Preferencias locales

---

## 6. Beneficios de esta Arquitectura

| Beneficio | Cómo se logra |
|---|---|
| **Testabilidad** | `core/` se puede testear sin React ni DOM |
| **Cambio de proveedor** | Cambiar Supabase solo afecta a `*.repository.ts` |
| **Consistencia UI** | Atomic Design garantiza componentes reutilizables |
| **Onboarding** | Estructura clara y predecible para nuevos devs |
| **Menos boilerplate** | Sin clases Use Case ni contenedor DI innecesario |
