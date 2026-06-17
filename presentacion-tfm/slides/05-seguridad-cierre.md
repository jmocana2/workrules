# Seguridad

<div class="grid grid-cols-2 gap-6 mt-4 text-sm">
<div>

**Defensa en profundidad**

- **Auth JWT** en cada Edge Function (`extractUserIdFromRequest` → 401).
- **RLS Supabase** en tablas con datos de usuario (chats, perfiles, PDFs privados).
- **CORS** restringido por dominio en producción.
- **Rate limiting** en `/chat` y `/upload-convenio` (token bucket por user-id).
- **Sanitización** de inputs antes de prompts a LLM (anti prompt-injection básico).

</div>
<div>

**Headers y dependencias**

- **CSP / HSTS / X-Frame-Options** vía `vercel.json`.
- **Snyk** + **Dependabot** semanal en CI.
- **`pnpm audit`** trackeado por release.
- **Secretos:** sólo en `.env.local` (gitignore) y Vercel/Supabase env vars. No hay claves hardcoded — verificado por grep en `docs/seguridad.md`.

<div class="text-xs opacity-70 mt-3">
0 vulnerabilidades High en runtime de producción. Las restantes están en cadenas de Storybook / build tooling y se documentan.
</div>

</div>
</div>

<!--
Seguridad en cinco capas. Empiezo por las más cercanas al dato.
JWT obligatorio en cada Edge Function. Si el token no es válido, 401 inmediato sin tocar lógica.
RLS en la base de datos. Aunque alguien encontrase forma de saltarse la Edge Function y consultar la DB directamente, las policies impiden ver datos de otro usuario. Esto es lo que llamo defensa en profundidad: si una capa falla, la siguiente protege.
CORS restringido al dominio de producción y a localhost en desarrollo. En la auditoría detectamos que estaba en wildcard y se cambió a allowlist por entorno.
Rate limiting con token bucket por user ID — alguien no puede gastar mi cuota de Claude haciéndome miles de peticiones.
Sanitización básica de inputs antes de pasarlos a Claude. No es una protección total contra prompt injection (no existe), pero filtramos los intentos triviales.
Headers de seguridad: CSP, HSTS, X-Frame-Options. Verificable en securityheaders.com.
Análisis de dependencias automatizado. Snyk y Dependabot abren PRs semanales con actualizaciones. pnpm audit trackeado por release.
Sobre secretos: ningún API key hardcoded en el repo. Auditado por grep de patrones (sk-ant-, sk-proj-, JWT) en docs/seguridad.md. Cero falsos positivos reales — las coincidencias son JWT demo público de Supabase local, seguro para documentación.
Cero vulnerabilidades High en runtime de producción. Las que aparecen en pnpm audit están en cadenas de Storybook y build tooling, documentadas.
-->

---

# Observabilidad

<div class="grid grid-cols-5 gap-6 mt-2 items-start">
<div class="col-span-3 text-[11px] text-white/90 leading-tight">

**Sentry — errores y rendimiento**

- Errores capturados en frontend y Edge Functions.
- **Source maps** subidos en cada deploy → traza en código original.
- Release tracking por commit SHA.
- Performance trace en consultas críticas.

**Infraestructura**

- Dashboard nativo de **Supabase** (DB + Edge Functions).
- Logs y métricas de **Vercel** para frontend y CDN.
- **Vercel Analytics (Hobby)** para métricas de uso del frontend (visitas, Core Web Vitals reales).

</div>
<div class="col-span-2">
  <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80" class="rounded-2xl shadow-2xl w-full h-[45vh] object-cover" alt="Dashboard de métricas y observabilidad" />
</div>
</div>

<!--
Observabilidad en tres dimensiones.
Sentry para errores. Cubre frontend y Edge Functions. Subimos source maps en cada deploy desde GitHub Actions, lo que significa que cuando salta un error en producción veo la traza en mi código original — no en el bundle minificado de 500KB. Esto reduce el tiempo de diagnóstico de horas a minutos. Release tracking por SHA de commit: cada error se vincula a la versión que lo causó. Y trazas de performance en los endpoints críticos (/chat) para detectar regresiones de latencia.
Plausible Analytics para uso. La decisión de elegir Plausible vs Google Analytics es deliberada: Plausible no usa cookies, no rastrea individualmente, y cumple RGPD por diseño. No necesito mostrar banner de cookies, lo que mejora la experiencia y elimina riesgo legal. La trade-off es que tengo menos detalle que GA, pero para las métricas que me importan (qué convenios consulta la gente, cuántos llegan al cálculo, latencia percibida) sobra.
Para infraestructura uso los dashboards nativos: Supabase para DB y Edge Functions, Vercel para frontend y CDN.
-->

