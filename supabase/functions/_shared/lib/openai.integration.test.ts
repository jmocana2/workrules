/**
 * Test de integracion para embedQuestion
 * Requiere OPENAI_API_KEY configurada
 *
 * Ejecutar: deno test --allow-env --allow-net openai.integration.test.ts
 */

import { assertEquals } from '@std/assert';
import { embedQuestion } from './openai.ts';

Deno.test({
  name: 'embedQuestion - integracion real con OpenAI API',
  ignore: !Deno.env.get('OPENAI_API_KEY'),
  fn: async () => {
    const text = 'Cual es el salario base de un camarero en hosteleria?';

    console.log('Llamando a OpenAI API...');
    const startTime = Date.now();

    const embedding = await embedQuestion(text);

    const elapsed = Date.now() - startTime;
    console.log(`Respuesta en ${elapsed}ms`);

    // Verificar dimensiones
    assertEquals(embedding.length, 1536);
    console.log('Dimensiones correctas: 1536');

    // Verificar que son numeros
    assertEquals(typeof embedding[0], 'number');
    assertEquals(typeof embedding[1535], 'number');
    console.log('Tipo correcto: number[]');

    // Verificar rango tipico de embeddings (-1 a 1)
    const inRange = embedding.every((v) => v >= -1 && v <= 1);
    assertEquals(inRange, true);
    console.log('Rango correcto: [-1, 1]');

    // Mostrar muestra
    console.log('Primeros 5 valores:', embedding.slice(0, 5));
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
