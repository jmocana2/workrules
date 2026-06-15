#!/usr/bin/env node
// Reescribe los IDs de credenciales del workflow local -> prod.
// Uso:
//   node n8n/build-prod.mjs                  # genera n8n/dist/Workrules-Indexer-PROD.json
//   node n8n/build-prod.mjs --direction prod-to-local
//   node n8n/build-prod.mjs --input n8n/Workrules-Errors.json --output n8n/dist/Workrules-Errors-PROD.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { direction: 'local-to-prod', input: null, output: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--direction') args.direction = argv[++i];
    else if (a === '--input') args.input = argv[++i];
    else if (a === '--output') args.output = argv[++i];
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else { console.error('Flag desconocida:', a); printHelp(); process.exit(1); }
  }
  return args;
}

function printHelp() {
  console.log(`Uso: node n8n/build-prod.mjs [--direction local-to-prod|prod-to-local] [--input file] [--output file]

Por defecto: lee n8n/Workrules-Indexer.json, escribe n8n/dist/Workrules-Indexer-PROD.json,
reescribiendo IDs de credenciales segun n8n/credential-map.json.`);
}

const args = parseArgs(process.argv);
if (!['local-to-prod', 'prod-to-local'].includes(args.direction)) {
  console.error('--direction debe ser local-to-prod o prod-to-local'); process.exit(1);
}

const [from, to] = args.direction === 'local-to-prod' ? ['local', 'prod'] : ['prod', 'local'];

const inputPath  = resolve(repoRoot, args.input  ?? 'n8n/Workrules-Indexer.json');
const outputPath = resolve(repoRoot, args.output ?? `n8n/dist/Workrules-Indexer-${to.toUpperCase()}.json`);
const mapPath    = resolve(repoRoot, 'n8n/credential-map.json');

const workflow = JSON.parse(readFileSync(inputPath, 'utf8'));
const map = JSON.parse(readFileSync(mapPath, 'utf8'));

const changes = [];
const warnings = [];

for (const node of workflow.nodes) {
  if (!node.credentials) continue;
  for (const credType of Object.keys(node.credentials)) {
    const current = node.credentials[credType];
    const override = map.overrides?.[node.name]?.[credType];
    const def = map.defaults?.[credType];
    const rule = override ?? def;

    if (!rule) {
      warnings.push(`[${node.name}] tipo ${credType} sin entrada en credential-map.json (se deja intacto: ${current.id})`);
      continue;
    }

    const expected = rule[from];
    const target = rule[to];

    if (current.id !== expected.id) {
      warnings.push(`[${node.name}] ${credType} id=${current.id} no coincide con esperado ${from} (${expected.id}). ¿Mapa desactualizado?`);
    }

    node.credentials[credType] = { id: target.id, name: target.name };
    changes.push(`${node.name} :: ${credType} : ${current.id} (${current.name}) -> ${target.id} (${target.name})`);
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf8');

console.log(`Direccion: ${from} -> ${to}`);
console.log(`Entrada : ${inputPath}`);
console.log(`Salida  : ${outputPath}`);
console.log(`Cambios : ${changes.length}`);
for (const c of changes) console.log('  -', c);
if (warnings.length) {
  console.log(`\nAvisos (${warnings.length}):`);
  for (const w of warnings) console.log('  !', w);
  process.exitCode = 0;
}
