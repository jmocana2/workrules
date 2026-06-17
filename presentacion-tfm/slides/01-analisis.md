# ¿Qué es WorkRules?

<div class="grid grid-cols-2 gap-8 mt-8">
<div>

**Propuesta de valor**

Consultor laboral con IA que **interpreta y calcula** condiciones de convenios colectivos a partir de las variables específicas de cada caso (categoría, antigüedad, horas, complementos), ofreciendo **información y cálculos salariales fiables con referencias directas al convenio aplicable**.

</div>
<div>

**Diferenciador**

- **Zero Hallucinations** — RAG sobre el PDF oficial con cita directa a la página y artículo del BOE en cada respuesta, garantizando trazabilidad legal.
- **Perfil JSON estructurado** — la estructura del convenio se extrae con Claude y sirve como base determinista para cálculos reproducibles (categoría, antigüedad, complementos, horas).
- **Interfaz conversacional cuidada** — UI/UX optimizada para consultas legales: citas inline, historial, exportación PDF y feedback visual del proceso de razonamiento.

</div>
</div>

<!--
WorkRules es un consultor laboral automatizado. La frase corta: "la inteligencia que traduce el BOE en respuestas exactas".
Hay dos diferenciadores clave. Primero: cada respuesta cita el PDF oficial del convenio, con número de página. Esto elimina alucinaciones porque la fuente es verificable. Segundo: extraemos el convenio a un Perfil JSON estructurado, que sirve de base para cálculos deterministas. La IA decide qué calcular y con qué variables, pero la aritmética final la hace código, no el modelo.
Si me preguntan: ¿por qué no usar ChatGPT directamente? La respuesta está en la siguiente slide.
-->

---

# ¿Cómo surge WorkRules?

<div class="grid grid-cols-5 gap-8 mt-2 items-center">
<div class="col-span-2">
  <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80" class="rounded-2xl shadow-2xl w-full h-[48vh] object-cover" alt="Profesional de RRHH en ETT" />
</div>
<div class="col-span-3 text-xs text-white/90 leading-snug">

**Origen del proyecto**

Necesidad real detectada en el sector de las **Empresas de Trabajo Temporal (ETT)**. Los equipos de RRHH dedican gran parte de su jornada a calcular salarios y condiciones aplicables a cada contratación, consultando manualmente los convenios colectivos del BOE.

<div class="mt-3">

**El problema observado**

Al recurrir a IAs generalistas, los profesionales encontraron tres limitaciones críticas: **respuestas inconsistentes**, **ausencia de trazabilidad** a la fuente oficial y **errores aritméticos** inadmisibles en un contexto donde una desviación de pocos euros en una nómina tiene implicaciones legales.

</div>

<div class="mt-3">

**La propuesta**

WorkRules combina el **razonamiento de la IA** sobre el texto legal con **cálculos deterministas** ejecutados por código, garantizando en cada respuesta una **cita directa al artículo y página del convenio oficial**.

</div>

</div>
</div>

<!--
Quería empezar contando de dónde sale realmente este proyecto, porque no nació de una idea académica abstracta.
Mi hermana trabaja en una ETT del sector hostelería. Hace unos meses, en una conversación normal, me contó que estaba intentando calcular el salario de una camarera de pisos para un hotel de cuatro estrellas en Madrid usando ChatGPT y Gemini. Lo que me llamó la atención no fue que la IA fallara — eso me lo esperaba — sino dos cosas concretas:
Una: cada vez que preguntaba, le daba una cifra distinta. Sin saber cuál era la correcta, el dato es inservible.
Dos: ninguna respuesta venía con cita verificable. No le decía "según el artículo 14 del convenio de hostelería de Madrid de 2024". Sin trazabilidad, en el contexto laboral, el dato no se puede usar.
Y un detalle clave: ella me dijo "si me equivoco 20€ la liamos". En una nómina, los errores no son aceptables — tienen implicaciones legales y económicas reales.
Esa conversación me dejó pensando. Lo que parecía un caso anecdótico resulta que es el día a día de cualquier persona de RRHH o ETT. De ahí nació la propuesta de WorkRules: combinar razonamiento de IA (que sí sabe interpretar lenguaje legal) con cálculo determinista (que sí da números exactos) y obligar al sistema a citar siempre el PDF oficial del convenio.
Después validé el problema más allá del círculo familiar con BDL Eurofilms, una ETT real, que es nuestro stakeholder principal — y la cita que veréis en la siguiente slide es suya.
-->

