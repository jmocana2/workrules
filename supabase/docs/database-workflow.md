# Flujo de trabajo con la base de datos (local ↔ remoto)

Esta guía explica cómo trabajar con la base de datos de WorkRules manteniendo sincronizados el entorno local (Supabase CLI) y el remoto (proyecto en supabase.com) mediante **migraciones versionadas**.

---

## La idea en una frase

> Las **migraciones** son a la base de datos lo que **git commits** son al código: cada cambio es un archivo SQL incremental, versionado, ordenado por timestamp y aplicado en orden tanto en local como en remoto.

Nunca edites el schema directamente en Supabase Dashboard como flujo habitual. Toda evolución pasa por una migración commiteada al repo.

---

## Mapa mental: paralelismos con git

| Git                                | Supabase                                                | Qué hace                          |
|------------------------------------|---------------------------------------------------------|-----------------------------------|
| `git commit`                       | `supabase migration new <nombre>` + `supabase db diff`  | Capturar un cambio incremental    |
| `git log`                          | `ls supabase/migrations/`                               | Ver historial de cambios          |
| `git push`                         | `supabase db push`                                      | Llevar cambios al remoto          |
| `git pull`                         | `supabase db pull`                                      | Traer cambios del remoto al local |
| `git reset --hard`                 | `supabase db reset`                                     | Reconstruir desde cero            |
| Trabajar contra `main` en producción | Tocar el SQL Editor del remoto directamente            | NO hacer salvo emergencia         |

---

## Estructura de carpetas relevante

```
supabase/
  config.toml              # Configuración del proyecto local
  migrations/              # ← Fuente de verdad del schema
    20260528215509_initial_schema.sql
    20260528221628_fix_grants_and_visibility_policy.sql
    ...
  snippets/                # Snippets manuales (debug, utilidades)
  docs/
    database-workflow.md   # Este archivo

database/
  schema.sql               # Documentación de referencia. NO es la fuente de verdad.
```

---

## Flujo diario: cambio típico en el schema

Imagina que quieres añadir una columna `telefono` a `user_profiles`.

### 1. Aplicar el cambio en local con Studio

Abre `http://127.0.0.1:54323` → Table Editor → `user_profiles` → añade la columna desde la UI (o ejecuta el ALTER en SQL Editor de Studio local). Pruébalo hasta que funcione.

### 2. Generar la migración a partir del diff

```bash
supabase db diff -f add_telefono_a_user_profiles
```

Esto **compara** el estado actual de tu DB local con lo que dicen las migraciones existentes, y genera automáticamente el archivo:

```
supabase/migrations/<timestamp>_add_telefono_a_user_profiles.sql
```

con el `ALTER TABLE ... ADD COLUMN ...` necesario.

### 3. Revisar el SQL generado

Ábrelo y verifica que solo contiene lo que esperabas. `db diff` a veces incluye cambios no intencionados — bórralos si no aplican.

### 4. Verificar que aplica limpio desde cero

```bash
supabase db reset
```

Esto recrea la DB local aplicando todas las migraciones en orden. Si la nueva migración rompe algo, lo verás aquí antes de tocar remoto.

> ⚠️ **`db reset` borra TODOS los datos locales.** No toca el remoto, pero tu DB local queda vacía (y se repuebla con `supabase/seed.sql` si existe).
>
> **Alternativa no destructiva**: si tienes datos locales que no quieres perder, usa `supabase migration up` en su lugar. Aplica solo las migraciones pendientes contra la DB actual, manteniendo los datos. Es lo más parecido a `git pull` para schema.
>
> **Trade-off**: `migration up` es seguro pero no detecta problemas que solo aparecen al aplicar todo desde cero (orden de dependencias, drift acumulado). `db reset` es la verificación más sólida. Recomendado: mantén un `supabase/seed.sql` con datos de prueba para poder hacer `db reset` sin miedo — se repueblan automáticamente.

### 5. Commit al repo

```bash
git add supabase/migrations/<timestamp>_add_telefono_a_user_profiles.sql
git commit -m "db: add telefono column to user_profiles"
```

### 6. Aplicar en remoto

```powershell
$env:SUPABASE_DB_PASSWORD="<password-de-la-db-remota>"
supabase db push
```

La CLI detecta qué migraciones del repo aún no están en remoto y las aplica en orden. Las ya aplicadas las salta.

---

## Comandos esenciales

### Setup inicial (solo una vez)

```bash
# Linkar el repo con el proyecto remoto
supabase link --project-ref kvebuijpjwlgrnfwfdgk

# Levantar Supabase local
supabase start
```

### Día a día

