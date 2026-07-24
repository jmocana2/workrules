/**
 * Tests para variable-extractor.ts
 *
 * @module variable-extractor.test
 */

import { assertEquals } from '@std/assert';
import {
  extractVariables,
  isSalaryQuery,
  mergeVariables,
} from './variable-extractor.ts';

// ============================================
// extractVariables - Jornada
// ============================================

Deno.test('extractVariables - detecta jornada completa', () => {
  const result = extractVariables('necesito calcular para jornada completa');

  assertEquals(result.jornada, 'completa');
  assertEquals(result.horasSemanales, 40);
});

Deno.test('extractVariables - detecta tiempo completo', () => {
  const result = extractVariables('trabajador a tiempo completo');

  assertEquals(result.jornada, 'completa');
  assertEquals(result.horasSemanales, 40);
});

Deno.test('extractVariables - detecta jornada parcial', () => {
  const result = extractVariables('trabaja a tiempo parcial');

  assertEquals(result.jornada, 'parcial');
  assertEquals(result.horasSemanales, undefined);
});

Deno.test('extractVariables - detecta media jornada', () => {
  const result = extractVariables('contrato de media jornada');

  assertEquals(result.jornada, 'parcial');
});

Deno.test('extractVariables - detecta horas semanales especificas', () => {
  const result = extractVariables('contrato de 25 horas semanales');

  assertEquals(result.horasSemanales, 25);
  assertEquals(result.jornada, 'parcial');
});

Deno.test('extractVariables - detecta horas a la semana', () => {
  const result = extractVariables('trabaja 30 horas a la semana');

  assertEquals(result.horasSemanales, 30);
  assertEquals(result.jornada, 'parcial');
});

Deno.test('extractVariables - 35+ horas es jornada completa', () => {
  const result = extractVariables('contrato de 38 horas semanales');

  assertEquals(result.horasSemanales, 38);
  assertEquals(result.jornada, 'completa');
});

// ============================================
// extractVariables - Horas extra
// ============================================

Deno.test('extractVariables - detecta horas extra', () => {
  const result = extractVariables('ha hecho 12 horas extra este mes');

  assertEquals(result.horasExtra, 12);
});

Deno.test('extractVariables - detecta horas extras (plural)', () => {
  const result = extractVariables('con 5 horas extras');

  assertEquals(result.horasExtra, 5);
});

Deno.test('extractVariables - detecta horas extraordinarias', () => {
  const result = extractVariables('10 horas extraordinarias');

  assertEquals(result.horasExtra, 10);
});

// ============================================
// extractVariables - Horas nocturnas
// ============================================

Deno.test('extractVariables - detecta horas nocturnas', () => {
  const result = extractVariables('trabaja 40 horas nocturnas');

  assertEquals(result.horasNocturnas, 40);
});

Deno.test('extractVariables - detecta horas de noche', () => {
  const result = extractVariables('20 horas de noche');

  assertEquals(result.horasNocturnas, 20);
});

Deno.test('extractVariables - detecta nocturnidad', () => {
  const result = extractVariables('15 horas de nocturnidad');

  assertEquals(result.horasNocturnas, 15);
});

// ============================================
// extractVariables - Antiguedad
// ============================================

Deno.test('extractVariables - detecta antiguedad en anos', () => {
  const result = extractVariables('tiene 5 anos de antiguedad');

  assertEquals(result.antiguedadAnos, 5);
});

Deno.test('extractVariables - detecta antiguedad formato corto', () => {
  const result = extractVariables('3 anos antiguedad');

  assertEquals(result.antiguedadAnos, 3);
});

// ============================================
// extractVariables - Nivel establecimiento
// ============================================

Deno.test('extractVariables - detecta hotel 4 estrellas', () => {
  const result = extractVariables('en un hotel de 4 estrellas');

  assertEquals(result.nivelEstablecimiento, '4 estrellas');
});

Deno.test('extractVariables - detecta hotel 3 estrellas', () => {
  const result = extractVariables('hotel 3 estrellas');

  assertEquals(result.nivelEstablecimiento, '3 estrellas');
});

Deno.test('extractVariables - detecta hotel 5 estrellas', () => {
  const result = extractVariables('trabaja en hotel 5 estrellas');

  assertEquals(result.nivelEstablecimiento, '5 estrellas');
});

// ============================================
// extractVariables - Categoria profesional
// ============================================

Deno.test('extractVariables - detecta categoria del perfil', () => {
  const perfil = {
    variables_criticas: ['categoria'],
    categorias_profesionales: [
      { nombre: 'Camarera de pisos' },
      { nombre: 'Gobernanta' },
      { nombre: 'Ayudante de cocina' },
    ],
  };

  const result = extractVariables(
    'calcula el salario de una gobernanta',
    perfil
  );

  assertEquals(result.categoria, 'Gobernanta');
});

Deno.test('extractVariables - match categoria case insensitive', () => {
  const perfil = {
    variables_criticas: ['categoria'],
    categorias_profesionales: [{ nombre: 'Recepcionista' }],
  };

  const result = extractVariables('soy RECEPCIONISTA', perfil);

  assertEquals(result.categoria, 'Recepcionista');
});

Deno.test('extractVariables - match categoria mas especifica primero', () => {
  const perfil = {
    variables_criticas: ['categoria'],
    categorias_profesionales: [
      { nombre: 'Cocina' },
      { nombre: 'Ayudante de cocina' },
    ],
  };

  const result = extractVariables('ayudante de cocina', perfil);

  // Debe matchear "Ayudante de cocina" (mas especifica) antes que "Cocina"
  assertEquals(result.categoria, 'Ayudante de cocina');
});

