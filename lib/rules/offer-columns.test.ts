/**
 * Garde-fou « colonne morte » sur la table `offers`.
 *
 * Trois colonnes ont été trouvées écrites-jamais-lues d'un coup
 * (`funded_drawdown_type`, `funded_daily_loss`, et le verrou au breakeven qui
 * n'existait même pas) : l'admin les saisissait, le moteur les ignorait. Le coût
 * est toujours le même — on croit qu'une règle est appliquée alors qu'elle ne
 * l'est pas, et on sous-estime le risque affiché à l'utilisateur.
 *
 * Le piège à éviter : `funded_drawdown_type` ÉTAIT présent dans le formulaire
 * admin. Un test qui se contente de chercher le nom de la colonne dans le code
 * l'aurait déclarée « lue » et n'aurait rien vu. Ce qui compte est la
 * consommation PRODUIT — le moteur, ou un affichage destiné à l'utilisateur.
 * L'aller-retour du formulaire admin ne compte pas.
 *
 * Le test impose donc une DÉCLARATION D'INTENTION par colonne, et vérifie que
 * chaque intention est tenue. Ajouter une colonne sans la classer casse le test.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { OFFER_COLUMNS } from '../admin/offer-csv';

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');
const SNAPSHOT = join(ROOT, 'lib', 'journal', 'snapshot.ts');
const JOURNAL_ACTIONS = join(ROOT, 'app', 'app', 'actions.ts');

type Consumer =
  /** Lue par `buildRulesSnapshot` → figée au compte, servie au moteur ou à son affichage. */
  | 'engine'
  /** Lue par un chemin produit (hors admin) — le fichier est vérifié. */
  | 'product'
  /** Pas encore consommée. Décision explicite, avec l'endroit prévu. */
  | 'planned'
  /** Clé, horodatage ou drapeau de requête — jamais une règle. */
  | 'internal';

interface Entry {
  consumer: Consumer;
  /** Obligatoire pour `planned` et `internal` : pourquoi ce n'est pas un oubli. */
  note?: string;
  /** Obligatoire pour `product` : fichier où la colonne est réellement lue. */
  readIn?: string;
}

/**
 * Intention déclarée pour CHAQUE colonne de `offers`.
 * Une colonne qui porte une RÈGLE doit être `engine` — sinon elle est saisie
 * dans le vide et l'utilisateur voit une jauge fausse.
 */
const REGISTRY: Record<string, Entry> = {
  // ---- Identité / métadonnées ----
  id: { consumer: 'internal', note: 'Clé primaire.' },
  created_at: { consumer: 'internal', note: 'Horodatage technique.' },
  updated_at: { consumer: 'internal', note: 'Horodatage technique (toute écriture le bouge).' },
  is_published: { consumer: 'internal', note: 'Filtre de visibilité publique, appliqué en requête.' },
  plan_id: { consumer: 'product', readIn: 'app/app/actions.ts' },

  // ---- Règles lues par le moteur (via buildRulesSnapshot) ----
  account_size: { consumer: 'engine' },
  currency: { consumer: 'engine' },
  drawdown_type: { consumer: 'engine' },
  drawdown_amount: { consumer: 'engine' },
  drawdown_locks_at_breakeven: { consumer: 'engine' },
  profit_target: { consumer: 'engine' },
  daily_loss_limit: { consumer: 'engine' },
  consistency_pct: { consumer: 'engine' },
  min_trading_days: { consumer: 'engine' },
  funded_drawdown_type: { consumer: 'engine' },
  funded_drawdown_amount: { consumer: 'engine' },
  funded_daily_loss: { consumer: 'engine' },
  funded_consistency_pct: { consumer: 'engine' },
  payout_buffer: { consumer: 'engine' },
  payout_min_amount: { consumer: 'engine' },
  payout_min_days: { consumer: 'engine' },
  payout_daily_threshold: { consumer: 'engine' },
  profit_split: { consumer: 'engine' },
  payout_model: { consumer: 'engine' },

  // ---- Commercial consommé ----
  price: { consumer: 'product', readIn: 'app/app/actions.ts' },

  // ---- Pas encore consommé : le comparateur public n'est pas construit ----
  price_regular: { consumer: 'planned', note: 'Prix barré — comparateur.' },
  activation_fee: { consumer: 'planned', note: 'Entre dans le prix TTC — comparateur (offer_total_price).' },
  is_recurring: { consumer: 'planned', note: 'Abonnement vs paiement unique — comparateur.' },
  vat_included: { consumer: 'planned', note: 'TVA UE — comparateur.' },
  max_minis: { consumer: 'planned', note: 'Limites de contrats — guide + comparateur.' },
  max_micros: { consumer: 'planned', note: 'Limites de contrats — guide + comparateur.' },
  funded_max_minis: { consumer: 'planned', note: 'Limites de contrats en financé — guide.' },
  funded_max_micros: { consumer: 'planned', note: 'Limites de contrats en financé — guide.' },
  payout_frequency_days: { consumer: 'planned', note: 'Fréquence de retrait — guide compte financé.' },
  payout_method: { consumer: 'planned', note: 'Rise, Workmarket… — guide compte financé.' },
  platforms: { consumer: 'planned', note: 'Slugs de plateformes — comparateur (filtre plateforme).' },
  reviewed_at: { consumer: 'planned', note: 'Date de vérification à afficher publiquement (§8 honnêteté).' },
};