```bash
supabase status              # Ver estado y URLs/keys locales
supabase db reset            # ⚠️ Reconstruir local desde cero (BORRA DATOS locales)
supabase migration up        # Aplicar solo migraciones pendientes en local (sin borrar datos)
supabase migration new NOMBRE   # Crear archivo de migración vacío
supabase db diff -f NOMBRE   # Crear migración a partir del diff con la DB local
supabase db push             # Aplicar migraciones pendientes al remoto (no borra datos*)
supabase db pull             # Bajar al local cambios hechos en remoto (raro)
supabase migration list      # Ver qué migraciones hay y cuáles están aplicadas
```

> \* `db push` no borra datos por sí mismo, **pero sí ejecuta el SQL de tus migraciones**. Si una migración contiene `DROP COLUMN`, `DROP TABLE` o `TRUNCATE`, esos datos sí se irán en remoto. Por eso la regla 6 de Reglas de Oro: revisa siempre el SQL antes de pushear, especialmente en producción.

### Cuando `db push` pide password

La password no es la `anon key`. Es la **database password** del proyecto, definida al crear el proyecto en Supabase. Si la perdiste:

> Dashboard → Settings → Database → Reset database password

Para que la CLI la coja sin preguntar:

```powershell
$env:SUPABASE_DB_PASSWORD="..."
```

(O pásala con `--password "..."` directamente al comando.)

---

## Reglas de oro

1. **Una migración = un cambio atómico.** Mejor 3 migraciones pequeñas que una grande con 5 cosas.
2. **Las migraciones son inmutables.** Una vez commiteada y pusheada, no se edita. Si te equivocas, creas otra que corrija.
3. **Nunca borres migraciones antiguas.** Aunque parezcan obsoletas, son el historial.
4. **Nunca hagas cambios manuales en el remoto** (salvo emergencias). Si lo haces, captúralos después con `supabase db pull` para que no se pierdan.
5. **`database/schema.sql` es solo documentación de referencia.** No es lo que se aplica. Si lo mantienes, recuerda que es trabajo extra.
6. **RLS y GRANTs forman parte del schema.** No olvides incluirlos en las migraciones — los GRANTs por defecto se pierden si recreas el schema `public`.
7. **Cuidado con `db reset` cuando tengas datos de valor en local.** Es destructivo en local (no en remoto). Para entornos con datos importantes, usa `supabase migration up` o mantén un `seed.sql` que repueble lo crítico.

---

## Recuperación: situaciones de pánico

### "El remoto se desincronizó del local y no sé qué tiene"

```bash
supabase db pull
```

Genera una migración con el estado real del remoto. Compárala con las que ya tenías para entender el drift.

### "Tengo datos basura en local y quiero empezar limpio"

```bash
supabase db reset
```

Recrea local desde las migraciones (los datos en local se pierden). Para volver a poblar, ejecuta tus seeds o re-indexa.

### "Tengo datos basura en remoto en entorno de pruebas"

Borrar **datos** (no schema) desde SQL Editor remoto:

```sql
-- Solo en pruebas. Nunca en producción real.
TRUNCATE TABLE convenio_chunks, convenio_perfiles, convenio_versiones,
               chat_messages, chat_sessions, semantic_cache, convenios CASCADE;
```

### "Necesito reset total del remoto (solo en pruebas)"

```sql
-- ⚠️ Destruye todo el schema public en remoto. No hacer en producción.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, public;
```

Después:

```bash
supabase db push
```

vuelve a aplicar todas las migraciones desde cero. Recuerda borrar también los usuarios desde Authentication si quieres limpieza total.

### "El frontend devuelve 42703 (undefined column)"

El schema del remoto no tiene esa columna → falta aplicar alguna migración → `supabase db push`.

### "El frontend devuelve 42501 (permission denied)"

Falta GRANT al rol `anon`/`authenticated`, o la política RLS está mal definida. Comprobar con:

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = '<tabla>';
```

---

## Variables de entorno relacionadas

### Frontend (Vite — se inyectan al bundle en build time)

Deben llamarse con prefijo `VITE_` y configurarse tanto en `.env.local` como en Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Cambiar estas variables en Vercel **requiere redeploy** para que el bundle las recoja.

### Backend / scripts Node (sin prefijo)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` ← **nunca exponer al cliente**
- `SUPABASE_DB_PASSWORD` ← para `supabase db push`

---

## Checklist antes de un push a remoto

- [ ] La migración tiene un nombre descriptivo (`add_x`, `fix_y`, `drop_z`).
- [ ] `supabase db reset` en local pasa sin errores.
- [ ] He revisado el SQL generado y no contiene cambios no intencionados.
- [ ] La migración está commiteada en git.
- [ ] Si afecta a producción, hay backup reciente o he avisado al equipo.

---

## Recursos

- [Supabase CLI docs](https://supabase.com/docs/guides/cli)
- [Local development](https://supabase.com/docs/guides/cli/local-development)
- [Managing migrations](https://supabase.com/docs/guides/deployment/database-migrations)
