# CI/CD y Git Flow — WorkRules

Documento de análisis y propuesta para evolucionar la estrategia de ramas, despliegues y entornos del proyecto tras cerrar el MVP.

> Estado: propuesta. Pendiente de aplicar.
> Fecha: 2026-06-19.

---

## 1. Punto de partida

- **Rama única productiva:** `main` despliega a Vercel (producción).
- **Ramas activas:** `feature/clean-arquitecture`, `feature/security`.
- **CI actual:**
  - `.github/workflows/playwright.yml` — e2e en push/PR a `main`.
  - `.github/workflows/security.yml` — auditoría de seguridad.
- **Hosting:** Vercel con `vercel.json` que sirve la app Vite + Storybook + `presentacion-TFM` bajo subrutas.
- **Backend:** un único proyecto Supabase (Edge Functions + DB).

---

## 2. Objetivos

1. Congelar una **versión TFM** desplegable e inmutable (rama `feature/TFM`).
2. Adoptar **Git Flow** ligero: `feature/*` → `develop` (opcional) → `release/*` → `main` + `tag`.
3. CI/CD que dispare despliegue de producción **al pushear un tag** `vX.Y.Z`.
4. Aprovechar **Vercel Preview Deployments** para validar features y PRs sin coste de entorno extra.
5. **Descartar entorno de pre dedicado** (por coste y tiempo). Los previews de Vercel cubren la validación visual/funcional del frontend.

---

## 3. ¿Sirve Vercel Preview para el TFM? Sí

Vercel genera automáticamente un deployment por:

- Cada **push a cualquier rama** distinta de `main` → URL preview persistente del tipo `workrules-git-feature-tfm-<org>.vercel.app`.
- Cada **PR** → URL preview que se comenta en el PR.
- Cada **commit** → URL inmutable por commit (perfecta para citar en la memoria del TFM).

**Estrategia para el TFM:**

1. Crear rama `feature/TFM` desde el `main` actual (estado del MVP entregado).
2. Push a `origin/feature/TFM` → Vercel genera preview estable.
3. Esa URL se puede compartir con el tribunal y queda fijada al último commit de la rama.
4. Si se quiere blindar aún más, taguear el commit: `git tag v-tfm-final && git push origin v-tfm-final` — el deployment por commit en Vercel es inmutable y queda asociado al SHA.

> ⚠️ Limitación importante: el **backend Supabase es compartido**. Los previews apuntan al mismo proyecto Supabase que producción. Si modificas migraciones o Edge Functions en `feature/TFM`, afectarás a prod. Para el TFM esto no es problema porque la rama queda congelada, pero conviene **no mergear `feature/TFM` a `main`** salvo para mantenimiento puntual.

---

## 4. Modelo Git Flow propuesto

Adaptado y simplificado para un equipo pequeño y un único entorno backend.

```
                   ┌────────────────────────┐
   feature/*  ──►  │       develop          │  ──►  release/x.y.z  ──►  main  ──►  tag vX.Y.Z
                   │  (integración continua) │                            │
                   └────────────────────────┘                            └─► deploy prod
                            ▲
                   hotfix/* ┘  (desde main, vuelve a main + develop)
```

### Ramas

| Rama | Origen | Destino | Vida | Despliegue |
|------|--------|---------|------|------------|
| `main` | — | — | permanente | **Producción** (al pushear tag `vX.Y.Z`) |
| `develop` | `main` | `release/*` | permanente | Vercel preview |
| `feature/*` | `develop` | `develop` (vía PR) | corta | Vercel preview por PR |
| `release/x.y.z` | `develop` | `main` + `develop` | corta | Vercel preview (QA final) |
| `hotfix/x.y.z` | `main` | `main` + `develop` | corta | Vercel preview + tag urgente |
| `feature/TFM` | `main` (MVP) | — (congelada) | permanente | Vercel preview fijo |

### Convención de tags

- Semver: `v1.0.0`, `v1.1.0`, `v1.1.1`.
- El tag es la **única vía de despliegue a producción**. Quitamos el auto-deploy de `main` en Vercel.
- Tag `v-tfm-final` para la entrega académica (sin numeración semver para distinguirlo).

### Flujo de una release típica