---

# CI/CD

<div class="grid grid-cols-5 gap-6 mt-2 items-start">
<div class="col-span-3 text-[11px] text-white/90 leading-tight">

**GitHub Actions**

| Pipeline | Trigger | Pasos |
|---|---|---|
| `playwright.yml` | PR / main | E2E con caché de browsers |
| `security.yml` | semanal | Snyk + `pnpm audit` |

**Despliegue continuo (Vercel + Supabase)**

- **Vercel** despliega el frontend automáticamente en cada push (preview por PR, producción al hacer merge a `main`).
- **Supabase CLI** despliega Edge Functions y migraciones desde local con `supabase functions deploy`.
- **Source maps** subidos a Sentry tras cada deploy de frontend.

</div>
<div class="col-span-2">
  <img src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80" class="rounded-2xl shadow-2xl w-full h-[45vh] object-cover" alt="Automatización de procesos" />
</div>
</div>

<!--
CI/CD montado sobre GitHub Actions.
Cuatro pipelines.
ci.yml: corre en cada pull request — lint, typecheck, unit tests. Es el más rápido, da feedback en menos de 2 minutos.
playwright.yml: tests E2E con caché de browsers para no descargar Chromium en cada run. Mejoramos el caching recientemente en TFM.7 porque el install estaba tardando 5 minutos en GitHub Actions.
security.yml: corre semanalmente, ejecuta Snyk y pnpm audit, abre issue si encuentra algo nuevo.
deploy.yml: en merge a main hace build de frontend, despliega Edge Functions con supabase functions deploy, sube source maps a Sentry, y corre un smoke test que verifica que la home carga y /chat responde.
El flujo del PR: push genera preview deploy automático en Vercel con URL única — esto es oro para validar visualmente cambios sin afectar producción. Reviewer (en mi caso, yo mismo en frío después de unas horas) + checks verdes → merge → producción.
-->

---

# Documentación

<div class="grid grid-cols-5 gap-6 mt-2 items-start">
<div class="col-span-3 text-[11px] text-white/90 leading-tight">

**Repositorio**

- `README.md` raíz orientado al director del TFM.
- `docs/` — brief, arquitectura, flujo, seguridad, tests, ADRs.
- `CHANGELOG.md` mantenido por release (último: TFM.7).

**Storybook — documentación viva del Design System**

