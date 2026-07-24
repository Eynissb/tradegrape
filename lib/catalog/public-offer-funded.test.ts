import { describe, expect, it } from 'vitest';
import {
  toPublicOffer,
  filterOffers,
  sortOffers,
  buildCompareRows,
  toggleCompare,
  COMPARE_MAX,
  COMPARE_ROW_KEYS,
} from './public-offer';
import { row, cap } from './offer-row.fixture';

/**
 * Phase financée et comparaison côte à côte.
 *
 * L'enjeu de ce fichier : l'onglet « Compte financé » ne doit JAMAIS afficher
 * une règle d'évaluation en la faisant passer pour une règle de retrait. C'est
 * précisément ce que fait le concurrent avec sa colonne « Cohérence » unique.
 */

/* ------------------------------------------------------------------------- */
/* Abonnement mensuel : le total n'est qu'un plancher                          */
/* ------------------------------------------------------------------------- */

describe('abonnement — le total n’est pas un prix mensuel', () => {
  it('marque le total comme plancher quand le prix est mensuel ET qu’il y a une activation', () => {
    // Cas Bulenox 250k : 535 $/mois jusqu'à validation, puis 898 $ d'activation.
    const o = toPublicOffer(row({ price: 535, activation_fee: 898, is_recurring: true }));
    expect(o.totalPrice).toEqual({ known: true, value: 1_433 });
    expect(o.totalPriceIsFloor).toBe(true);
  });

  it('ne marque PAS de plancher pour un paiement unique', () => {
    const o = toPublicOffer(row({ price: 150, activation_fee: 130, is_recurring: false }));
    expect(o.totalPriceIsFloor).toBe(false);
  });

  it('ne marque pas de plancher pour un abonnement SANS activation : le total est le mois', () => {
    const o = toPublicOffer(row({ price: 165, activation_fee: 0, is_recurring: true }));
    expect(o.totalPriceIsFloor).toBe(false);
    expect(o.totalPrice).toEqual({ known: true, value: 165 });
  });

  it('un prix inconnu ne peut pas être un plancher', () => {
    const o = toPublicOffer(row({ price: null, activation_fee: 898, is_recurring: true }));
    expect(o.totalPriceIsFloor).toBe(false);
  });
});

/* ------------------------------------------------------------------------- */
/* Résolution des règles de la phase financée                                 */
/* ------------------------------------------------------------------------- */

describe('vue financée — résolution des règles de la phase', () => {
  it('reprend les règles d’évaluation quand rien n’est durci', () => {
    const o = toPublicOffer(row({ drawdown_type: 'EOD', drawdown_amount: 2_000 }));
    expect(o.funded.drawdown).toEqual({ type: 'EOD', amount: 2_000 });
    expect(o.fundedHardening.differs).toBe(false);
  });

  it('bascule sur le drawdown financé quand il diffère (cas TPT : EOD → TRAIL)', () => {
    const o = toPublicOffer(
      row({
        drawdown_type: 'EOD',
        drawdown_amount: 2_000,
        funded_drawdown_type: 'TRAIL',
        funded_drawdown_amount: 1_500,
      }),
    );
    // L'onglet évaluation garde EOD 2 000, l'onglet financé montre TRAIL 1 500.
    expect(o.drawdown).toMatchObject({ type: 'EOD', amount: 2_000 });
    expect(o.funded.drawdown).toEqual({ type: 'TRAIL', amount: 1_500 });
    expect(o.fundedHardening.differs).toBe(true);
  });

  it('garde le montant d’évaluation si seul le TYPE change', () => {
    const o = toPublicOffer(
      row({ drawdown_amount: 2_000, funded_drawdown_type: 'TRAIL', funded_drawdown_amount: null }),
    );
    expect(o.funded.drawdown).toEqual({ type: 'TRAIL', amount: 2_000 });
  });

  it('sépare la cohérence d’évaluation de celle du retrait', () => {
    const o = toPublicOffer(row({ consistency_pct: null, funded_consistency_pct: 30 }));
    expect(o.hasConsistency).toBe(false);
    expect(o.funded.hasConsistency).toBe(true);
    expect(o.funded.consistencyPct).toBe(30);
  });

  it('une cohérence à 100 % ne contraint rien, dans les deux phases', () => {
    const o = toPublicOffer(row({ consistency_pct: 100, funded_consistency_pct: 100 }));
    expect(o.hasConsistency).toBe(false);
    expect(o.funded.hasConsistency).toBe(false);
  });
});

