# ChatPage

Página principal de chat para consultas de convenios colectivos españoles.

## Descripción

ChatPage es el componente de página principal de WorkRules. Proporciona una interfaz de chat completa con tres áreas principales:

1. **Sidebar** (izquierda): Navegación de conversaciones y gestión de usuario
2. **Chat** (centro): Área de mensajes con streaming y selector de convenio
3. **VariablesPanel** (derecha): Variables del convenio seleccionado para insertar en el chat

## Características

- Layout de 3 columnas responsive
- Integración con Vercel AI SDK para streaming (preparado para producción)
- Soporte para citaciones BOE en respuestas del asistente
- Panel de variables colapsable
- Inserción de variables en el textarea mediante click
- Scroll automático a nuevos mensajes
- Estados de carga y vacío
- Selector de convenio sticky en el header

## Uso

```tsx
import { ChatPage } from '@ui/components/workrules/pages/ChatPage';

function App() {
  return <ChatPage />;
}
```

### Con props mock (para Storybook)

```tsx
import { ChatPage } from '@ui/components/workrules/pages/ChatPage';
import {
  MOCK_CONVENIOS,
  MOCK_CONVERSATIONS,
  MOCK_PERFIL_HOSTELERIA,
} from '@mocks/data/convenios';

function Story() {
  return (
    <ChatPage
      mockConvenios={MOCK_CONVENIOS}
      mockConversations={MOCK_CONVERSATIONS}
      mockPerfil={MOCK_PERFIL_HOSTELERIA}
      mockUserPlan="premium"
    />
  );
}
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `mockConvenios` | `Convenio[]` | `MOCK_CONVENIOS` | Lista de convenios (solo mock) |
| `mockPerfil` | `PerfilJson \| null` | `null` | Perfil JSON del convenio (solo mock) |
| `mockConversations` | `ConversationSummary[]` | `MOCK_CONVERSATIONS` | Conversaciones previas (solo mock) |
| `mockUserPlan` | `'free' \| 'premium'` | `'free'` | Plan del usuario (solo mock) |
| `className` | `string` | - | Clases CSS adicionales |

## Componentes integrados

- `Sidebar` - Navegación y gestión de conversaciones
- `ConvenioSelector` - Selector de convenio con búsqueda fuzzy
- `VariablesPanel` - Panel de variables del convenio
- `Message`, `MessageContent`, `MessageResponse` - Renderizado de mensajes
- `PromptInput`, `PromptInputTextarea` - Input de chat con soporte de archivos
- `Sources` - Citaciones BOE expandibles

## Estructura de archivos

```
ChatPage/
├── ChatPage.tsx       # Componente principal
├── index.ts          # Exportaciones
└── README.md         # Documentación
```

## Estado interno

El componente mantiene el siguiente estado:

- `selectedConvenio`: Convenio actualmente seleccionado
- `perfilJson`: Variables del convenio seleccionado
- `isPanelCollapsed`: Estado del panel de variables
- `currentConversationId`: ID de la conversación activa
- `messages`: Array de mensajes del chat
- `input`: Valor del textarea
- `isLoading`: Estado de carga durante respuesta

## Integración con backend (TODO)

En producción, este componente debería:

1. Usar `useChat()` de Vercel AI SDK en lugar de la lógica simulada
2. Conectarse a `/functions/v1/chat` de Supabase Edge Functions
3. Cargar perfiles JSON desde la base de datos
4. Persistir conversaciones y mensajes
5. Manejar streaming de respuestas

## Mejoras futuras

- [ ] Soporte para attachments (imágenes, PDFs)
- [ ] Búsqueda de mensajes
- [ ] Exportar conversación a PDF
- [ ] Compartir conversación
- [ ] Modo oscuro/claro toggle
- [ ] Accesos rápidos de teclado
- [ ] Historial de variables usadas
- [ ] Sugerencias de preguntas frecuentes
