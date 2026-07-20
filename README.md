# Tradawave — paquet de démarrage

Comparateur de prop firms futures + journal de trading gratuit.
Next.js (App Router) + Supabase. Bilingue FR/EN.

---

## Contenu

```
CLAUDE.md                          ← contexte projet, lu par Claude Code
README.md
supabase/migrations/
  0001_catalog.sql                 ← référentiels, firms/plans/offers, règles détaillées
  0002_product.sql                 ← journal, communauté, contenu, promos, créateur, RLS
lib/rules/
  types.ts
  futures-engine.ts                ← moteur pur : règles + payouts
  futures-engine.test.ts           ← 24 tests, tous verts
docs/
  design-tokens.css                ← palette et typo verrouillées
  homepage-reference.html          ← direction visuelle validée
```

Pas inclus : l'app Next.js (à créer), les composants, l'admin. C'est ce que tu construis
avec Claude Code.

---

## Setup

```bash
# 1. Projet
npx create-next-app@latest tradawave --typescript --tailwind --app
cd tradawave

# 2. Déposer CLAUDE.md, lib/, supabase/, docs/ à la racine

# 3. Dépendances
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest
```

`package.json` :
```json
{ "scripts": { "test": "vitest run", "test:watch": "vitest" } }
```

```bash
# 4. Supabase
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push        # ou coller les 2 SQL dans le SQL Editor, dans l'ordre

# 5. Vérifier le moteur
npm test                    # 24 tests
```

`.env.local` :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # serveur uniquement
```

Après ta première inscription :
```sql
update profiles set role = 'owner' where email = 'ton@email.com';
```

---

## Le point clé du modèle

On compare des **offres** (plan × taille), pas des firms. Les règles vivent sur l'offre.
La notation éditoriale vit sur le **plan** (Lucid Pro 9/10, Flex 10/10, Direct 7/10).

Le schéma couvre le niveau de détail du marché : commissions par classe d'actif, limites
de contrats minis/micros, scaling plans, buffers et plafonds de payout par cycle, règles de
style avec seuils, horaires, inactivité, pays restreints, plateformes et licences.

---

## Le moteur

```ts
import { evaluateAccount, evaluatePayout } from '@/lib/rules/futures-engine';

const r = evaluateAccount(rules, startingBalance, trades);
// → balance, drawdown, dailyLoss, profitTarget, consistency,
//   tradingDays, drawdownFloor, status, canPass, reasons

const p = evaluatePayout(payoutRules, start, balance, cycleTrades);
// → eligible, withdrawable, missing: { profitDays, cycleProfit, buffer }, blockers
```

Fonctions pures : ni réseau, ni DB. Utilisables serveur et client.

| Drawdown | Comportement |
|---|---|
| `STATIC` | plancher fixe |
| `EOD` | suit le plus haut de **clôture journalière** |
| `TRAIL` | suit le plus haut de la courbe, **intraday compris** (lock at breakeven) |

`evaluatePayout` répond à la question que personne n'outille : *« il te manque 2 jours de
profit et 340 $ »*.

---

## ⚠️ Données

Aucun seed de firms n'est fourni volontairement : les prix et règles doivent être
**saisis depuis les sources officielles** et datés (`reviewed_at`). Une donnée fausse
détruit le positionnement honnêteté, qui est le cœur du projet.

Les liens d'affiliation sont vides au départ. Tant que `affiliate_url` est `null`, le front
utilise `default_url`.

---

## Ordre suggéré

1. Client Supabase + middleware auth + rôles
2. Design tokens dans `globals.css`
3. Admin firms/plans/offers (avec duplication de plan et import CSV — prioritaires)
4. Journal : ajout de compte, saisie, jauges du moteur
5. Comparateur pré-rendu + filtres + presets
6. Guides en base + sections + modules interactifs
7. i18n FR/EN + hreflang + JSON-LD
8. Promos, avis, payout proofs
9. Import CSV des trades
10. Analytics et entonnoir

Le raisonnement complet est dans `CLAUDE.md`.
