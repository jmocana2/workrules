// supabase/functions/_shared/domain/result.test.ts

import { assertEquals, assertStrictEquals } from '@std/assert';
import {
  chain,
  err,
  isErr,
  isOk,
  map,
  mapErr,
  ok,
  Result,
  unwrapOr,
} from './result.ts';

Deno.test('ok - construye Ok con value', () => {
  const r = ok(42);
  assertEquals(r, { ok: true, value: 42 });
});

Deno.test('err - construye Err con error', () => {
  const r = err({ kind: 'boom' as const });
  assertEquals(r, { ok: false, error: { kind: 'boom' } });
});

Deno.test('isOk / isErr - discriminan correctamente', () => {
  const a: Result<number, string> = ok(1);
  const b: Result<number, string> = err('nope');
  assertEquals(isOk(a), true);
  assertEquals(isErr(a), false);
  assertEquals(isOk(b), false);
  assertEquals(isErr(b), true);
});

Deno.test('map - transforma value en Ok', () => {
  const r = map(ok(2), (n) => n * 3);
  assertEquals(r, { ok: true, value: 6 });
});

Deno.test('map - no toca Err', () => {
  const original: Result<number, string> = err<string>('e');
  const r = map(original, (n) => n * 3);
  assertStrictEquals(r, original);
});

Deno.test('chain - encadena Ok → Ok', () => {
  const r = chain(ok(2), (n) => ok(n + 1));
  assertEquals(r, { ok: true, value: 3 });
});

Deno.test('chain - Ok → Err propaga Err', () => {
  const r = chain(ok(2), (_n) => err('fail'));
  assertEquals(r, { ok: false, error: 'fail' });
});

Deno.test('chain - no invoca fn si input es Err', () => {
  let called = false;
  const r = chain(err<string>('x') as Result<number, string>, (n) => {
    called = true;
    return ok(n + 1);
  });
  assertEquals(called, false);
  assertEquals(r, { ok: false, error: 'x' });
});

Deno.test('mapErr - transforma error en Err', () => {
  const r = mapErr(err('raw'), (e) => `wrapped:${e}`);
  assertEquals(r, { ok: false, error: 'wrapped:raw' });
});

Deno.test('mapErr - no toca Ok', () => {
  const original: Result<number, string> = ok(7);
  const r = mapErr(original, (e) => `wrapped:${e}`);
  assertStrictEquals(r, original);
});

Deno.test('unwrapOr - devuelve value en Ok', () => {
  assertEquals(unwrapOr(ok(10), 0), 10);
});

Deno.test('unwrapOr - devuelve fallback en Err', () => {
  assertEquals(unwrapOr(err('x') as Result<number, string>, 99), 99);
});

Deno.test('domain contract - Result nunca lanza; los errores viajan como valor', () => {
  // Prueba estructural: componer una cadena que "fallaría" en imperativo
  // devuelve un Err sin lanzar.
  const pipeline = chain(
    chain(ok(2), (n) => (n > 0 ? ok(n) : err('neg'))),
    (n) => (n < 10 ? ok(n * 5) : err('too_big'))
  );
  assertEquals(pipeline, { ok: true, value: 10 });

  const pipelineFail = chain(
    chain(ok(-1), (n) => (n > 0 ? ok(n) : err('neg'))),
    (n) => ok(n * 5)
  );
  assertEquals(pipelineFail, { ok: false, error: 'neg' });
});
