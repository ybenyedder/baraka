/**
 * Génère le document OpenAPI (openapi.json) sans démarrer le serveur.
 * Sert de source à la génération du client typé (@baraka/api-client).
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildServer } from '../server';

const app = await buildServer();
await app.ready();
const doc = app.swagger();
const out = resolve(process.cwd(), 'openapi.json');
await writeFile(out, JSON.stringify(doc, null, 2), 'utf8');
await app.close();
console.log(`✓ OpenAPI écrit dans ${out}`);
process.exit(0);
