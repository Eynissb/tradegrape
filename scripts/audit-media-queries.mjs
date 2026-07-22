import { readFileSync } from 'node:fs';

/* Ordre de cascade réel : globals.css importe design-system puis design-tokens
   en tête de fichier, donc ses propres règles viennent en dernier. */
const FILES = [
  ['design-system.css', 'app/design-system.css'],
  ['design-tokens.css', 'app/design-tokens.css'],
  ['globals.css', 'app/globals.css'],
];

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Spécificité (a,b,c) → nombre comparable. Les media queries n'en ajoutent aucune. */
function specificity(sel) {
  let s = sel.replace(/::?[a-z-]+(\([^)]*\))?/gi, (m) =>
    /^::/.test(m) ? 'ELEM' : (/^:(not|is|where|has)\b/i.test(m) ? m : 'CLS'),
  );
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const cls =
    (s.match(/\.[\w-]+/g) || []).length +
    (s.match(/\[[^\]]+\]/g) || []).length +
    (s.match(/CLS/g) || []).length;
  const els = (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length + (s.match(/ELEM/g) || []).length;
  return ids * 10000 + cls * 100 + els;
}

/** Dernier compound du sélecteur — c'est lui qui décide de la cible. */
function key(sel) {
  const last = sel.trim().split(/[\s>+~]+/).pop() || '';
  const m = last.match(/^[.#]?[\w-]+/);
  return m ? m[0] : last;
}

const rules = [];
let pos = 0;

for (const [label, path] of FILES) {
  const css = strip(readFileSync(path, 'utf8'));
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf('{', i);
    if (at === -1) break;
    const prelude = css.slice(i, at).trim();
    let depth = 1, j = at + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const body = css.slice(at + 1, j - 1);

    if (/^@media/i.test(prelude)) {
      let k = 0;
      while (k < body.length) {
        const a2 = body.indexOf('{', k);
        if (a2 === -1) break;
        const sels = body.slice(k, a2).trim();
        const e2 = body.indexOf('}', a2);
        const decl = body.slice(a2 + 1, e2);
        for (const sel of sels.split(',')) {
          if (!sel.trim()) continue;
          rules.push({ label, media: prelude.replace(/^@media\s*/, ''), sel: sel.trim(), decl, pos: pos++ });
        }
        k = e2 + 1;
      }
    } else if (!prelude.startsWith('@')) {
      for (const sel of prelude.split(',')) {
        if (!sel.trim()) continue;
        rules.push({ label, media: null, sel: sel.trim(), decl: body, pos: pos++ });
      }
    } else {
      pos++;
    }
    i = j;
  }
}

const declared = (decl) =>
  [...decl.matchAll(/(^|;)\s*(--[\w-]+|[-a-z]+)\s*:/gi)].map((m) => m[2].toLowerCase());
/** Variables CONSOMMÉES par la déclaration (var(--x)). */
const consumed = (decl) =>
  [...decl.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1].toLowerCase());

const conflicts = [];
const varShadow = [];

for (const r of rules) {
  if (!r.media) continue;
  const rSpec = specificity(r.sel);
  const rKey = key(r.sel);
  const rDecl = declared(r.decl);

  // (1) conflit direct : même propriété, même cible, règle de base plus bas
  for (const p of new Set(rDecl)) {
    for (const o of rules) {
      if (o.media) continue;
      if (o.pos <= r.pos) continue;
      if (key(o.sel) !== rKey) continue;
      if (!declared(o.decl).includes(p)) continue;
      if (specificity(o.sel) < rSpec) continue;
      conflicts.push({ media: r.media, mqSel: r.sel, mqSpec: rSpec, mqFile: r.label,
        prop: p, baseSel: o.sel, baseSpec: specificity(o.sel), baseFile: o.label });
    }
  }

  // (2) NOUVEAU : indirection par variable. La media query redéfinit --x,
  //     mais une règle de base plus bas écrit EN DUR la propriété qui
  //     consommait --x → la variable n'a plus aucun effet sur cette cible.
  const varsSet = rDecl.filter((p) => p.startsWith('--'));
  if (varsSet.length) {
    for (const o of rules) {
      if (o.media) continue;
      if (o.pos <= r.pos) continue;
      const used = consumed(o.decl);
      for (const v of varsSet) {
        if (!used.includes(v)) continue;
        // la règle de base consomme la variable → OK, elle suit. Rien à signaler.
      }
    }
    // cas problématique : une base écrit la propriété en dur SANS lire la variable
    for (const v of varsSet) {
      const consumers = rules.filter((o) => !o.media && consumed(o.decl).includes(v));
      if (consumers.length === 0) {
        varShadow.push({ media: r.media, sel: r.sel, variable: v, note: 'aucun consommateur' });
      }
    }
  }
}

console.log(`Règles analysées : ${rules.length}`);
console.log(`Règles en media query : ${rules.filter((r) => r.media).length}`);
console.log(`\n=== CONFLITS DIRECTS (${conflicts.length}) ===\n`);
for (const c of conflicts) {
  console.log(`@media ${c.media}`);
  console.log(`  ${c.mqSel}  { ${c.prop} }   [${c.mqFile}, spéc ${c.mqSpec}]`);
  console.log(`  battue par : ${c.baseSel}  { ${c.prop} }   [${c.baseFile}, spéc ${c.baseSpec}]\n`);
}
console.log(`=== VARIABLES SANS CONSOMMATEUR (${varShadow.length}) ===\n`);
for (const v of varShadow) console.log(`@media ${v.media} → ${v.sel} { ${v.variable} } : ${v.note}`);
