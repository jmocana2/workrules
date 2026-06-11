# ¿Qué es WorkRules?

<div class="grid grid-cols-2 gap-8 mt-8">
<div>

**Propuesta de valor**

Consultor laboral con IA que **interpreta y calcula** condiciones de convenios colectivos a partir de las variables específicas de cada caso (categoría, antigüedad, horas, complementos).

</div>
<div>

**Diferenciador**

- **Zero Hallucinations** — RAG sobre el PDF oficial + cita directa a la página del BOE.
- **Perfil JSON** — estructura del convenio extraída por Claude, base para cálculos deterministas.
- **Cálculo aritmético exacto** — la IA razona, el código calcula.

</div>
</div>

<!--
WorkRules es un consultor laboral automatizado. La frase corta: "la inteligencia que traduce el BOE en respuestas exactas".
Hay dos diferenciadores clave. Primero: cada respuesta cita el PDF oficial del convenio, con número de página. Esto elimina alucinaciones porque la fuente es verificable. Segundo: extraemos el convenio a un Perfil JSON estructurado, que sirve de base para cálculos deterministas. La IA decide qué calcular y con qué variables, pero la aritmética final la hace código, no el modelo.
Si me preguntan: ¿por qué no usar ChatGPT directamente? La respuesta está en la siguiente slide.
-->

---

# ¿Cómo surge WorkRules?

<div class="grid grid-cols-5 gap-6 mt-4">
<div class="col-span-2 text-sm">

**El origen — una conversación familiar**

Mi hermana trabaja en una **ETT**. Un día me contó que necesitaba calcular el salario de una camarera de pisos para un hotel concreto y que las IAs generalistas que probaba **le daban una cifra distinta cada vez** — ninguna con cita al convenio aplicable.

<div class="mt-4 text-xs opacity-70">
Lo que parecía un caso aislado resultó ser un patrón. De ahí nació WorkRules: una IA que <strong>razona sobre el convenio oficial</strong> y <strong>calcula con código determinista</strong>.
</div>

</div>

<div class="col-span-3 bg-[#0b141a] rounded-lg p-3 border border-white/10 shadow-xl text-xs">

<div class="flex items-center gap-2 pb-2 mb-2 border-b border-white/10">
  <div class="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-black">S</div>
  <div>
    <div class="font-semibold">Mi hermana</div>
    <div class="opacity-50 text-[10px]">en línea</div>
  </div>
</div>

<div class="flex flex-col gap-2">

<div class="self-start bg-[#202c33] rounded-lg rounded-tl-none px-3 py-2 max-w-[80%]">
Oye, ¿tú sabes cuánto cobra una camarera de pisos en un hotel de 4 estrellas en Madrid? 🤔
</div>

<div class="self-end bg-primary/80 text-grey rounded-lg rounded-tr-none px-3 py-2 max-w-[80%]">
Ni idea, pero pregúntale a ChatGPT
</div>

<div class="self-start bg-[#202c33] rounded-lg rounded-tl-none px-3 py-2 max-w-[80%]">
Ya lo he hecho. Le pregunto tres veces y me da tres cifras distintas. Y ninguna me dice de dónde la saca 😤
</div>

<div class="self-start bg-[#202c33] rounded-lg rounded-tl-none px-3 py-2 max-w-[80%]">
Necesito el dato exacto del convenio, con su artículo. Si me equivoco 20€ en una nómina la liamos.
</div>

<div class="self-end bg-primary/80 text-grey rounded-lg rounded-tr-none px-3 py-2 max-w-[80%]">
Espera… eso no debería ser tan difícil 💡
</div>

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

**Los convenios colectivos en España son opacos**

- 5.000+ convenios activos (sectoriales, provinciales, de empresa).
- Tablas salariales en PDFs no indexados, con celdas combinadas y notas al pie.
- Revisiones a mitad de año por IPC o SMI.

</div>
<div>

**Las IAs comerciales fallan en tres dimensiones**

- **Corte de conocimiento** — no saben qué se publicó ayer en el BOE.
- **Ambigüedad legal** — ignoran cláusulas condicionales (*"salvo que..."*).
- **Cálculo aritmético** — son predictores de texto, no calculadoras. Un error de 1 céntimo en nómina es problema legal.

</div>
</div>

<div class="mt-6 p-4 border-l-4 border-primary bg-primary/10 text-sm italic">
"Lo que no hace nadie hoy es analizar el convenio. Decirle a la IA: tengo que contratar camareras de piso para tal hotel, ¿cuánto tengo que pagar?"
<br /><span class="opacity-70 not-italic">— Directora de ETT, validación de problema</span>
</div>

<!--
El problema no es que los convenios no existan en internet, sino que están en PDFs complejos y las IAs generalistas no son fiables para usarlos.
Tres fallos concretos: corte de conocimiento (las IAs no saben qué se publicó ayer en el BOE), ambigüedad legal (los convenios tienen cláusulas condicionales que se saltan), y el más crítico — cálculo aritmético. Las IAs son modelos de lenguaje, no calculadoras. En una nómina un error de 1 céntimo es un problema legal.
La cita de abajo viene de una directora de una ETT real, BDL Eurofilms, que es nuestro stakeholder principal. Validamos el problema con ella antes de empezar.
-->

---

# Análisis

<div class="grid grid-cols-2 gap-8">
<div>

**Stakeholders**

- **Trabajadores** — consulta de su propio convenio.
- **RRHH y ETTs** — cálculo de costes para contrataciones.
- **Asesorías laborales** — verificación rápida.

**Caso real validado**

BDL Eurofilms (ETT) — necesitan calcular costes de personal de hostelería bajo el convenio aplicable, por categoría y horas.

</div>
<div>

**KPIs del producto**

- Precisión salarial: error 0€ vs PDF oficial.
- Cita verificable en cada respuesta.
- Latencia < 3s para consultas estándar.
- Core Web Vitals 60+ de rendimiento (PageSpeed).

**Restricciones**

- Presupuesto operativo: ~100 €/mes.
- Solo-dev — automatización máxima.
- Sin asesoría legal vinculante (disclaimer obligatorio).

</div>
</div>

<!--
Análisis del problema desde el lado del usuario y del negocio.
Stakeholders: el usuario final puede ser un trabajador consultando su propio convenio, pero el caso de uso comercial más claro es RRHH y ETTs que necesitan calcular costes de personal. El stakeholder validado es BDL Eurofilms.
KPIs: el más estricto es la precisión salarial — error 0€ contra el PDF oficial. Esto se mide manualmente con el convenio de Hostelería de Madrid, que es el que tenemos validado al 100% (TFM.1).
Las restricciones marcan mucho la arquitectura. Solo soy yo desarrollando, así que automatización máxima (n8n, Vercel, GitHub Actions). Y el presupuesto es ~100€/mes, lo que descarta cualquier cosa que tenga coste fijo elevado — de ahí serverless + cache semántico.
El proyecto NO incluye cálculo de nóminas reales (con IRPF y Seguridad Social) ni asesoría jurídica vinculante. Hay disclaimer legal en footer, en primera respuesta del chat y en exportaciones PDF.
-->
