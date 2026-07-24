/**
 * Tests para data-classifier.ts
 *
 * @module data-classifier.test
 */

import { assertEquals } from '@std/assert';
import {
  buildIncompleteMessage,
  buildInvalidMessage,
  classifyDataState,
  LEGAL_LIMITS,
} from './data-classifier.ts';

// ============================================
// classifyDataState - Completo
// ============================================

Deno.test('classifyDataState - datos completos sin perfil', () => {
  const variables = {
    categoria: 'Camarero',
    jornada: 'completa' as const,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'complete');
  assertEquals(result.missingVariables.length, 0);
  assertEquals(result.invalidVariables.length, 0);
  assertEquals(result.conflictingVariables.length, 0);
});

Deno.test('classifyDataState - datos completos con perfil', () => {
  const variables = {
    categoria: 'Camarero',
    jornada: 'completa' as const,
  };
  const perfil = {
    variables_criticas: ['categoria', 'jornada'],
  };

  const result = classifyDataState(variables, perfil);

  assertEquals(result.state, 'complete');
  assertEquals(result.missingVariables.length, 0);
});

Deno.test('classifyDataState - preserva variables extraidas', () => {
  const variables = {
    categoria: 'Camarero',
    horasExtra: 10,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.extractedVariables.categoria, 'Camarero');
  assertEquals(result.extractedVariables.horasExtra, 10);
});

// ============================================
// classifyDataState - Incompleto
// ============================================

Deno.test('classifyDataState - falta categoria', () => {
  const variables = {
    jornada: 'completa' as const,
  };
  const perfil = {
    variables_criticas: ['categoria', 'jornada'],
    categorias_profesionales: [{ nombre: 'Camarero' }, { nombre: 'Cocinero' }],
  };

  const result = classifyDataState(variables, perfil);

  assertEquals(result.state, 'incomplete');
  assertEquals(result.missingVariables, ['categoria']);
  assertEquals(result.suggestions['categoria'], ['Camarero', 'Cocinero']);
});

Deno.test('classifyDataState - falta jornada (moduladora, no bloquea)', () => {
  const variables = {
    categoria: 'Camarero',
  };
  const perfil = {
    variables_criticas: ['categoria', 'jornada'],
  };

  const result = classifyDataState(variables, perfil);

  // jornada es moduladora -> no bloquea, va a missingModulators
  assertEquals(result.state, 'complete');
  assertEquals(result.missingVariables, []);
  assertEquals(result.missingModulators, ['jornada']);
});

Deno.test('classifyDataState - faltan multiples variables', () => {
  const variables = {};
  const perfil = {
    variables_criticas: ['categoria', 'jornada', 'nivel establecimiento'],
  };

  const result = classifyDataState(variables, perfil);

  // categoria y nivel son identificadoras -> bloquean
  // jornada es moduladora -> no bloquea
  assertEquals(result.state, 'incomplete');
  assertEquals(result.missingVariables.length, 2);
  assertEquals(result.missingModulators, ['jornada']);
});

Deno.test('classifyDataState - variable critica con acento', () => {
  const variables = {};
  const perfil = {
    variables_criticas: ['categoría profesional'],
    categorias_profesionales: [{ nombre: 'Recepcionista' }],
  };

  const result = classifyDataState(variables, perfil);

  assertEquals(result.state, 'incomplete');
  assertEquals(result.missingVariables, ['categoría profesional']);
});

// Nota fase 9 (refactor 007): los tests de invalid/conflicting/prioridad se
// borraron al colapsar `data-classifier`. Esas invariantes viven ahora en:
//   - `domain/value-objects/*.test.ts` (rangos escalares)
//   - `domain/chat-command/input-mapper.test.ts` (cross-field)
//   - `calculate-salary/extracted-variables-validator.test.ts` (path NL)

// ============================================
// buildIncompleteMessage
// ============================================

Deno.test('buildIncompleteMessage - con opciones', () => {
  const result = {
    state: 'incomplete' as const,
    extractedVariables: {},
    missingVariables: ['categoria'],
    invalidVariables: [],
    conflictingVariables: [],
    suggestions: { categoria: ['Camarero', 'Cocinero'] },
  };

  const message = buildIncompleteMessage(result, 'Hosteleria Valencia');

  assertEquals(message.includes('categoria'), true);
  assertEquals(message.includes('Camarero'), true);
  assertEquals(message.includes('Cocinero'), true);
  assertEquals(message.includes('Hosteleria Valencia'), true);
});

Deno.test('buildIncompleteMessage - sin opciones', () => {
  const result = {
    state: 'incomplete' as const,
    extractedVariables: {},
    missingVariables: ['jornada'],
    invalidVariables: [],
    conflictingVariables: [],
    suggestions: {},
  };

  const message = buildIncompleteMessage(result, 'Comercio');

  assertEquals(message.includes('jornada'), true);
  assertEquals(message.includes('Comercio'), true);
  assertEquals(message.endsWith('.'), true);
});

// ============================================
// buildInvalidMessage
// ============================================