/* ------------------------------------------------------------------ parsing */

function sqlText(): string {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
    .join('\n')
    /* Normalisation CRLF obligatoire : sous Windows, git restitue les fichiers
       en \r\n. Un `.` de regex ne franchit pas `\r` (terminateur de ligne), donc
       un motif ancré en fin de ligne cesse de matcher et le test devient flaky
       selon la façon dont le fichier a été écrit. */
    .replace(/\r\n/g, '\n');
}

const NON_COLUMN_TOKENS = new Set([
  'unique', 'primary', 'constraint', 'check', 'foreign', 'exclude',
]);

/** Colonnes déclarées dans `create table offers (...)`. */
function columnsFromCreate(sql: string): string[] {
  const start = sql.indexOf('create table offers (');
  if (start === -1) throw new Error('Table `offers` introuvable dans les migrations.');

  // Scan à profondeur de parenthèses pour trouver la fin du corps.
  let depth = 0;
  let bodyStart = -1;
  let i = start;
  for (; i < sql.length; i++) {
    if (sql[i] === '(') {
      depth++;
      if (depth === 1) bodyStart = i + 1;
    } else if (sql[i] === ')') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = sql.slice(bodyStart, i);

  const cols: string[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('--')) continue;
    const m = /^([a-z_][a-z0-9_]*)/.exec(line);
    if (!m) continue;
    if (NON_COLUMN_TOKENS.has(m[1])) continue;
    cols.push(m[1]);
  }
  return cols;
}

/** Retire les commentaires `--` : sinon chaque instruction traîne le bloc de
 *  commentaires qui la précède et l'ancre `^alter` ne matche jamais. */
function stripComments(sql: string): string {
  return sql
    .split('\n')
    // Sans ancre `$` : robuste même si un `\r` traîne en fin de ligne.
    .map((l) => l.replace(/--.*/, ''))
    .join('\n');
}

/** Colonnes ajoutées par `alter table offers ... add column`. */
function columnsFromAlters(sql: string): string[] {
  const cols: string[] = [];
  for (const stmt of stripComments(sql).split(';')) {
    const s = stmt.trim().toLowerCase();
    // `offers` strictement : ne doit pas capter `offer_payout_caps`.
    if (!/^alter\s+table\s+offers\b/.test(s)) continue;
    const re = /add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) cols.push(m[1]);
  }
  return cols;
}

function offerColumns(): string[] {
  const sql = sqlText();
  return [...new Set([...columnsFromCreate(sql), ...columnsFromAlters(sql)])];
}

/** Mot entier : `drawdown_type` ne doit PAS matcher dans `funded_drawdown_type`. */
function mentions(text: string, col: string): boolean {
  return new RegExp(`\\b${col}\\b`).test(text);
}

/** Champs de l'interface `OfferRuleRow` — ce que le snapshot déclare consommer. */
function offerRuleRowFields(snapshot: string): string[] {
  const start = snapshot.indexOf('export interface OfferRuleRow {');
  const end = snapshot.indexOf('}', start);
  const body = snapshot.slice(start, end);
  return [...body.matchAll(/^\s{2}([a-z_][a-z0-9_]*)\??:/gm)].map((m) => m[1]);
}

/* -------------------------------------------------------------------- tests */

