# Testing de Edge Functions (Deno)

Guía práctica para ejecutar y escribir tests unitarios en las Supabase Edge Functions.

---

## Comandos rápidos

```bash
# Navegar al directorio de functions
cd supabase/functions

# Ejecutar todos los tests
deno task test

# Watch mode (recomendado para TDD)
deno task test:watch

# Generar coverage
deno task test:coverage
deno task coverage:report
```

---

## Estructura de archivos

```
supabase/functions/
├── deno.json                    # Configuración y tasks
├── _shared/
│   ├── lib/
│   │   ├── cors.ts
│   │   └── cors.test.ts         # Tests de utilidades
│   └── core/
│       └── chat/
│           ├── types.ts         # Tipos (no se testean)
│           ├── handlers.ts      # Lógica de negocio
│           └── handlers.test.ts # Tests de handlers
├── chat/
│   └── index.ts                 # Entry point (orquestación)
└── webhook-pdf/
    ├── index.ts
    ├── handlers.ts
    └── handlers.test.ts
```

### Convención de nombres

| Archivo | Descripción |
|---------|-------------|
| `*.ts` | Código fuente |
| `*.test.ts` | Tests unitarios |
| `*.integration.test.ts` | Tests de integración (futuro) |

---

## Anatomía de un test

```typescript
// archivo.test.ts
import { assertEquals, assertExists } from '@std/assert';
import { miFuncion } from './archivo.ts';

Deno.test('miFuncion - descripción del comportamiento', () => {
  // Arrange
  const input = { dato: 'valor' };

  // Act
  const result = miFuncion(input);

  // Assert
  assertEquals(result.status, 'ok');
});
```

### Assertions disponibles

```typescript
import {
  assertEquals,      // Igualdad profunda
  assertExists,      // No es null/undefined
  assertNotEquals,   // Desigualdad
  assertThrows,      // Espera excepción
  assertRejects,     // Espera Promise rechazada
  assertStringIncludes,
  assertArrayIncludes,
} from '@std/assert';
```

---

## Patrón de diseño: Handlers

Para hacer el código testeable, separamos la lógica en **handlers**:

```
index.ts          →  Orquestación (Deno.serve, HTTP)
handlers.ts       →  Lógica de negocio (funciones puras)
handlers.test.ts  →  Tests unitarios
```

### Ejemplo: index.ts (orquestador)

```typescript
import { validateRequest, processRequest } from './handlers.ts';
import { corsHeaders } from '../_shared/lib/cors.ts';

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Delegar a handlers testeados
  const validation = validateRequest(await req.json());
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
    });
  }

  const result = processRequest(validation.data);
  return new Response(JSON.stringify(result.body), {
    status: result.status,
  });
});
```

### Ejemplo: handlers.ts (lógica testeable)

```typescript
export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: RequestData;
}

export function validateRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid body' };
  }
  // ... más validaciones
  return { valid: true, data: body as RequestData };
}

export function processRequest(data: RequestData) {
  return {
    status: 200,
    body: { result: 'ok' },
  };
}
```

### Ejemplo: handlers.test.ts

```typescript
import { assertEquals } from '@std/assert';
import { validateRequest, processRequest } from './handlers.ts';

Deno.test('validateRequest - rechaza body vacío', () => {
  const result = validateRequest(null);

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Invalid body');
});

Deno.test('validateRequest - acepta body válido', () => {
  const result = validateRequest({ campo: 'valor' });

  assertEquals(result.valid, true);
});
```

---

## Mocking

### Mock de funciones globales

```typescript
import { stub, restore } from '@std/testing/mock';

Deno.test('test con mock de fetch', async () => {
  // Arrange: crear stub
  const fetchStub = stub(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify({ data: 'mocked' })))
  );

  try {
    // Act
    const response = await fetch('https://api.example.com');
    const data = await response.json();

    // Assert
    assertEquals(data.data, 'mocked');
  } finally {
    // Cleanup: restaurar siempre
    fetchStub.restore();
  }
});
```

### Mock de variables de entorno

```typescript
Deno.test('test con env var', () => {
  // Arrange
  const originalEnv = Deno.env.get('API_KEY');
  Deno.env.set('API_KEY', 'test-key');

  try {
    // Act & Assert
    assertEquals(Deno.env.get('API_KEY'), 'test-key');
  } finally {
    // Cleanup
    if (originalEnv) {
      Deno.env.set('API_KEY', originalEnv);
    } else {
      Deno.env.delete('API_KEY');
    }
  }
});
```

---

## Testing de Request/Response

```typescript
Deno.test('parseRequestBody - parsea JSON válido', async () => {
  // Crear Request mock
  const request = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ convenio_id: '123' }),
  });

  // Parsear
  const body = await request.json();

  // Assert
  assertEquals(body.convenio_id, '123');
});
```

---

## Tests asíncronos

```typescript
Deno.test('operación async', async () => {
  const result = await fetchData();

  assertEquals(result.status, 'ok');
});

// Con timeout personalizado
Deno.test({
  name: 'operación lenta',
  fn: async () => {
    const result = await slowOperation();
    assertEquals(result, 'done');
  },
  sanitizeOps: false,  // Deshabilitar si hay ops pendientes
  sanitizeResources: false,
});
```

---

## Organización de tests

### Agrupar por función

```typescript
// ============================================
// validateChatRequest
// ============================================

Deno.test('validateChatRequest - caso válido', () => { ... });
Deno.test('validateChatRequest - rechaza null', () => { ... });
Deno.test('validateChatRequest - rechaza campo faltante', () => { ... });

// ============================================
// processChatRequest
// ============================================

Deno.test('processChatRequest - retorna 200', () => { ... });
```

### Naming convention

```
{función} - {comportamiento esperado}
```

Ejemplos:
- `validateRequest - rechaza body vacío`
- `validateRequest - acepta request con campos requeridos`
- `isPdfFile - retorna true para .pdf`
- `extractConvenioId - extrae id de path válido`

---

## Ejecutar tests específicos

```bash
# Solo un archivo
deno test _shared/core/chat/handlers.test.ts

# Tests que coincidan con patrón
deno test --filter "validateChatRequest"

# Solo tests de chat
deno test chat/ _shared/core/chat/
```

---

## Coverage

```bash
# Generar coverage
deno task test:coverage

# Generar reporte LCOV
deno task coverage:report

# Ver en HTML (requiere genhtml)
genhtml coverage.lcov -o coverage_html
```

---

## Checklist antes de commit

- [ ] Todos los tests pasan: `deno task test`
- [ ] Nuevas funciones tienen tests
- [ ] Tests siguen patrón Arrange-Act-Assert
- [ ] Mocks se limpian en `finally`
- [ ] Nombres de tests son descriptivos

---

## Troubleshooting

### "Module not found"

Verificar imports en `deno.json`:

```json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@^1.0.0",
    "@std/testing": "jsr:@std/testing@^1.0.0"
  }
}
```

### "Leaking resources"

Agregar flags al test:

```typescript
Deno.test({
  name: 'mi test',
  fn: async () => { ... },
  sanitizeResources: false,
  sanitizeOps: false,
});
```

### Tests lentos

Usar `--parallel` para ejecutar en paralelo:

```bash
deno test --parallel
```
