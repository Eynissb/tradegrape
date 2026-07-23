/**
 * Playbook (B8) — couche descriptive au-dessus des tags `setup:`.
 *
 * Modèle « coexistence, reliés par le nom » : une définition de setup ne porte
 * pas de nom libre, elle référence un tag `setup:` prédéfini (`tagKey`). Sa
 * performance réelle n'est PAS recalculée ici — elle est lue depuis la
 * ventilation « Par setup » (`bySetup`) déjà produite par les analytics. Aucune
 * migration de tags, aucun recompte.
 *
 * Deux liens morts que l'interface DOIT signaler (exigence produit) :
 *  - un setup tradé mais sans définition  → `undocumented` (setup nouveau à écrire)
 *  - une définition jamais tradée          → `never_traded` (lien mort, aucune donnée)
 *
 * Module pur : ni réseau, ni DB.
 */

/** Définition structurée d'un setup, telle que stockée dans `journal_setups`. */
export interface SetupDefinition {
  tagKey: string; // "setup:breakout"
  entry: string;
  management: string;
  invalidation: string;
}

/** Performance d'un setup, extraite d'un bucket `bySetup`. */
export interface SetupPerf {
  entries: number;
  netPnl: number;
  winRate: number | null;
}

export type PlaybookStatus =
  | 'documented' // défini ET tradé — le cas nominal
  | 'undocumented' // tradé mais sans définition — à documenter
  | 'never_traded' // défini mais jamais tradé — lien mort
  | 'empty'; // ni défini ni tradé — emplacement libre

export interface PlaybookRow {
  key: string; // clé nue "breakout" (URL)
  tagKey: string; // "setup:breakout"
  label: string;
  definition: SetupDefinition | null;
  perf: SetupPerf | null;
  status: PlaybookStatus;
}

export interface Playbook {
  rows: PlaybookRow[];
  /** Nombre de setups tradés sans définition (à documenter). */
  undocumented: number;
  /** Nombre de définitions jamais tradées (liens morts). */
  neverTraded: number;
  /** Nombre de setups documentés et tradés. */
  documented: number;
}

/** Un bucket `bySetup` : sa `key` est la clé de tag complète ("setup:breakout"). */
interface SetupBucket {
  key: string;
  entries: number;
  netPnl: number;
  winRate: number | null;
}

// Ordre d'affichage : le cœur utile d'abord, puis les deux alertes, puis le vide.
const STATUS_RANK: Record<PlaybookStatus, number> = {
  documented: 0,
  undocumented: 1,
  never_traded: 2,
  empty: 3,
};

/**
 * Joint le catalogue de setups prédéfinis, les définitions saisies et les
 * buckets de performance. Produit une ligne par setup du catalogue.
 */
export function buildPlaybook(params: {
  catalog: readonly { key: string; label: string; tagKey: string }[];
  definitions: SetupDefinition[];
  buckets: SetupBucket[];
}): Playbook {
  const { catalog, definitions, buckets } = params;

  const defByTag = new Map(definitions.map((d) => [d.tagKey, d]));
  const bucketByTag = new Map(buckets.map((b) => [b.key, b]));

  const rows: PlaybookRow[] = catalog.map((s) => {
    const definition = defByTag.get(s.tagKey) ?? null;
    const bucket = bucketByTag.get(s.tagKey) ?? null;
    const perf: SetupPerf | null = bucket
      ? { entries: bucket.entries, netPnl: bucket.netPnl, winRate: bucket.winRate }
      : null;

    let status: PlaybookStatus;
    if (definition && perf) status = 'documented';
    else if (!definition && perf) status = 'undocumented';
    else if (definition && !perf) status = 'never_traded';
    else status = 'empty';

    return { key: s.key, tagKey: s.tagKey, label: s.label, definition, perf, status };
  });

  rows.sort((a, b) => {
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (r !== 0) return r;
    // Au sein d'un même état : le plus tradé d'abord, puis alpha.
    const ea = a.perf?.entries ?? 0;
    const eb = b.perf?.entries ?? 0;
    if (ea !== eb) return eb - ea;
    return a.label.localeCompare(b.label);
  });

  return {
    rows,
    undocumented: rows.filter((r) => r.status === 'undocumented').length,
    neverTraded: rows.filter((r) => r.status === 'never_traded').length,
    documented: rows.filter((r) => r.status === 'documented').length,
  };
}
