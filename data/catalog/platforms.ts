/**
 * Catalogue des plateformes et flux de données.
 *
 * La collecte les nomme en clair et parfois groupées (« Tradovate/NT » = deux
 * produits distincts) : on normalise ici en slugs, source unique pour
 * `platforms`, `firm_platforms` et `offers.platforms`.
 */

export interface PlatformSeed {
  slug: string;
  name: string;
  /** Flux de données plutôt que plateforme de trading. */
  is_datafeed?: boolean;
}

export const PLATFORMS: readonly PlatformSeed[] = [
  { slug: 'tradovate', name: 'Tradovate' },
  { slug: 'ninjatrader', name: 'NinjaTrader' },
  { slug: 'tradingview', name: 'TradingView' },
  { slug: 'quantower', name: 'Quantower' },
  { slug: 'atas', name: 'ATAS' },
  { slug: 'volumetrica', name: 'Volumetrica' },
  { slug: 'tradesea', name: 'Tradesea' },
  { slug: 'deepcharts', name: 'DeepCharts' },
  { slug: 'tigertrade', name: 'Tiger.com (TigerTrade)' },
  { slug: 'wealthcharts', name: 'WealthCharts' },
  // Plateformes maison
  { slug: 'topstepx', name: 'TopstepX' },
  { slug: 'alphatrader', name: 'AlphaTrader' },
  // Flux de données
  { slug: 'rithmic', name: 'Rithmic', is_datafeed: true },
  { slug: 'dxfeed', name: 'DXfeed', is_datafeed: true },
];

export const PLATFORM_SLUGS = PLATFORMS.map((p) => p.slug);