/* ------------------------------------------------------------------------- */
/* Plafonds de retrait                                                        */
/* ------------------------------------------------------------------------- */

describe('plafonds de retrait', () => {
  it('sans ligne de plafond, le plafond est INCONNU — jamais « illimité »', () => {
    const o = toPublicOffer(row({ payout_caps: [] }));
    expect(o.funded.firstCap).toEqual({ known: false, reason: 'not_collected' });
  });

  it('le modèle « unlimited » autorise seul à dire qu’il n’y a pas de plafond', () => {
    const o = toPublicOffer(row({ payout_model: 'unlimited', payout_caps: [] }));
    expect(o.funded.firstCap).toEqual({ known: true, value: null });
  });

  it('prend le plafond du PREMIER cycle même si les lignes arrivent en désordre', () => {
    const o = toPublicOffer(
      row({
        payout_caps: [
          cap({ cycle_from: 3, max_amount: 5_000 }),
          cap({ cycle_from: 1, cycle_to: 2, max_amount: 2_000 }),
        ],
      }),
    );
    expect(o.funded.firstCap).toEqual({ known: true, value: 2_000 });
    expect(o.funded.capVaries).toBe(true);
  });

  it('un plafond constant n’est pas signalé comme variable', () => {
    const o = toPublicOffer(row({ payout_caps: [cap({ max_amount: 2_000 })] }));
    expect(o.funded.capVaries).toBe(false);
  });

  it('deux chemins de payout ne se lisent pas comme un plafond qui varie', () => {
    /* Cas Topstep (§12 #5) : Standard 2 000 OU Consistency 3 000 au 1er cycle.
       Sans le regroupement par variante, la comparaison des deux branches
       produirait un faux « le plafond varie » qui n'est qu'un artefact. */
    const o = toPublicOffer(
      row({
        payout_caps: [
          cap({ variant: 'standard', max_amount: 2_000 }),
          cap({ variant: 'consistency', max_amount: 3_000 }),
        ],
      }),
    );
    expect(o.funded.payoutVariants).toEqual(['standard', 'consistency']);
    expect(o.funded.firstCap).toEqual({ known: true, value: 2_000 });
    expect(o.funded.capVaries).toBe(false);
  });

  it('remonte les paliers de split quand la firm en a plusieurs', () => {
    // Cas TradeDay QuickPay : 50/50 sous 4 000 $, puis 80/20.
    const o = toPublicOffer(
      row({
        payout_caps: [
          cap({ cycle_from: 1, cycle_to: 1, split_pct: 50 }),
          cap({ cycle_from: 2, split_pct: 80 }),
        ],
      }),
    );
    expect(o.funded.splitTiers).toEqual([
      { fromCycle: 1, splitPct: 50 },
      { fromCycle: 2, splitPct: 80 },
    ]);
  });

  it('un split unique ne produit pas de paliers', () => {
    const o = toPublicOffer(row({ profit_split: 90 }));
    expect(o.funded.splitTiers).toEqual([]);
    expect(o.funded.profitSplit).toBe(90);
  });

  it('la cohérence du premier cycle prime sur la cohérence funded scalaire', () => {
    // Cas Tradeify Lightning (§12 #4) : 20 % au 1er payout, 25 %, puis 30 %.
    const o = toPublicOffer(
      row({
        funded_consistency_pct: 30,
        payout_caps: [cap({ cycle_from: 1, cycle_to: 1, consistency_pct: 20 })],
      }),
    );
    expect(o.funded.consistencyPct).toBe(20);
  });

  it('les jours de profit du cycle priment sur `payout_min_days`', () => {
    const o = toPublicOffer(
      row({ payout_min_days: 10, payout_caps: [cap({ min_profit_days: 5 })] }),
    );
    expect(o.funded.minProfitDays).toBe(5);
  });
});

/* ------------------------------------------------------------------------- */
/* Filtres de phase financée                                                  */
/* ------------------------------------------------------------------------- */

