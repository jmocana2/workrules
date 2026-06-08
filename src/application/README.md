# Application Layer

Capa de aplicacion del frontend. Contiene los **puertos** (interfaces de repositorio) y los **casos de uso** que orquestan el dominio.

## Reglas

1. **No importar de `@/lib`, `@/infrastructure`, `@supabase/supabase-js` ni de ningun SDK.** Esta capa describe *que* hace la app, no *como*.
2. Solo puede depender de `@core/*` (dominio).
3. Los casos de uso son **funciones puras** que reciben sus dependencias como parametros.
4. Los puertos definen la **firma minima** que necesita la aplicacion, no la API completa de la infraestructura.

## Estructura

```
application/
  ports/              Interfaces que la infraestructura debe implementar
  use-cases/          Funciones que orquestan los puertos
```

## Flujo de dependencias

```
UI (hooks) → application/use-cases → application/ports
                                          ↑ implementa
                                     infrastructure/repositories
```

La UI llama a un caso de uso pasandole un repositorio concreto. El caso de uso solo conoce el puerto, no el adaptador.
