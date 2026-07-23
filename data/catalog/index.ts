import type { FirmSeed } from '@/lib/seed/types';
import { topstep } from './firms/topstep';
import { apex } from './firms/apex';

/**
 * Collecte catalogue — photographie de juillet 2026.
 * Les prop firms bougent vite (Phidias, TradeDay et Apex ont refondu ces derniers
 * mois ; Alpha Futures a basculé le 2026-07-12) : ce fichier n'est pas une
 * vérité stable, c'est un instantané daté et revérifiable.
 */
export const FIRMS: readonly FirmSeed[] = [topstep, apex];