describe('filtres de phase financée', () => {
  it('le filtre de drawdown financé n’est PAS un alias de celui d’évaluation', () => {
    // TPT : EOD en éval, TRAIL une fois financé. Un filtre unique mentirait.
    const tpt = toPublicOffer(
      row({ id: 'tpt', drawdown_type: 'EOD', funded_drawdown_type: 'TRAIL' }),
    );
    const stable = toPublicOffer(row({ id: 'stable', drawdown_type: 'EOD' }));
    expect(filterOffers([tpt, stable], { drawdownTypes: ['EOD'] }).map((o) => o.id)).toEqual([
      'tpt',
      'stable',
    ]);
    expect(filterOffers([tpt, stable], { fundedDrawdownTypes: ['EOD'] }).map((o) => o.id)).toEqual([
      'stable',
    ]);
  });

  it('écarte les offres dont le split est inconnu — un seuil ne se satisfait pas d’un vide', () => {
    const mk = (id: string, s: number | null) => toPublicOffer(row({ id, profit_split: s }));
    const kept = filterOffers([mk('a', 90), mk('b', 80), mk('c', null)], { minProfitSplit: 85 });
    expect(kept.map((o) => o.id)).toEqual(['a']);
  });

  it('filtre la cohérence AU RETRAIT, pas celle de l’évaluation', () => {
    const evalOnly = toPublicOffer(row({ id: 'a', consistency_pct: 40, funded_consistency_pct: null }));
    const fundedOnly = toPublicOffer(row({ id: 'b', consistency_pct: null, funded_consistency_pct: 30 }));
    const kept = filterOffers([evalOnly, fundedOnly], { noFundedConsistency: true });
    expect(kept.map((o) => o.id)).toEqual(['a']);
  });

  it('« news autorisées » n’exclut que l’interdiction franche', () => {
    const mk = (id: string, stance: 'allowed' | 'restricted' | 'forbidden' | 'monitored' | null) =>
      toPublicOffer(row({ id, news_stance: stance }));
    const kept = filterOffers(
      [mk('a', 'allowed'), mk('b', 'restricted'), mk('c', 'forbidden'), mk('d', null)],
      { newsAllowed: true },
    );
    // `null` = posture non collectée : ne pas la lire comme une interdiction.
    expect(kept.map((o) => o.id)).toEqual(['a', 'b', 'd']);
  });

  it('écarte une fréquence de retrait inconnue quand un délai maximum est demandé', () => {
    const mk = (id: string, days: number | null) =>
      toPublicOffer(row({ id, payout_frequency_days: days }));
    const kept = filterOffers([mk('a', 7), mk('b', 30), mk('c', null)], {
      maxPayoutFrequencyDays: 14,
    });
    expect(kept.map((o) => o.id)).toEqual(['a']);
  });
});

describe('tri par split', () => {
  it('classe du plus généreux au moins généreux, inconnus en dernier', () => {
    const mk = (id: string, s: number | null) => toPublicOffer(row({ id, profit_split: s }));
    const sorted = sortOffers([mk('a', 80), mk('b', null), mk('c', 100)], 'split');
    expect(sorted.map((o) => o.id)).toEqual(['c', 'a', 'b']);
  });
});

/* ------------------------------------------------------------------------- */
/* Comparaison côte à côte                                                    */
/* ------------------------------------------------------------------------- */

describe('sélection pour comparaison', () => {
  it('ajoute, retire, et refuse au-delà de quatre', () => {
    let sel: string[] = [];
    for (const id of ['a', 'b', 'c', 'd', 'e']) sel = toggleCompare(sel, id);
    expect(sel).toEqual(['a', 'b', 'c', 'd']);
    expect(sel.length).toBe(COMPARE_MAX);
    expect(toggleCompare(sel, 'b')).toEqual(['a', 'c', 'd']);
  });

  it('une offre déjà sélectionnée peut toujours être retirée, même à la limite', () => {
    expect(toggleCompare(['a', 'b', 'c', 'd'], 'd')).toEqual(['a', 'b', 'c']);
  });
});

