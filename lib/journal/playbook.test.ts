import { describe, expect, it } from 'vitest';
import { buildPlaybook, type SetupDefinition } from './playbook';

const CATALOG = [
  { key: 'breakout', label: 'Breakout', tagKey: 'setup:breakout' },
  { key: 'pullback', label: 'Pullback', tagKey: 'setup:pullback' },
  { key: 'range', label: 'Range', tagKey: 'setup:range' },
];

function def(tagKey: string): SetupDefinition {
  return { tagKey, entry: 'e', management: 'm', invalidation: 'i' };
}

function bucket(key: string, entries: number, netPnl: number, winRate: number | null) {
  return { key, entries, netPnl, winRate };
}

describe('buildPlaybook — états du lien setup ↔ définition', () => {
  it('défini ET tradé → documented, avec la perf du bucket', () => {
    const pb = buildPlaybook({
      catalog: CATALOG,
      definitions: [def('setup:breakout')],
      buckets: [bucket('setup:breakout', 12, 480.5, 58)],
    });
    const row = pb.rows.find((r) => r.key === 'breakout')!;
    expect(row.status).toBe('documented');
    expect(row.perf).toEqual({ entries: 12, netPnl: 480.5, winRate: 58 });
    expect(row.definition).not.toBeNull();
    expect(pb.documented).toBe(1);
  });

  it('tradé mais SANS définition → undocumented (setup nouveau à documenter)', () => {
    const pb = buildPlaybook({
      catalog: CATALOG,
      definitions: [],
      buckets: [bucket('setup:pullback', 5, -120, 40)],
    });
    const row = pb.rows.find((r) => r.key === 'pullback')!;
    expect(row.status).toBe('undocumented');
    expect(row.perf).not.toBeNull();
    expect(row.definition).toBeNull();
    expect(pb.undocumented).toBe(1);
  });

  it('défini mais JAMAIS tradé → never_traded (lien mort, aucune donnée)', () => {
    const pb = buildPlaybook({
      catalog: CATALOG,
      definitions: [def('setup:range')],
      buckets: [],
    });
    const row = pb.rows.find((r) => r.key === 'range')!;
    expect(row.status).toBe('never_traded');
    expect(row.perf).toBeNull();
    expect(row.definition).not.toBeNull();
    expect(pb.neverTraded).toBe(1);
  });

  it('ni défini ni tradé → empty (emplacement libre, pas une alerte)', () => {
    const pb = buildPlaybook({ catalog: CATALOG, definitions: [], buckets: [] });
    for (const row of pb.rows) expect(row.status).toBe('empty');
    expect(pb.undocumented).toBe(0);
    expect(pb.neverTraded).toBe(0);
    expect(pb.documented).toBe(0);
  });

  it('produit une ligne par setup du catalogue, ordre : documenté → à documenter → lien mort → vide', () => {
    const pb = buildPlaybook({
      catalog: CATALOG,
      definitions: [def('setup:range'), def('setup:breakout')], // range défini mais pas tradé
      buckets: [bucket('setup:breakout', 3, 90, 66), bucket('setup:pullback', 8, 200, 50)],
    });
    expect(pb.rows).toHaveLength(3);
    expect(pb.rows.map((r) => r.status)).toEqual(['documented', 'undocumented', 'never_traded']);
    expect(pb.rows.map((r) => r.key)).toEqual(['breakout', 'pullback', 'range']);
  });

  it('à état égal, trie par nombre d’entrées décroissant', () => {
    const pb = buildPlaybook({
      catalog: CATALOG,
      definitions: [],
      buckets: [bucket('setup:breakout', 2, 10, null), bucket('setup:pullback', 9, 10, null)],
    });
    const undoc = pb.rows.filter((r) => r.status === 'undocumented');
    expect(undoc.map((r) => r.key)).toEqual(['pullback', 'breakout']);
  });
});