```bash
# 1. Trabajo en feature
git checkout develop && git pull
git checkout -b feature/login-sso
# ...commits...
git push -u origin feature/login-sso
# → abrir PR a develop. Vercel genera preview. CI corre tests.

# 2. Preparar release
git checkout develop && git pull
git checkout -b release/1.2.0
# bumps de versión, changelog, fixes de QA
git push -u origin release/1.2.0
# → PR a main. Vercel preview = candidato de producción.

# 3. Cerrar release
git checkout main && git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release 1.2.0"
git push origin main --follow-tags
# → workflow de release se dispara con el tag y despliega a prod.

git checkout develop && git merge --no-ff release/1.2.0
git push origin develop
git branch -d release/1.2.0
```

---

## 5. CI/CD propuesto

### 5.1 Cambios en Vercel

1. **Desactivar Production Branch automática** en `main`. Settings → Git → Production Branch → vaciar o cambiar a rama que no exista.
2. Mantener **Preview Deployments** habilitados para todas las ramas.
3. El despliegue a producción se hará vía **Vercel CLI desde GitHub Actions**, disparado por tag.

### 5.2 Workflow nuevo: `release.yml`

Disparado solo por tags `v*`.

```yaml
name: Release to Production
on:
  push:
    tags:
      - 'v*'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - name: Deploy to Vercel (prod)
        run: npx vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

**Secrets necesarios en GitHub:**
- `VERCEL_TOKEN` — token de Vercel con permiso de deploy.
- `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` — visibles en `.vercel/project.json` tras `vercel link`.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — ya existentes.

### 5.3 Ajuste a `playwright.yml`

Ampliar triggers para que CI valide también `develop` y `release/*`:

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### 5.4 Edge Functions de Supabase

Las Edge Functions **no se despliegan con la app de Vercel**. Opciones:

- **Manual** (lo que se hace ahora): `supabase functions deploy chat` cuando toque.
- **Automatizar en el tag** añadiendo un paso al `release.yml`:
  ```yaml
  - uses: supabase/setup-cli@v1
  - run: supabase functions deploy chat --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  ```

> Recomendación: empezar manual hasta que el flujo de tags esté rodado, automatizar después.

---

## 6. Plan de migración

### Fase A — Congelar TFM (hoy)
1. `git checkout main && git pull`
2. `git checkout -b feature/TFM`
3. `git push -u origin feature/TFM`
4. Esperar preview de Vercel y anotar la URL en la memoria del TFM.
5. (Opcional) `git tag v-tfm-final && git push origin v-tfm-final`.

### Fase B — Preparar Git Flow
1. Crear rama `develop` desde `main`: `git checkout -b develop && git push -u origin develop`.
2. Cambiar Default Branch en GitHub a `develop` (PRs por defecto van ahí).
3. Proteger `main` y `develop` con branch protection (PR obligatorio, CI verde).

### Fase C — Cablear el CI/CD
1. Generar `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` y añadir como secrets.
2. **Desactivar deploy de prod automático en Vercel** (paso crítico: si no, `main` seguirá desplegando a prod sin tag).
3. Añadir `.github/workflows/release.yml`.
4. Actualizar triggers de `playwright.yml` para incluir `develop`.
5. Probar con un tag de prueba `v0.0.1-rc1` desde una rama efímera.

### Fase D — Primer ciclo real
1. Una feature pequeña → `develop` → `release/1.0.0` → `main` → `tag v1.0.0`.
2. Validar que Vercel previewa cada paso y que el tag dispara prod.

---

## 7. Riesgos y decisiones abiertas

| Riesgo | Mitigación |
|--------|------------|
| Backend Supabase compartido entre previews y prod | No mergear cambios de schema/funciones hasta release; usar feature flags si hace falta. |
| Olvidar desactivar el auto-deploy de `main` en Vercel | Verificación manual tras la Fase C; si `main` despliega solo, los tags pierden sentido. |
| Tags creados desde ramas equivocadas | Convención: tags solo desde `main` tras merge de `release/*`. |
| Hotfix urgente sin pasar por `develop` | Documentado: rama `hotfix/*` desde `main`, merge a `main` + `develop`. |
| Edge Functions desincronizadas con el tag | Automatizar deploy de funciones en `release.yml` cuando el flujo madure. |

---

## 8. Decisiones tomadas en esta iteración

- ✅ **Sin entorno de pre dedicado** — descartado por coste y tiempo. Los previews efímeros de Vercel cubren validación.
- ✅ **TFM como rama larga** `feature/TFM` con preview de Vercel como entregable.
- ✅ **Producción solo por tag**, no por push a `main`.
- ⏸ **Despliegue automático de Edge Functions** — pendiente; manual por ahora.
- ⏸ **`develop` como default branch** — pendiente de aplicar en Fase B.