- Tokens, tipografías y paleta del Design System.
- Componentes propios documentados con stories.
- Desplegado en producción: [workrules.eu/storybook](https://workrules.eu/storybook).

**Notion — planificación y gestión**

- KPIs, notas de iteración y planificación de fases.
- Acceso: [app.notion.com/p/workrules-eu](https://app.notion.com/p/workrules-eu-2e1bed77604180129884ec2fb7938f48?pvs=12).

</div>
<div class="col-span-2">
  <img src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80" class="rounded-2xl shadow-2xl w-full h-[45vh] object-cover" alt="Documentación y conocimiento" />
</div>
</div>

<!--
Documentación distribuida en tres lugares.
Repo: README orientado al director del TFM con propuesta de valor, cómo probar en producción y cómo instalar local. La carpeta docs/ contiene la documentación técnica profunda: brief, arquitectura front y back, flujo de aplicación, ciclo de vida, seguridad, tests, ADRs (Architecture Decision Records). CHANGELOG por release.
Storybook: documenta el Design System (paleta de colores derivada de tokens, tipografías, espaciados) y los componentes propios con sus stories. Está desplegado bajo subpath en workrules.eu/storybook para que sea públicamente consultable.
Workspace: Notion con planificación y notas que no son código. Y .claude/ con el guion del proyecto y el paso a paso de cada fase del TFM, que es la trazabilidad de qué se hizo y por qué.
El principio rector: docs/ es la fuente de la verdad. Las slides y este README resumen y enlazan, no duplican. Si actualizo el flujo de aplicación, solo lo toco en un sitio.
-->

---

# Pruébalo tú mismo

<div class="grid grid-cols-5 gap-6 mt-2 items-start">
<div class="col-span-3 text-[11px] text-white/90 leading-tight">

**Flujos sugeridos para explorar el producto**

1. **Sube un convenio** (público o privado) — el indexer procesa el PDF y queda disponible en el selector. *Opcional: puedes usar el convenio de **Hostelería Madrid** ya indexado o subir uno propio.*
2. Selecciona el convenio cargado y lanza una pregunta general: la respuesta cita el artículo y enlaza al PDF oficial.
3. Abre el **panel de variables** para revisar y editar los datos que la IA usará (categoría, antigüedad, complementos).
4. Activa el **switch de cálculo salarial** y pide un cálculo con datos completos.
5. Repite con datos incompletos: aparece la **`DataRequestCard`** pidiendo las variables **identificadoras** (categoría, puesto, nivel, zona o tipo de establecimiento). Las moduladoras (jornada, antigüedad, complementos) son opcionales. Prueba además a meter horas extra por encima del límite legal — salta la **alerta de validación**.
6. Alterna **modo claro/oscuro** y prueba el layout responsive.

<div class="mt-2 text-[10px] opacity-70">
Cada pregunta y respuesta queda guardada en el <strong>historial de conversaciones</strong> accesible desde el sidebar.
</div>

**Enlaces**

- Producción: [workrules.eu](https://workrules.eu)
- Repositorio: [github.com/jmocana2/workrules](https://github.com/jmocana2/workrules)
- Storybook: [workrules.eu/storybook](https://workrules.eu/storybook)
- Esta presentación: [workrules.eu/presentacion-TFM](https://workrules.eu/presentacion-TFM)

</div>
<div class="col-span-2">
  <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80" class="rounded-2xl shadow-2xl w-full h-[45vh] object-cover" alt="Explora el producto en producción" />
</div>
</div>

<!--
Aquí es donde abro el navegador y muestro la app en producción. Los seis flujos cubren lo esencial.
Uno: selecciono Hostelería Madrid en el ConvenioSelector.
Dos: pregunta general — "¿cuál es la jornada máxima del convenio?". Respuesta de Claude streaming con cita a la página del PDF que abre directamente en el artículo.
Tres: cálculo salarial completo — "calcula el salario de un recepcionista de hotel 4 estrellas con 5 años de antigüedad". El sistema identifica la categoría, busca en el Perfil JSON, calcula y responde con el desglose.
Cuatro: ahora pregunto algo incompleto — "calcula el salario de un camarero". Como falta la categoría exacta y las horas, el sistema responde con DataRequestForm, un formulario con los campos que faltan generado a partir del Perfil JSON.
Cinco: pruebo a meter un valor ilegal — 100 horas extra al mes. AlertInvalidData salta porque el Estatuto de los Trabajadores limita a 80 al año.
Seis: tecla d alterna tema claro / oscuro. En móvil (emulador o real) el layout responsive se adapta.
Si por lo que sea la demo en vivo falla, hay un video grabado con los mismos flujos en workrules.eu/presentacion-TFM-video como respaldo.
-->

---

# Conclusiones

<div class="grid grid-cols-5 gap-6 mt-2 items-start">
<div class="col-span-3 text-[11px] text-white/90 leading-tight">

**Deuda técnica y mejoras pendientes**

- **Indexer** — migrar de **n8n self-hosted** a **LangChain** o integrarlo directamente en `src/` junto con el resto del front. n8n resulta tedioso para actualizar flujos, poco escalable y difícil de mantener a largo plazo.
- **Testing** — eliminar tests innecesarios y reforzar las pruebas **core** (clasificador, extractor de variables, validadores) para mejorar la fiabilidad de las respuestas.
- **Exactitud salarial** — ampliar batería de pruebas con más convenios validados manualmente contra PDF oficial.
- **Performance** — pasar de 60+ a 90+ en PageSpeed (bundle splitting, lazy load del AI SDK, optimización de imágenes).
- **Accesibilidad** — auditoría WCAG completa, navegación por teclado en todos los flujos, contraste en alerts y **resolución de los errores de accesibilidad detectados en Storybook**.

**Siguientes pasos**

- **Fase 4 · Alta, gestión de usuarios y monetización** — registro y onboarding, panel de cuenta, planes premium y pagos con Stripe.
- **Fase 5 · Scale** — Watchdog del BOE: detección automática de convenios nuevos o actualizados.
- **Fase 6 · Value** — features específicas para ETTs: **cálculo masivo de salarios** (varias contrataciones a la vez) y **exportación de resultados** a PDF/Excel para integrarlos en procesos internos.

</div>
<div class="col-span-2">
  <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80" class="rounded-2xl shadow-2xl w-full h-[45vh] object-cover" alt="Conclusiones y próximos pasos" />
</div>
</div>

<!--
Cierre con honestidad: deuda técnica conocida y siguientes pasos.
Deuda técnica. Cuatro frentes abiertos.
Indexer: actualmente vive en n8n self-hosted. Funciona, pero introduce dependencia operativa de un VPS y de mantener n8n actualizado. Quiero evaluar alternativas: una Edge Function dedicada (limitada por timeout de 150s), un worker con cola (Inngest, Trigger.dev), o serverless functions con timeout largo. La decisión dependerá del volumen de PDFs cuando entremos en Fase 5 con el Watchdog del BOE.
Exactitud salarial: hoy validado al 100% contra Hostelería Madrid. Necesito ampliar la batería de pruebas con un bajo volumen de convenios más (probablemente 3-5) verificados manualmente contra PDF oficial para detectar fallos de generalización del extractor de Perfil JSON.
Performance: PageSpeed actual 60+ en la métrica de rendimiento. Objetivo 90+. Áreas: bundle splitting (el Vercel AI SDK pesa), lazy load de componentes pesados (Mermaid, syntax highlight), optimización de imágenes y revisión de fuentes.
Accesibilidad: tengo navegación teclado básica y axe sin errores críticos, pero falta una auditoría WCAG completa. Especial atención a contraste en los Alerts (rojo/amarillo) y a anuncios ARIA en el streaming del chat.
Siguientes pasos post-TFM. Fase 4: pagos y planes premium (la subida privada de convenios ya está disponible para usuarios habilitados manualmente). Fase 5: BOE Watchdog, lo más ambicioso, detectar automáticamente cuando hay un convenio nuevo o actualizado y dispararlo por el pipeline sin intervención manual. Fase 6: features específicas para ETTs como cálculo bulk para procesos de selección masiva.
El MVP que se ve hoy cubre el caso de uso completo para Hostelería Madrid. Escalar horizontalmente a más convenios es procesar más PDFs por el mismo pipeline, sin cambios arquitectónicos.
-->

---
layout: center
class: text-center
---

# Gracias

<div class="mt-6 text-5xl">
🙏
</div>

<div class="mt-6 max-w-2xl mx-auto text-base opacity-90 leading-relaxed">

Disculpas sinceras por el retraso en la entrega del TFM.

Y, sobre todo, **gracias** al equipo docente de BIG School por la calidad de los contenidos y por la forma cercana de transmitirlos a lo largo del máster.

</div>

<div class="mt-10 opacity-80 text-sm">

[workrules.eu](https://www.workrules.eu) · [github.com/jmocana2/workrules](https://github.com/jmocana2/workrules)

</div>

<div class="mt-10 text-xs opacity-60">
José María Ocaña · TFM Máster en Desarrollo con IA · BIG School · 2025-2026
</div>

<!--
Cierre.
Antes de nada, querría disculparme sinceramente por el retraso en la entrega del TFM. Las circunstancias personales y profesionales hicieron difícil cumplir con los plazos originales, y soy consciente de que eso ha podido suponer una molestia para el tribunal y la organización.
Y aprovecho este momento para dar las gracias a todo el equipo docente del Máster en Desarrollo con IA de BIG School. La calidad de los contenidos y la forma cercana y práctica de transmitirlos durante todo el curso ha sido determinante para que este proyecto haya podido llegar a producción y no quedarse en una idea sobre el papel.
Repaso muy breve del proyecto: WorkRules resuelve un problema legal real — cálculos exactos sobre convenios colectivos — con una arquitectura serverless híbrida, RAG sobre PDF oficial y cálculo determinista. MVP en producción, documentación completa, testing en pirámide, observabilidad activa.
Quedo a disposición del tribunal para preguntas. Gracias.
-->
