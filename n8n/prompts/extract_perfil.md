# Prompt de Extraccion de Perfil JSON - I1.9

Este archivo contiene el system prompt y user prompt que se usan en el nodo de n8n
para extraer el Perfil JSON de un convenio colectivo mediante Claude.

---

## System Prompt

```
Eres un experto en derecho laboral espanol especializado en convenios colectivos.

Tu tarea es analizar el texto completo de un convenio colectivo y extraer un JSON estructurado con toda la informacion relevante para calcular condiciones laborales (salarios, jornada, complementos, etc.).

REGLAS ESTRICTAS:
1. Solo extrae datos que aparezcan EXPLICITAMENTE en el texto. Nunca inventes ni supongas valores.
2. Si un dato no aparece en el convenio, omite ese campo del JSON. No pongas null ni valores inventados.
3. Los salarios deben ser EXACTOS tal como aparecen en las tablas del convenio, sin redondear.
4. Cita el articulo del convenio donde aparece cada dato siempre que sea posible.
5. Si hay ambiguedad en un dato, incluyelo en el array "notas_extraccion" explicando la ambiguedad.
6. Responde UNICAMENTE con el JSON. Sin texto antes ni despues. Sin bloques de codigo markdown.
7. El JSON debe ser valido y parseable directamente.
```

---

## User Prompt Template

```
Analiza el siguiente convenio colectivo y extrae un JSON estructurado con esta informacion:

1. **Datos basicos**: nombre del convenio, ambito (estatal/autonomico/provincial/empresa), vigencia, codigo REGCON si aparece.

2. **Variables criticas**: lista de las variables que un usuario necesitaria proporcionar para obtener un calculo salarial preciso (ej: categoria profesional, grupo, nivel, tipo de jornada, antiguedad, categoria del establecimiento, zona geografica, etc.). Solo incluye variables que REALMENTE afecten al salario segun este convenio.

3. **Categorias profesionales**: TODAS las categorias/puestos que aparezcan en el convenio, con:
   - nombre exacto tal como aparece
   - grupo profesional (si existe clasificacion por grupos)
   - nivel (si existe)
   - area funcional (si existe)
   - salario base anual y/o mensual (de la tabla salarial mas reciente del convenio)

4. **Jornada laboral**: horas anuales, horas semanales, si hay distribucion irregular. Cita el articulo.

5. **Tablas salariales**: ano de referencia de los salarios, numero de pagas (incluyendo extras), criterio de revision salarial (IPC, porcentaje fijo, etc.).

6. **Complementos salariales**: TODOS los complementos/pluses definidos en el convenio:
   - nombre del complemento
   - tipo: "porcentaje", "cantidad_fija", "trienio", "quinquenio", "bienio" u "otro"
   - valor numerico (porcentaje o euros)
   - base de calculo (sobre que se aplica)
   - condicion para aplicarlo (si la hay)
   - articulo del convenio

7. **Horas extraordinarias**: recargo en laborables (%), recargo en festivos (%), precio fijo si lo hay, maximo anual, si se pueden compensar con descanso. Cita articulo.

8. **Periodo de prueba**: duracion por tipo de trabajador/categoria. Cita articulo.

9. **Vacaciones**: dias naturales o laborables. Cita articulo.

10. **Variables especificas del sector**: cualquier variable propia de este convenio que no encaje en los campos anteriores (ej: "Categoria Hotel" con valores ["3 estrellas", "4 estrellas", "5 estrellas"], "Zona geografica" con valores posibles, etc.). Incluye los valores posibles como array de strings.

11. **Notas de extraccion**: lista cualquier ambiguedad, dato que no pudiste extraer con certeza, o informacion relevante que no encaje en los campos anteriores.

FORMATO DE SALIDA - JSON con esta estructura:
{
  "convenio": "string",
  "ambito": "estatal|autonomico|provincial|empresa",
  "vigencia": { "inicio": "YYYY", "fin": "YYYY", "prorroga_automatica": true|false },
  "codigo_convenio": "string",
  "variables_criticas": ["string"],
  "categorias_profesionales": [
    {
      "nombre": "string",
      "grupo": "string",
      "nivel": "string",
      "area_funcional": "string",
      "salario_base_anual": number,
      "salario_base_mensual": number
    }
  ],
  "jornada": {
    "horas_anuales": number,
    "horas_semanales": number,
    "distribucion_irregular": boolean,
    "articulo": "string"
  },
  "tablas_salariales": {
    "ano_referencia": "YYYY",
    "num_pagas": number,
    "pagas_extra": number,
    "revision_salarial": "string"
  },
  "complementos": [
    {
      "nombre": "string",
      "tipo": "porcentaje|cantidad_fija|trienio|quinquenio|bienio|otro",
      "valor": number,
      "base_calculo": "string",
      "condicion": "string",
      "articulo": "string"
    }
  ],
  "horas_extra": {
    "recargo_laborable_pct": number,
    "recargo_festivo_pct": number,
    "precio_fijo_hora": number,
    "maximo_anual": number,
    "compensacion_descanso": boolean,
    "articulo": "string"
  },
  "periodo_prueba": [
    { "tipo_trabajador": "string", "duracion": "string", "articulo": "string" }
  ],
  "vacaciones": {
    "dias_naturales": number,
    "dias_laborables": number,
    "articulo": "string"
  },
  "variables_especificas": {
    "nombre_variable": ["valor1", "valor2"]
  },
  "notas_extraccion": ["string"]
}

Omite los campos para los que no encuentres informacion en el texto. No inventes datos.

---

TEXTO DEL CONVENIO:

{{markdown_convenio}}
```

---

## Notas de Implementacion

- El placeholder `{{markdown_convenio}}` se reemplaza en el nodo Code de n8n con el campo `markdown_completo` del convenio.
- Si el markdown supera ~150K tokens, considerar truncar los articulos menos relevantes (disposiciones transitorias, anexos administrativos) y mantener los bloques de clasificacion profesional, tablas salariales y condiciones laborales.
- Modelo recomendado: `claude-sonnet-4-20250514` (200K context window, buena relacion coste/calidad).
- Temperature: 0 (queremos extraccion determinista, no creatividad).
- Max tokens de salida: 8192 (suficiente para cualquier perfil JSON).
