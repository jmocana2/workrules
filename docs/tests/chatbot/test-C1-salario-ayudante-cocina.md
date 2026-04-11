# Test C1: Salario Ayudante de Cocina

**Fecha:** 2026-04-10
**Convenio:** Hostelería de Madrid
**Categoría de Test:** C - Salarios Base

---

## Pregunta Inicial

```
¿Cuál es el salario base de un ayudante de cocina?```

---

## Flujo de Conversación

### Turno 1: Sistema solicita tipo de establecimiento

Consulta sobre salario base - Ayudante de Cocina:

Para determinar el salario base de un Ayudante de Cocina, necesito conocer el tipo de establecimiento donde trabaja, ya que las tablas salariales varían según la categoría del establecimiento.

Según las tablas del convenio (2023), los salarios base mensuales para Ayudante de Cocina son:

| Tipo de Establecimiento | Salario Base Mensual |
|------------------------|---------------------|
| Hoteles de Lujo | 1.145,76 euros |
| Hoteles de Primera | 1.145,76 euros |
| Hoteles de Segunda | 1.145,76 euros |
| Hoteles de Tercera | 1.073,78 euros |
| Hoteles de Cuarta | No aplica esta categoría |

Para establecimientos de Catering:
- Catering Grupo D (superior): 1.150,73 euros
- Catering Grupo D (estándar): 1.095,93 euros

Complementos adicionales que pueden aplicar:
- Manutención: 57,82 euros/mes (cuando corresponda)
- Plus Convenio: 191,22 euros/mes (durante 11 meses)

Referencias:
- Tabla salarial Personal de Cocina: Contexto [5] (2023)
- Tabla salarial Personal de Catering: Contextos [1] y [2] (2023)

Para calcular su salario completo, necesito que me indique:
1. ¿En qué tipo de establecimiento trabaja? (Hotel de qué categoría o Catering)
2. ¿Tiene derecho a manutención?
3. ¿Alguna circunstancia especial? (antigüedad, horas extra, etc.)

Nota: Todos los importes mostrados son salarios brutos mensuales según las tablas vigentes de 2023.

---

### Turno 2: Usuario responde tipo de establecimiento

```
Trabaja en un hotel de primera
```

---

### Turno 3: Sistema calcula salario específico

Salario base para Ayudante de Cocina en Hotel de Primera:

Según las tablas salariales del convenio para 2023, el salario base mensual para un Ayudante de Cocina en un Hotel de Primera es de 1.145,76 euros.

Complementos adicionales que corresponden:
- Manutención: 57,82 euros/mes (cuando corresponda)
- Plus Convenio: 191,22 euros/mes (durante 11 meses)

Salario mensual completo estimado:
- Salario base: 1.145,76 euros
- Plus Convenio: 191,22 euros
- Manutención (si aplica): 57,82 euros
- **Total aproximado: 1.394,80 euros/mes** (con manutención)

Referencia: Tablas Salariales del Convenio - Personal de Cocina (2023)

Nota importante: Estos son importes brutos mensuales. El salario neto dependerá de las retenciones fiscales y cotizaciones sociales correspondientes. Si tiene antigüedad en la empresa o trabaja en horario nocturno, pueden aplicar complementos adicionales.

---

## Evaluación

### Criterios de Validación

| Criterio | Resultado | Notas |
|----------|-----------|-------|
| Detecta categoría "ayudante de cocina" | ✅ PASS | Correctamente identificada |
| Solicita tipo de establecimiento | ✅ PASS | Flujo multi-turno correcto |
| Valor salario base correcto | ✅ PASS | 1.145,76 € = valor esperado |
| Muestra complementos | ✅ PASS | Manutención + Plus Convenio |
| Referencia a tablas salariales | ✅ PASS | Cita fuente correcta |
| Cálculo total correcto | ✅ PASS | 1.145,76 + 191,22 + 57,82 = 1.394,80 € |

### Verificación contra Datos de Referencia

| Campo | Valor Esperado | Valor Obtenido | Match |
|-------|---------------|----------------|-------|
| Salario base Hotel Primera | 1.145,76 € | 1.145,76 € | ✅ |
| Manutención | 57,82 € | 57,82 € | ✅ |
| Plus Convenio | 191,22 € | 191,22 € | ✅ |

### Observaciones

1. **Flujo multi-turno:** Funcionó correctamente, el sistema solicitó información faltante antes de calcular.

2. **Año de referencia:** El sistema indica "2023" pero las tablas del convenio son de 2024. Inconsistencia menor a revisar.

3. **Manutención incluida:** Correcto para Hotel de Primera (las excepciones solo aplican a whisquerías y bares americanos).

---

## Resultado Final

**PASS** ✅

El test se considera superado. El sistema devuelve valores correctos según las tablas del convenio y gestiona correctamente el flujo conversacional multi-turno.
