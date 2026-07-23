import type { FirmSeed } from '@/lib/seed/types';
import { topstep } from './firms/topstep';
import { lucid } from './firms/lucid';
import { tradeify } from './firms/tradeify';
import { apex } from './firms/apex';
import { takeProfitTrader } from './firms/take-profit-trader';
import { phidias } from './firms/phidias';
import { tradeday } from './firms/tradeday';
import { ffn } from './firms/ffn';
import { bulenox } from './firms/bulenox';
import { myFundedFutures } from './firms/my-funded-futures';
import { alphaFutures } from './firms/alpha-futures';
import { fundednext } from './firms/fundednext';
import { yrm } from './firms/yrm';

/**
 * Collecte catalogue — PHOTOGRAPHIE du 2026-07-21, pas une vérité stable.
 *
 * Les prop firms bougent vite : Phidias (2.0, fin avril), TradeDay (2.0, juin)
 * et Apex ont refondu leurs offres ces derniers mois, et Alpha Futures a basculé
 * le 2026-07-12. Chaque offre porte sa confiance ; celles dont les RÈGLES n'ont
 * pas été vérifiées à la source reçoivent `reviewed_at = null` et constituent
 * la file de travail : `select … from offers where reviewed_at is null`.
 */
export const FIRMS: readonly FirmSeed[] = [
  topstep,
  lucid,
  tradeify,
  apex,
  takeProfitTrader,
  phidias,
  tradeday,
  ffn,
  bulenox,
  myFundedFutures,
  alphaFutures,
  fundednext,
  yrm,
];