---

# El problema

<div class="grid grid-cols-2 gap-6 mt-4">
<div>

**Un marco normativo difícil de consultar**

- Más de **5.000 convenios** colectivos activos en España (sectoriales, provinciales y de empresa), con ámbitos de aplicación solapados.
- Tablas salariales publicadas en **PDFs no indexados**, con celdas combinadas, notas al pie y anexos.
- **Revisiones intermedias** por IPC, SMI o acuerdos paritarios que invalidan versiones anteriores.
- Determinar el convenio aplicable a un caso concreto requiere **conocimiento experto** y consulta cruzada de varias fuentes oficiales.

</div>
<div>

**Por qué las IAs generalistas no resuelven el problema**

- **Información desactualizada** — su conocimiento tiene fecha de corte y desconoce publicaciones recientes del BOE.
- **Interpretación imprecisa del texto legal** — pasan por alto cláusulas condicionales (*"salvo que…"*, *"excepto para…"*) que cambian el resultado.
- **Sin trazabilidad** — responden sin citar el artículo ni la página del convenio, impidiendo verificar el dato.
- **Lectura limitada de PDFs** — fallan ante convenios escaneados, con formatos inconsistentes, celdas combinadas o tablas multipágina.

</div>
</div>

<div class="mt-6 p-4 border-l-4 border-primary bg-primary/10 text-sm italic">
"Lo que la IA no te da a día de hoy es analizar el convenio de verdad. Poder decirle: tengo que contratar camareras de piso para un hotel de 4 estrellas, ¿cuánto tengo que pagar exactamente?"
<br /><span class="opacity-70 not-italic">— Directora de ETT, validación de problema</span>
</div>

<!--
El problema no es que los convenios no existan en internet, sino que están en PDFs complejos y las IAs generalistas no son fiables para usarlos.
Tres fallos concretos: corte de conocimiento (las IAs no saben qué se publicó ayer en el BOE), ambigüedad legal (los convenios tienen cláusulas condicionales que se saltan), y el más crítico — cálculo aritmético. Las IAs son modelos de lenguaje, no calculadoras. En una nómina un error de 1 céntimo es un problema legal.
La cita de abajo viene de una directora de una ETT real, BDL Eurofilms, que es nuestro stakeholder principal. Validamos el problema con ella antes de empezar.
-->

---

# Análisis

<div class="grid grid-cols-5 gap-6 mt-2 items-start">
<div class="col-span-3 text-[11px] text-white/90 leading-tight">

**Stakeholders**

- **Trabajadores** — consulta de su propio convenio.
- **RRHH y ETTs** — cálculo de costes para contrataciones.
- **Asesorías laborales** — verificación rápida.

**KPIs del producto**

- Precisión salarial: error 0 € frente al PDF oficial.
- Cita verificable en cada respuesta.
- Latencia < 3 s para consultas estándar.
- Core Web Vitals 60+ de rendimiento (PageSpeed).

**Restricciones**

- Presupuesto operativo ~100 €/mes.
- Solo-dev — automatización máxima (n8n, Vercel, GH Actions).
- Sin asesoría legal vinculante (disclaimer obligatorio).

</div>
<div class="col-span-2">
  <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80" class="rounded-2xl shadow-2xl w-full h-[45vh] object-cover" alt="Análisis y planificación de producto" />
</div>
</div>

<!--
Análisis del problema desde el lado del usuario y del negocio.
Stakeholders: el usuario final puede ser un trabajador consultando su propio convenio, pero el caso de uso comercial más claro es RRHH y ETTs que necesitan calcular costes de personal. El stakeholder validado es BDL Eurofilms.
KPIs: el más estricto es la precisión salarial — error 0€ contra el PDF oficial. Esto se mide manualmente con el convenio de Hostelería de Madrid, que es el que tenemos validado al 100% (TFM.1).
Las restricciones marcan mucho la arquitectura. Solo soy yo desarrollando, así que automatización máxima (n8n, Vercel, GitHub Actions). Y el presupuesto es ~100€/mes, lo que descarta cualquier cosa que tenga coste fijo elevado — de ahí serverless + cache semántico.
El proyecto NO incluye cálculo de nóminas reales (con IRPF y Seguridad Social) ni asesoría jurídica vinculante. Hay disclaimer legal en footer, en primera respuesta del chat y en exportaciones PDF.
-->