Deno.test('extractVariables - sin perfil no extrae categoria', () => {
  const result = extractVariables('calcula salario de camarero');

  assertEquals(result.categoria, undefined);
});

Deno.test('extractVariables - categoria no encontrada', () => {
  const perfil = {
    variables_criticas: ['categoria'],
    categorias_profesionales: [{ nombre: 'Camarero' }],
  };

  const result = extractVariables('salario de electricista', perfil);

  assertEquals(result.categoria, undefined);
});

// ============================================
// extractVariables - Caso complejo
// ============================================

Deno.test('extractVariables - caso completo con multiples variables', () => {
  const perfil = {
    variables_criticas: ['categoria'],
    categorias_profesionales: [{ nombre: 'Ayudante de cocina' }],
  };

  const result = extractVariables(
    'Calcula el salario de un ayudante de cocina a jornada completa ' +
      'en un hotel de 4 estrellas con 10 horas extra y 40 horas nocturnas',
    perfil
  );

  assertEquals(result.categoria, 'Ayudante de cocina');
  assertEquals(result.jornada, 'completa');
  assertEquals(result.horasSemanales, 40);
  assertEquals(result.nivelEstablecimiento, '4 estrellas');
  assertEquals(result.horasExtra, 10);
  assertEquals(result.horasNocturnas, 40);
});

Deno.test('extractVariables - mensaje vacio retorna objeto vacio', () => {
  const result = extractVariables('');

  assertEquals(result.categoria, undefined);
  assertEquals(result.jornada, undefined);
  assertEquals(result.horasExtra, undefined);
});

// ============================================
// isSalaryQuery
// ============================================

Deno.test('isSalaryQuery - detecta cuanto cobra', () => {
  assertEquals(isSalaryQuery('cuanto cobra un camarero'), true);
});

Deno.test('isSalaryQuery - detecta cuanto gana', () => {
  assertEquals(isSalaryQuery('cuanto gana una gobernanta'), true);
});

Deno.test('isSalaryQuery - detecta calcula', () => {
  assertEquals(isSalaryQuery('calcula el sueldo'), true);
});

Deno.test('isSalaryQuery - detecta calculame', () => {
  assertEquals(isSalaryQuery('calculame el salario'), true);
});

Deno.test('isSalaryQuery - detecta horas extra', () => {
  assertEquals(isSalaryQuery('valor de las horas extra'), true);
});

Deno.test('isSalaryQuery - detecta nocturnidad', () => {
  assertEquals(isSalaryQuery('plus de nocturnidad'), true);
});

Deno.test('isSalaryQuery - detecta nomina', () => {
  assertEquals(isSalaryQuery('como es mi nomina'), true);
});

Deno.test('isSalaryQuery - detecta coste laboral', () => {
  assertEquals(isSalaryQuery('coste laboral de contratar'), true);
});

Deno.test('isSalaryQuery - rechaza pregunta sobre articulo', () => {
  assertEquals(isSalaryQuery('que dice el articulo 14'), false);
});

Deno.test('isSalaryQuery - rechaza pregunta sobre vacaciones', () => {
  assertEquals(isSalaryQuery('cuantos dias de vacaciones tengo'), false);
});

Deno.test('isSalaryQuery - rechaza pregunta sobre despido', () => {
  assertEquals(isSalaryQuery('como funciona el despido'), false);
});

Deno.test('isSalaryQuery - rechaza pregunta informativa sobre horas extraordinarias', () => {
  assertEquals(isSalaryQuery('que dice el convenio sobre horas extraordinarias'), false);
});

Deno.test('isSalaryQuery - rechaza pregunta informativa sobre horas extra', () => {
  assertEquals(isSalaryQuery('que establece el convenio sobre horas extra'), false);
});

Deno.test('isSalaryQuery - rechaza pregunta informativa sobre plus nocturnidad', () => {
  assertEquals(isSalaryQuery('existe plus de nocturnidad en el convenio'), false);
});

Deno.test('isSalaryQuery - rechaza pregunta informativa sobre complementos', () => {
  assertEquals(isSalaryQuery('que dice el convenio sobre complementos salariales'), false);
});

Deno.test('isSalaryQuery - rechaza pregunta informativa sobre salario', () => {
  assertEquals(isSalaryQuery('como se regula el salario segun el convenio'), false);
});

Deno.test('isSalaryQuery - acepta calculo de horas extra', () => {
  assertEquals(isSalaryQuery('calcula mi salario con 10 horas extra'), true);
});

Deno.test('isSalaryQuery - acepta cuanto cobra con horas extra', () => {
  assertEquals(isSalaryQuery('cuanto cobra un camarero con horas extra'), true);
});

// ============================================
// mergeVariables
// ============================================

Deno.test('mergeVariables - sin variables previas retorna actuales', () => {
  const current = { categoria: 'Camarero', jornada: 'completa' as const };

  const result = mergeVariables(undefined, current);

  assertEquals(result, current);
});

Deno.test('mergeVariables - combina variables previas y actuales', () => {
  const previous = { categoria: 'Camarero' };
  const current = { jornada: 'completa' as const };

  const result = mergeVariables(previous, current);

  assertEquals(result.categoria, 'Camarero');
  assertEquals(result.jornada, 'completa');
});

Deno.test('mergeVariables - actuales sobreescriben previas', () => {
  const previous = { categoria: 'Camarero', horasExtra: 5 };
  const current = { horasExtra: 10 };

  const result = mergeVariables(previous, current);

  assertEquals(result.categoria, 'Camarero');
  assertEquals(result.horasExtra, 10);
});
