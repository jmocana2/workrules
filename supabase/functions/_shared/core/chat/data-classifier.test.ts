/**
 * Tests para data-classifier.ts
 *
 * @module data-classifier.test
 */

import { assertEquals } from '@std/assert';
import {
  buildConflictMessage,
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

Deno.test('classifyDataState - falta jornada', () => {
  const variables = {
    categoria: 'Camarero',
  };
  const perfil = {
    variables_criticas: ['categoria', 'jornada'],
  };

  const result = classifyDataState(variables, perfil);

  assertEquals(result.state, 'incomplete');
  assertEquals(result.missingVariables, ['jornada']);
});

Deno.test('classifyDataState - faltan multiples variables', () => {
  const variables = {};
  const perfil = {
    variables_criticas: ['categoria', 'jornada', 'nivel establecimiento'],
  };

  const result = classifyDataState(variables, perfil);

  assertEquals(result.state, 'incomplete');
  assertEquals(result.missingVariables.length, 3);
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

// ============================================
// classifyDataState - Invalido
// ============================================

Deno.test('classifyDataState - horas extra > 80', () => {
  const variables = {
    horasExtra: 100,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'invalid');
  assertEquals(result.invalidVariables.length, 1);
  assertEquals(result.invalidVariables[0].name, 'horasExtra');
  assertEquals(result.invalidVariables[0].value, 100);
});

Deno.test('classifyDataState - horas extra = 80 es valido', () => {
  const variables = {
    horasExtra: 80,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'complete');
  assertEquals(result.invalidVariables.length, 0);
});

Deno.test('classifyDataState - jornada > 40h semanales', () => {
  const variables = {
    horasSemanales: 50,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'invalid');
  assertEquals(result.invalidVariables[0].name, 'horasSemanales');
});

Deno.test('classifyDataState - jornada = 40h es valido', () => {
  const variables = {
    horasSemanales: 40,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'complete');
});

Deno.test('classifyDataState - jornada < 1h', () => {
  const variables = {
    horasSemanales: 0,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'invalid');
  assertEquals(result.invalidVariables[0].name, 'horasSemanales');
});

Deno.test('classifyDataState - antiguedad > 50 anos', () => {
  const variables = {
    antiguedadAnos: 60,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'invalid');
  assertEquals(result.invalidVariables[0].name, 'antiguedadAnos');
});

Deno.test('classifyDataState - antiguedad negativa', () => {
  const variables = {
    antiguedadAnos: -5,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'invalid');
  assertEquals(result.invalidVariables[0].reason, 'La antiguedad no puede ser negativa');
});

Deno.test('classifyDataState - horas nocturnas negativas', () => {
  const variables = {
    horasNocturnas: -10,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'invalid');
  assertEquals(result.invalidVariables[0].name, 'horasNocturnas');
});

Deno.test('classifyDataState - horas extra negativas', () => {
  const variables = {
    horasExtra: -5,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'invalid');
  assertEquals(result.invalidVariables[0].name, 'horasExtra');
});

// ============================================
// classifyDataState - Conflictivo
// ============================================

Deno.test('classifyDataState - jornada completa con 20h', () => {
  const variables = {
    jornada: 'completa' as const,
    horasSemanales: 20,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'conflicting');
  assertEquals(result.conflictingVariables.length, 1);
  assertEquals(result.conflictingVariables[0].variables, [
    'jornada',
    'horasSemanales',
  ]);
});

Deno.test('classifyDataState - jornada parcial con 40h', () => {
  const variables = {
    jornada: 'parcial' as const,
    horasSemanales: 40,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'conflicting');
});

Deno.test('classifyDataState - jornada completa con 35h no es conflicto', () => {
  const variables = {
    jornada: 'completa' as const,
    horasSemanales: 35,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'complete');
  assertEquals(result.conflictingVariables.length, 0);
});

Deno.test('classifyDataState - jornada parcial con 39h no es conflicto', () => {
  const variables = {
    jornada: 'parcial' as const,
    horasSemanales: 39,
  };

  const result = classifyDataState(variables, null);

  assertEquals(result.state, 'complete');
});

// ============================================
// classifyDataState - Prioridad de estados
// ============================================

Deno.test('classifyDataState - invalido tiene prioridad sobre incompleto', () => {
  const variables = {
    horasExtra: 100, // invalido
  };
  const perfil = {
    variables_criticas: ['categoria'], // faltaria
  };

  const result = classifyDataState(variables, perfil);

  // Invalido tiene prioridad
  assertEquals(result.state, 'invalid');
});

Deno.test('classifyDataState - invalido tiene prioridad sobre conflicto', () => {
  const variables = {
    jornada: 'completa' as const,
    horasSemanales: 20, // conflicto
    horasExtra: 100, // invalido
  };

  const result = classifyDataState(variables, null);

  // Invalido tiene prioridad
  assertEquals(result.state, 'invalid');
});

Deno.test('classifyDataState - conflicto tiene prioridad sobre incompleto', () => {
  const variables = {
    jornada: 'completa' as const,
    horasSemanales: 20, // conflicto
  };
  const perfil = {
    variables_criticas: ['categoria'], // faltaria
  };

  const result = classifyDataState(variables, perfil);

  // Conflicto tiene prioridad
  assertEquals(result.state, 'conflicting');
});

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
// buildConflictMessage
// ============================================

Deno.test('buildConflictMessage - jornada inconsistente', () => {
  const result = {
    state: 'conflicting' as const,
    extractedVariables: {},
    missingVariables: [],
    invalidVariables: [],
    conflictingVariables: [
      {
        variables: ['jornada', 'horasSemanales'],
        reason: 'Jornada completa pero 20h',
      },
    ],
    suggestions: {},
  };

  const message = buildConflictMessage(result);

  assertEquals(message.includes('inconsistentes'), true);
  assertEquals(message.includes('20h'), true);
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
