import { describe, expect, it } from 'vitest';
import { classifySymbol, rootSymbol } from './asset-class';

describe('rootSymbol', () => {
  it('retire le code d’échéance', () => {
    expect(rootSymbol('MNQU6')).toBe('MNQ');
    expect(rootSymbol('ESZ5')).toBe('ES');
    expect(rootSymbol('6EU6')).toBe('6E');
    expect(rootSymbol('M2KU6')).toBe('M2K');
    expect(rootSymbol('MCLF7')).toBe('MCL');
  });
  it('laisse une racine sans échéance intacte', () => {
    expect(rootSymbol('ES')).toBe('ES');
    expect(rootSymbol('M2K')).toBe('M2K'); // K n’est pas suivi d’un chiffre
  });
});

describe('classifySymbol', () => {
  it('classe les indices et micro-indices', () => {
    expect(classifySymbol('MNQU6')).toBe('micro_indices');
    expect(classifySymbol('ES')).toBe('indices');
    expect(classifySymbol('NQZ5')).toBe('indices');
    expect(classifySymbol('MESU6')).toBe('micro_indices');
    expect(classifySymbol('M2KU6')).toBe('micro_indices');
  });
  it('ne confond pas MES avec ES', () => {
    expect(classifySymbol('MESU6')).toBe('micro_indices');
    expect(classifySymbol('ESU6')).toBe('indices');
  });
  it('énergie, métaux, devises, obligations, agricoles', () => {
    expect(classifySymbol('CLF7')).toBe('energy');
    expect(classifySymbol('MCLF7')).toBe('micro_energy');
    expect(classifySymbol('GCZ6')).toBe('metals');
    expect(classifySymbol('MGCZ6')).toBe('micro_metals');
    expect(classifySymbol('6EU6')).toBe('currencies');
    expect(classifySymbol('ZBH6')).toBe('bonds');
    expect(classifySymbol('ZCH6')).toBe('agri');
  });
  it('inconnu → null (à cartographier en admin)', () => {
    expect(classifySymbol('XYZ')).toBeNull();
    expect(classifySymbol('')).toBeNull();
  });
  it('overrides admin complètent la table', () => {
    expect(classifySymbol('RBF7', { RB: 'energy' })).toBe('energy');
  });
});