describe('lignes de comparaison', () => {
  const fmt = {
    num: (v: number) => String(v),
    money: (v: number, c: string) => `${v} ${c}`,
    floor: (t: string) => `à partir de ${t}`,
    varies: (t: string) => `${t}, puis davantage`,
    stance: (s: string) => `[${s}]`,
  };

  it('marque comme différentes les seules lignes qui divergent', () => {
    const a = toPublicOffer(row({ id: 'a', price: 150, activation_fee: 130, drawdown_amount: 2_000 }));
    const b = toPublicOffer(row({ id: 'b', price: 170, activation_fee: 130, drawdown_amount: 2_000 }));
    const rows = buildCompareRows([a, b], fmt);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.totalPrice.differs).toBe(true);
    expect(byKey.activation.differs).toBe(false);
    expect(byKey.drawdown.differs).toBe(false);
  });

  it('deux inconnus se valent : la ligne ne diverge pas', () => {
    const a = toPublicOffer(row({ id: 'a', price: null }));
    const b = toPublicOffer(row({ id: 'b', price: null }));
    const rows = buildCompareRows([a, b], fmt);
    const price = rows.find((r) => r.key === 'price');
    expect(price?.cells.every((c) => c.kind === 'unknown')).toBe(true);
    expect(price?.differs).toBe(false);
  });

  it('distingue « ne s’applique pas » de « inconnu »', () => {
    // Activation à 0 = il n'y en a pas ; plafond non collecté = on ne sait pas.
    const o = toPublicOffer(row({ activation_fee: 0, payout_caps: [] }));
    const rows = buildCompareRows([o, o], fmt);
    expect(rows.find((r) => r.key === 'activation')?.cells[0]).toEqual({ kind: 'none' });
    expect(rows.find((r) => r.key === 'firstCap')?.cells[0]).toEqual({ kind: 'unknown' });
  });

  it('n’expose jamais une valeur d’enum brute : la posture news est traduite', () => {
    const o = toPublicOffer(row({ news_stance: 'restricted' }));
    const cell = buildCompareRows([o, o], fmt).find((r) => r.key === 'news')?.cells[0];
    expect(cell).toEqual({ kind: 'value', text: '[restricted]', tone: 'warn' });
  });

  it('une cohérence à 100 % se lit « sans objet », pas comme une contrainte', () => {
    const o = toPublicOffer(row({ consistency_pct: 100, funded_consistency_pct: 100 }));
    const rows = buildCompareRows([o, o], fmt);
    expect(rows.find((r) => r.key === 'consistency')?.cells[0]).toEqual({ kind: 'none' });
    expect(rows.find((r) => r.key === 'fundedConsistency')?.cells[0]).toEqual({ kind: 'none' });
  });

  it('enrobe le total d’un abonnement plutôt que de le donner comme un prix ferme', () => {
    const o = toPublicOffer(row({ price: 535, activation_fee: 898, is_recurring: true }));
    const cell = buildCompareRows([o, o], fmt).find((r) => r.key === 'totalPrice')?.cells[0];
    expect(cell).toEqual({ kind: 'value', text: 'à partir de 1433 USD', tone: undefined });
  });

  it('signale le durcissement en financé comme une divergence lisible', () => {
    const soft = toPublicOffer(row({ id: 'a' }));
    const hard = toPublicOffer(
      row({ id: 'b', drawdown_type: 'EOD', funded_drawdown_type: 'TRAIL' }),
    );
    const rows = buildCompareRows([soft, hard], fmt);
    const h = rows.find((r) => r.key === 'hardening');
    expect(h?.differs).toBe(true);
    expect(h?.cells).toEqual([
      { kind: 'value', text: 'inchangées', tone: 'ok' },
      { kind: 'value', text: 'EOD → TRAIL', tone: 'bad' },
    ]);
  });

  it('rend exactement les lignes déclarées, dans l’ordre déclaré', () => {
    // Garde-fou : une ligne ajoutée sans être déclarée n'aurait pas de libellé.
    const o = toPublicOffer(row());
    expect(buildCompareRows([o, o], fmt).map((r) => r.key)).toEqual([...COMPARE_ROW_KEYS]);
  });

  it('couvre les quatre phases, sans mélanger évaluation et retrait', () => {
    const o = toPublicOffer(row());
    const rows = buildCompareRows([o, o], fmt);
    expect(new Set(rows.map((r) => r.phase))).toEqual(new Set(['price', 'eval', 'funded', 'trust']));
    // La cohérence apparaît DEUX fois, une par phase — c'est tout l'intérêt.
    expect(rows.filter((r) => r.key.toLowerCase().includes('consistency')).map((r) => r.phase))
      .toEqual(['eval', 'funded']);
  });
});
