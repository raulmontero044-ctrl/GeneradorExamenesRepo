// Coherencia entre skills, agentes y herramientas: detecta referencias rotas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../tools/lib/config.mjs';

const SKILLS = join(RAIZ, '.claude', 'skills');
const AGENTES = join(RAIZ, '.claude', 'agents');
const leer = (r) => readFileSync(r, 'utf8');

const skills = readdirSync(SKILLS).filter((d) => existsSync(join(SKILLS, d, 'SKILL.md')));
const agentes = readdirSync(AGENTES).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
const documentos = [
  ...skills.map((s) => join(SKILLS, s, 'SKILL.md')),
  ...agentes.map((a) => join(AGENTES, `${a}.md`)),
  ...readdirSync(join(RAIZ, 'docs')).filter((f) => f.endsWith('.md')).map((f) => join(RAIZ, 'docs', f)),
  join(RAIZ, 'README.md'), join(RAIZ, 'CLAUDE.md'), join(RAIZ, 'banco', 'README.md'), join(RAIZ, 'historial', 'README.md'),
];

function frontmatter(texto) {
  const m = texto.match(/^---\n([\s\S]*?)\n---\n/);
  return m ? Object.fromEntries(m[1].split('\n').filter((l) => /^\w[\w-]*:/.test(l)).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()])) : null;
}

test('existen las cinco skills y los cuatro agentes del diseño', () => {
  assert.deepEqual(skills.sort(), ['do-examen', 'k-corrector', 'k-examen', 'k-preguntas', 'k-temario']);
  assert.deepEqual(agentes.sort(), ['evaluador-preguntas', 'falsador', 'generador-preguntas', 'redactor-wiki']);
});

test('frontmatter válido: name igual a la carpeta o fichero y description presente', () => {
  for (const s of skills) {
    const fm = frontmatter(leer(join(SKILLS, s, 'SKILL.md')));
    assert.ok(fm, `${s}: sin frontmatter`);
    assert.equal(fm.name, s);
    assert.ok(fm.description?.length > 40, `${s}: description demasiado corta`);
  }
  for (const a of agentes) {
    const fm = frontmatter(leer(join(AGENTES, `${a}.md`)));
    assert.equal(fm?.name, a);
    assert.ok(fm.description, `${a}: sin description`);
    assert.ok(fm.tools, `${a}: debe limitar sus herramientas`);
  }
});

test('los agentes que no deben escribir no tienen Write ni Edit', () => {
  for (const a of ['falsador']) {
    const tools = frontmatter(leer(join(AGENTES, `${a}.md`))).tools;
    assert.doesNotMatch(tools, /\b(Write|Edit)\b/, `${a} es de solo lectura`);
  }
  for (const a of agentes) assert.doesNotMatch(frontmatter(leer(join(AGENTES, `${a}.md`))).tools, /\bAgent\b/, `${a} no debe lanzar subagentes`);
});

test('cada "node tools/<x>.mjs <orden>" citado existe y la orden está implementada', () => {
  const fallos = [];
  for (const doc of documentos) {
    for (const [, herramienta, orden] of leer(doc).matchAll(/tools\/([\w-]+)\.mjs(?: (\w[\w-]*))?/g)) {
      const ruta = join(RAIZ, 'tools', `${herramienta}.mjs`);
      if (!existsSync(ruta)) { fallos.push(`${doc}: no existe tools/${herramienta}.mjs`); continue; }
      if (orden && !orden.startsWith('-') && !new RegExp(`['"\`]${orden}['"\`]`).test(leer(ruta))) fallos.push(`${doc}: tools/${herramienta}.mjs no implementa "${orden}"`);
    }
  }
  assert.deepEqual(fallos, []);
});

test('los agentes y skills citados existen', () => {
  const fallos = [];
  for (const doc of documentos) {
    const texto = leer(doc);
    for (const [, a] of texto.matchAll(/subagent_type: "([\w-]+)"/g)) {
      if (!['general-purpose', ...agentes].includes(a)) fallos.push(`${doc}: agente inexistente ${a}`);
    }
    for (const [, a] of texto.matchAll(/\.claude\/agents\/([\w-]+)\.md/g)) if (!agentes.includes(a)) fallos.push(`${doc}: agente inexistente ${a}`);
    for (const [, s] of texto.matchAll(/`\/?(k-[\w-]+|do-examen)`/g)) if (!skills.includes(s)) fallos.push(`${doc}: skill inexistente ${s}`);
  }
  assert.deepEqual(fallos, []);
});

test('la distribución 5 × 8 no se contradice en las skills', () => {
  for (const s of ['do-examen', 'k-corrector', 'k-examen']) {
    const texto = leer(join(SKILLS, s, 'SKILL.md'));
    assert.match(texto, /40 preguntas/, s);
    assert.match(texto, /5 por tema/, s);
  }
});
