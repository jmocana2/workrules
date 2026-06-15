# Sync workflows n8n: local -> prod

Los workflows se editan en la instancia **local** y se versionan en `n8n/*.json`. Para llevarlos a **prod** sin perder credenciales (los IDs difieren entre instancias), se usa un script de "build" que reescribe los IDs segun `credential-map.json`.

## Uso

```bash
# Genera n8n/dist/Workrules-Indexer-PROD.json listo para importar en prod
node n8n/build-prod.mjs

# Otros workflows
node n8n/build-prod.mjs --input n8n/Workrules-Errors.json --output n8n/dist/Workrules-Errors-PROD.json

# Direccion inversa (si haces cambios directamente en prod y los quieres en local)
node n8n/build-prod.mjs --direction prod-to-local --input ruta/al/export-de-prod.json
```

Importa el JSON resultante en n8n prod via UI: `Workflows -> Import from File`. Sobrescribe el existente.

## Archivos

- `credential-map.json` — mapa de IDs local <-> prod. Tiene `defaults` por tipo de credencial y `overrides` por nombre de nodo (ej. `HTTP Supabase storage PDF` usa una credencial Supabase distinta del resto en prod).
- `build-prod.mjs` — script de reescritura.
- `dist/` — salidas del script (gitignored).

## Cuando actualizar `credential-map.json`

- Creas/rotas/borras una credencial en cualquiera de las dos instancias.
- Añades un nodo nuevo que usa un tipo de credencial todavia no mapeado (el script avisa con `! tipo X sin entrada en credential-map.json`).
- Un nodo necesita una credencial distinta de la default de su tipo -> añadir en `overrides`.

## Como obtener los IDs

En la UI de n8n: `Settings -> Credentials -> click en la credencial -> el ID aparece en la URL` (`/credentials/<ID>`).