describe('offers — aucune colonne écrite sans être lue', () => {
  const columns = offerColumns();
  const snapshot = readFileSync(SNAPSHOT, 'utf8');
  const journalActions = readFileSync(JOURNAL_ACTIONS, 'utf8');

  it('le parsing des migrations retrouve bien la table', () => {
    expect(columns.length).toBeGreaterThan(20);
    expect(columns).toContain('drawdown_type');
    expect(columns).toContain('reviewed_at'); // ajoutée par un ALTER
    expect(columns).not.toContain('min_profit'); // colonne d'offer_payout_caps
  });

  it('CHAQUE colonne de `offers` porte une intention déclarée', () => {
    const undeclared = columns.filter((c) => !(c in REGISTRY));
    expect(
      undeclared,
      `Colonnes non classées dans REGISTRY : ${undeclared.join(', ')}.\n` +
        'Ajoute-les avec leur consommateur. Une colonne qui porte une RÈGLE doit ' +
        'être `engine`, sinon elle sera saisie sans jamais être appliquée.',
    ).toEqual([]);
  });

  it('aucune entrée obsolète dans REGISTRY', () => {
    const stale = Object.keys(REGISTRY).filter((c) => !columns.includes(c));
    expect(stale, `Colonnes disparues du schéma : ${stale.join(', ')}`).toEqual([]);
  });

  it('chaque colonne `engine` est réellement lue par buildRulesSnapshot', () => {
    const declared = Object.entries(REGISTRY)
      .filter(([, e]) => e.consumer === 'engine')
      .map(([c]) => c);

    /* On exige une LECTURE réelle (`offer.x`), pas la simple déclaration du champ
       dans l'interface `OfferRuleRow` : déclarer sans utiliser est précisément la
       manière dont une colonne redevient morte sans qu'on le voie. */
    const dead = declared.filter((c) => !new RegExp(`offer\\.${c}\\b`).test(snapshot));
    expect(
      dead,
      `Déclarées « engine » mais jamais lues (\`offer.x\`) dans lib/journal/snapshot.ts : ${dead.join(', ')}.\n` +
        'C’est exactement le bug funded_drawdown_type : la colonne est saisie en ' +
        'admin, figée nulle part, donc jamais appliquée par le moteur.',
    ).toEqual([]);
  });

  it('chaque colonne `engine` est bien RÉCUPÉRÉE par le SELECT (OFFER_COLS)', () => {
    // Deuxième mode de panne, réel : le snapshot lit `offer.x` mais le SELECT ne
    // ramène pas la colonne → `undefined` en silence, aucune erreur.
    const m = /const OFFER_COLS\s*=\s*([\s\S]*?);/.exec(journalActions);
    expect(m, 'OFFER_COLS introuvable dans app/app/actions.ts').not.toBeNull();
    const selectClause = m![1];

    const declared = Object.entries(REGISTRY)
      .filter(([, e]) => e.consumer === 'engine')
      .map(([c]) => c);

    const missing = declared.filter((c) => !mentions(selectClause, c));
    expect(
      missing,
      `Déclarées « engine » mais absentes de OFFER_COLS : ${missing.join(', ')}.\n` +
        'Le snapshot les lirait à `undefined` — la règle serait silencieusement ignorée.',
    ).toEqual([]);
  });

  it('tout champ de `OfferRuleRow` est déclaré « engine » (registre non menteur)', () => {
    const fields = offerRuleRowFields(snapshot);
    expect(fields.length).toBeGreaterThan(10);

    const mislabelled = fields.filter((f) => REGISTRY[f]?.consumer !== 'engine');
    expect(
      mislabelled,
      `Lus par le snapshot mais non déclarés « engine » : ${mislabelled.join(', ')}`,
    ).toEqual([]);
  });

  it('chaque colonne `product` est lue dans le fichier déclaré', () => {
    for (const [col, entry] of Object.entries(REGISTRY)) {
      if (entry.consumer !== 'product') continue;
      expect(entry.readIn, `\`${col}\` : \`readIn\` manquant`).toBeTruthy();
      const text = readFileSync(join(ROOT, entry.readIn!), 'utf8');
      expect(mentions(text, col), `\`${col}\` absente de ${entry.readIn}`).toBe(true);
    }
  });

  /* Le schéma CSV (import/export admin) doit suivre le schéma DB. Il avait
     silencieusement dérivé : `drawdown_locks_at_breakeven` et `reviewed_at`
     manquaient, donc un import écrasait le verrou Apex/Tradovate et la date de
     vérification à la source — même famille que les colonnes mortes. */
  const CSV_EXEMPT: Record<string, string> = {
    id: 'Clé technique, jamais importée.',
    plan_id: 'Vient du contexte d’import (?plan=), pas du fichier.',
    created_at: 'Horodatage serveur.',
    updated_at: 'Horodatage serveur.',
  };

  it('le schéma CSV couvre toutes les colonnes importables', () => {
    const csvKeys = new Set(OFFER_COLUMNS.map((c) => c.key));
    const missing = columns.filter((c) => !csvKeys.has(c) && !(c in CSV_EXEMPT));
    expect(
      missing,
      `Colonnes de \`offers\` absentes de OFFER_COLUMNS : ${missing.join(', ')}.\n` +
        'Un import/export les perdrait en silence. Ajoute-les au schéma CSV, ou ' +
        'classe-les dans CSV_EXEMPT avec leur raison.',
    ).toEqual([]);
  });

  it('aucune colonne CSV fantôme (absente du schéma DB)', () => {
    const ghosts = OFFER_COLUMNS.map((c) => c.key).filter((k) => !columns.includes(k));
    expect(ghosts, `Colonnes CSV inexistantes en base : ${ghosts.join(', ')}`).toEqual([]);
  });

  it('toute colonne non consommée assume sa raison', () => {
    const silent = Object.entries(REGISTRY)
      .filter(([, e]) => (e.consumer === 'planned' || e.consumer === 'internal') && !e.note?.trim())
      .map(([c]) => c);
    expect(
      silent,
      `Sans justification : ${silent.join(', ')}. Une colonne non consommée doit ` +
        'dire où elle le sera, sinon on ne saura pas si c’est un choix ou un oubli.',
    ).toEqual([]);
  });
});