Deno.test('buildInvalidMessage - horas extra', () => {
  const result = {
    state: 'invalid' as const,
    extractedVariables: {},
    missingVariables: [],
    invalidVariables: [
      {
        name: 'horasExtra',
        reason: 'El maximo legal es 80/ano',
        value: 100,
      },
    ],
    conflictingVariables: [],
    suggestions: {},
  };

  const message = buildInvalidMessage(result);

  assertEquals(message.includes('fuera de rango'), true);
  assertEquals(message.includes('100'), true);
  assertEquals(message.includes('80'), true);
});

// ============================================
// LEGAL_LIMITS export
// ============================================

Deno.test('LEGAL_LIMITS - valores correctos', () => {
  assertEquals(LEGAL_LIMITS.horasExtraAnuales, 80);
  assertEquals(LEGAL_LIMITS.jornadaSemanalMaxima, 40);
  assertEquals(LEGAL_LIMITS.jornadaSemanalMinima, 1);
  assertEquals(LEGAL_LIMITS.antiguedadMaxima, 50);
});

// ============================================
// SMI_2026 y validateAgainstSMI
// ============================================

import { SMI_2026, validateAgainstSMI } from './data-classifier.ts';

Deno.test('SMI_2026 - valores correctos 2026', () => {
  assertEquals(SMI_2026.mensual14Pagas, 1221);
  assertEquals(SMI_2026.mensual12Pagas, 1424.5);
  assertEquals(SMI_2026.anual, 17094);
});

Deno.test('validateAgainstSMI - salario por encima del SMI (jornada completa)', () => {
  const result = validateAgainstSMI(1500, 14);

  assertEquals(result.belowSMI, false);
  assertEquals(result.calculatedAnnualSalary, 21000);
  assertEquals(result.smiAnnualApplicable, 17094);
  assertEquals(result.jornadaRatio, 1);
  assertEquals(result.difference, 3906);
  assertEquals(result.message, undefined);
});

Deno.test('validateAgainstSMI - salario igual al SMI (jornada completa)', () => {
  const result = validateAgainstSMI(1221, 14);

  assertEquals(result.belowSMI, false);
  assertEquals(result.calculatedAnnualSalary, 17094);
  assertEquals(result.smiAnnualApplicable, 17094);
  assertEquals(result.difference, 0);
  assertEquals(result.message, undefined);
});

Deno.test('validateAgainstSMI - salario por debajo del SMI (jornada completa)', () => {
  const result = validateAgainstSMI(1100, 14);

  assertEquals(result.belowSMI, true);
  assertEquals(result.calculatedAnnualSalary, 15400);
  assertEquals(result.smiAnnualApplicable, 17094);
  assertEquals(result.difference, -1694);
  assertEquals(result.message?.includes('Alerta SMI'), true);
  assertEquals(result.message?.includes('Art. 27'), true);
});

Deno.test('validateAgainstSMI - part-time 50% con salario prorrateado NO viola SMI', () => {
  // Caso del aviso CodeRabbit: 700€/mes × 14 pagas al 50% de jornada.
  // SMI anual prorrateado = 17094 * 0.5 = 8547€; salario anual = 700 * 14 = 9800€.
  const result = validateAgainstSMI(700, 14, {
    horasSemanalesContrato: 20,
    jornadaCompletaHoras: 40,
  });

  assertEquals(result.belowSMI, false);
  assertEquals(result.jornadaRatio, 0.5);
  assertEquals(result.smiAnnualApplicable, 8547);
  assertEquals(result.calculatedAnnualSalary, 9800);
  assertEquals(result.message, undefined);
});

Deno.test('validateAgainstSMI - part-time 50% con salario insuficiente SÍ viola SMI', () => {
  // 500€ × 14 = 7000€ anuales, por debajo del SMI prorrateado (8547€).
  const result = validateAgainstSMI(500, 14, {
    horasSemanalesContrato: 20,
    jornadaCompletaHoras: 40,
  });

  assertEquals(result.belowSMI, true);
  assertEquals(result.jornadaRatio, 0.5);
  assertEquals(result.difference, -1547);
  assertEquals(result.message?.includes('prorrateado'), true);
});

Deno.test('validateAgainstSMI - 12 pagas por encima', () => {
  const result = validateAgainstSMI(1500, 12);

  assertEquals(result.belowSMI, false);
  assertEquals(result.calculatedAnnualSalary, 18000);
  assertEquals(result.smiAnnualApplicable, 17094);
});

Deno.test('validateAgainstSMI - 12 pagas por debajo', () => {
  const result = validateAgainstSMI(1300, 12);

  assertEquals(result.belowSMI, true);
  assertEquals(result.calculatedAnnualSalary, 15600);
  assertEquals(result.smiAnnualApplicable, 17094);
});

Deno.test('validateAgainstSMI - salario muy bajo (jornada completa)', () => {
  const result = validateAgainstSMI(500, 14);

  assertEquals(result.belowSMI, true);
  assertEquals(result.difference, -10094);
});

Deno.test('validateAgainstSMI - por defecto asume 14 pagas y jornada completa', () => {
  const result = validateAgainstSMI(1221);

  assertEquals(result.smiAnnualApplicable, 17094);
  assertEquals(result.jornadaRatio, 1);
  assertEquals(result.belowSMI, false);
});
