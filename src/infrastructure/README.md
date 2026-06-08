# Infrastructure Layer

Adaptadores concretos que implementan los puertos definidos en `@/application/ports`.

## Reglas

1. **Es la unica capa que puede importar SDKs externos** (`@supabase/supabase-js`, etc.).
2. Cada adaptador implementa **un puerto** completo.
3. Los adaptadores son **clases** o factories que reciben el cliente externo en el constructor.
4. No contienen reglas de negocio; solo traducen entre el SDK y el modelo de dominio.

## Estructura

```
infrastructure/
  clients/            Singletons de clientes externos (Supabase, etc.)
  repositories/       Adaptadores que implementan los puertos
```

## Sustituir infraestructura

Para cambiar de Supabase a otro backend bastaria con:
1. Crear nuevos adaptadores en `infrastructure/repositories/` que implementen los mismos puertos.
2. Cambiar la instanciacion en `RepositoriesProvider`.

Ni el dominio ni los casos de uso ni la UI tendrian que cambiar.
