# Tradawave — Contexte projet

> Lu automatiquement par Claude Code. Contient les décisions déjà arbitrées.
> **Ne pas les remettre en question sans raison.**

---

## 1. Le produit

**Tradawave** = comparateur de prop firms futures **+ journal de trading gratuit**, dans une
seule application, adossé à une **présence créateur** (chaîne, Discord, lives).

**Modèle** : affiliation. Compare → journalise → achète/rachète via nos liens.

**Positionnement** : l'honnêteté et l'outil. Prix TTC réels, règles qui font échouer,
santé réelle des firms. Tri par fiabilité, jamais par commission.

**Phrase de marque** : « Ne choisis pas ta prop firm. Teste-la d'abord. »

### La boucle produit

```
Arrivée (SEO / chaîne / Discord)
  → compare les offres
  → ajoute une offre à son journal (règles auto-configurées)
  → journalise quotidiennement, le moteur montre sa position vs les règles
  → prêt à acheter / racheter → CTA vers affiliate_url (+ code promo)
  → sa firm le déçoit → il revient comparer (son historique est ici)
```

Une base unique alimente trois faces : comparateur public (SEO), journal authentifié, admin.

---

## 2. Décisions verrouillées

| Sujet | Décision |
|---|---|
| Nom | **Tradawave** (tradawave.com) |
| Marché v1 | **Futures**, schéma prêt pour forex/crypto |
| Langues | **FR + EN dès le départ** |
| Stack | **Next.js (App Router) + Supabase** |
| Comparateur | Pré-rendu **SSG/ISR** (SEO vital, YMYL) |
| Journal | App cliente authentifiée sous `/app` |
| Admin | Même app, `/admin`, 6 rôles |
| Guides | **En base**, bilingues, sections ancrables, versionnés |
| Journal | Gratuit, structure prête pour un tier premium |
| Import trades | CSV v1 (Tradovate, NinjaTrader…), API en v2 |
| Créateur | **Oui** — sessions live, actus, Discord, réseaux |

### Identité visuelle (verrouillée)

```css
--bg:#070510  --bg2:#0b0818
--card:rgba(28,20,48,.55)  --card-brd:rgba(150,110,240,.16)
--ink:#f2eefb  --ink2:#b6a8d4  --ink3:#7d6f9a
--c1:#5b3fff   /* indigo */
--c2:#c04bff   /* fuchsia */
--hot:#ff3ba6  /* magenta, ponctuation */
--lime:#38ffb0 --amber:#ffb43b --red:#ff4d5e   /* états */
--grad:linear-gradient(100deg,#5b3fff,#c04bff)
```

Dark glassmorphism vibrant : glows ambiants, cartes en verre, dégradés indigo→fuchsia.
Typo : Sora (titres 700-800), Inter (corps), JetBrains Mono (chiffres, `tabular-nums`).

**Jamais de bleu/cyan** — direction testée et rejetée.
Les **états** (ok/warning/danger) restent lime/amber/red, jamais l'accent de marque :
la lisibilité du risque prime sur l'esthétique.

---

## 3. Modèle de données

### Granularité : firm → plan → offer

On ne compare pas des firms, on compare des **offres** (≈100-150 lignes pour 13 firms).
Un trader achète un compte, pas une firme. **Les règles vivent sur l'offre** — le drawdown
d'un Topstep 50k ≠ celui du 100k.

```
firms ─┬─ plans ─── offers ─┬─ offer_payout_caps      (plafonds par cycle)
       │   (noté ici)       ├─ offer_scaling_steps    (contrats par palier)
       │                    ├─ offer_rule_versions    (historique + alertes)
       │                    └─ journal_accounts ── trades
       ├─ firm_platforms       (flux + licences offertes)
       ├─ firm_style_rules     (scalping, bots, DCA, news, bonds…)
       ├─ firm_commissions     (par classe d'actif)
       ├─ promo_codes
       ├─ firm_guides ─── guide_sections   (ancres + modules interactifs)
       ├─ reviews / payout_proofs
       └─ news_items
```

**La notation est au niveau du `plan`**, pas de la firm : Lucid Pro 9/10, Flex 10/10,
Direct 7/10. C'est ce que fait la référence du marché, et c'est plus juste.

### Ce qui doit être couvert par firm/offre

Prix + activation (**prix TTC = les deux**), TVA UE, drawdown (type + montant), objectif,
DLL, cohérence (% + jours), limites de contrats minis/micros, scaling plan en funded,
profit split, modèle de payout, buffer, plafonds par cycle, jours de profit requis + seuil
journalier, méthode de paiement, commissions par classe d'actif, plateformes et licences
offertes, règles de style avec seuils précis, horaires de clôture forcée, overnight/weekend,
inactivité, comptes max, pays restreints.

---

## 4. Le moteur de règles (avantage n°1)

Fonctions **pures**, sans réseau ni DB : `lib/rules/futures-engine.ts`. 24 tests.

**`evaluateAccount(rules, startingBalance, trades)`** → daily loss restant, plancher de
drawdown, progression objectif, cohérence, jours validés, statut global.

**`evaluatePayout(payoutRules, start, balance, cycleTrades)`** → éligibilité au retrait,
montant retirable, et surtout **ce qu'il manque** : « il te manque 2 jours de profit et
340 $ ». C'est le calcul que les concurrents documentent en prose sans jamais l'exécuter.

Types de drawdown : `STATIC` (fixe), `EOD` (plus haut de clôture journalière),
`TRAIL` (plus haut de la courbe, intraday compris, avec lock at breakeven).
**Le TRAIL est le piège n°1 des traders** — l'afficher clairement est notre plus grande
valeur produit.

---

## 5. Structure d'un guide firm

Sommaire à ancres en sidebar + barre de progression de lecture. Sections en base
(`guide_sections`), chacune pouvant porter un **module interactif** (`widget_key`).

```
Présentation
Évaluations          → une section par plan (Pro / Flex / Direct…)
Règles de trading    → Drawdown ▸ Cohérence ▸ News ▸ Horaires ▸ Comptes multiples
Styles autorisés     → Scalping ▸ Micro-scalping ▸ Bots ▸ DCA ▸ Bonds
Plateformes          → Flux de données ▸ Licences fournies
Instruments & frais  → Instruments ▸ Commissions ▸ Limites de contrats
Compte financé       → une section par plan (buffer, caps, conditions)
Verdict              → Pour/contre ▸ Public cible ▸ Note par plan
Bon à savoir         → Promotions ▸ Support ▸ Inactivité ▸ Pays restreints
FAQ                  → JSON-LD FAQPage
```

### Modules interactifs (notre différenciateur)

Là où la concurrence écrit un paragraphe, on met un outil :

| Section | `widget_key` | Ce qu'il fait |
|---|---|---|
| Drawdown | `rule_simulator` | simule des trades, montre le plancher bouger |
| Cohérence | `consistency_visualizer` | répartition des gains vs la règle |
| Commissions | `commission_calculator` | coût réel selon volume et instrument |
| Compte financé | `payout_calculator` | quand pourras-tu retirer, combien |
| Scaling | `scaling_simulator` | contrats débloqués selon les profits |
| Prix | `total_cost_calculator` | prix TTC + activation + commissions estimées |

Connectés au journal quand l'utilisateur est connecté : ses vrais chiffres, pas des exemples.

---

## 6. Périmètre au lancement

**Comparateur** — tableau des offres, filtres complets (type de compte, taille, activation,
drawdown, cohérence, DLL, plateforme, profit split, modèle de payout, buffer, sizing,
microscalping, news, bonds, prix max, note), presets rapides (« Budget < 100 $ »,
« Sans cohérence », « Débutant », « Meilleures notes »), comparaison côte à côte,
tri par health score.

**Filtres exclusifs** : *Health Score* (fiabilité opérateur — 55-65% des firms 2020-2023 ont
fermé ou suspendu les paiements) et *Compatible avec mon style* (piloté par le journal :
filtre les offres où l'utilisateur aurait survécu — impossible sans journal).

**Guides** — 13 firms, bilingues, structure ci-dessus, modules interactifs.

**Journal** — comptes multiples, saisie manuelle, import CSV, jauges temps réel, analytics
(win rate, expectancy, equity curve, par symbole / setup / heure / jour), suivi des payouts,
alertes changement de règles.

**Promos** — page dédiée (requête à haute intention), codes avec dates de fin et prix après
remise, copie en un clic, mise à jour quotidienne, badge « code exclusif » quand négocié.

**Communauté** — avis (badge *trader vérifié* si compte journal chez cette firm),
payout proofs modérés, Discord.

**Créateur** — sessions live, replays, actus, liens réseaux.

**Admin** — 6 rôles (`owner`, `admin`, `editor`, `moderator`, `analyst`, `user`), audit log,
CRUD firms/plans/offers avec **duplication de plan sur plusieurs tailles** et
**import/export CSV** (éditer 100+ offres à la main est infernal — ce sont des
fonctionnalités prioritaires, pas du confort), guides et sections, promos, modération,
analytics (entonnoir comparateur → journal → clic affilié), feature flags.

---

## 7. Stratégie concurrentielle

Le concurrent direct FR (mapropfirm.fr) a : 13 guides très détaillés testés personnellement,
un code promo exclusif négocié (-40 à -50% chez 4 firms), une audience YouTube/Kick/Discord,
et de l'autorité SEO. Ce sont de vraies douves.

**Ce qu'ils n'ont pas, structurellement** : aucun compte utilisateur, aucun journal, aucune
donnée du trader. Leur site est en lecture seule — on le consulte une fois, on part.

**Nos leviers** :
1. Le journal → rétention quotidienne, email capté, retour naturel
2. Les modules interactifs → on *exécute* les règles qu'ils *décrivent*
3. Le bilingue → ils sont FR only
4. La donnée propriétaire → dans un an : « X% des échecs sur cette offre viennent du
   trailing intraday ». Personne d'autre ne peut produire ça.
5. Les alertes de changement de règles → impossible sans journal

**Priorité business souvent sous-estimée** : négocier nos propres **codes promo** avec les
firms. Un visiteur qui voit -50% chez l'un et rien chez l'autre choisit vite. À demander dès
la signature du partenariat affilié.

---

## 8. Conventions

- TypeScript strict, pas de `any`.
- Le moteur de règles reste **pur** : ni réseau, ni DB.
- Server Components par défaut ; `'use client'` seulement si interactivité.
- Toutes les chaînes affichées passent par l'i18n **dès le premier jour**.
- Montants en `numeric` en DB, jamais de float dans les calculs de règles.
- RLS sur **toutes** les tables. Jamais de `service_role` côté client.
- `affiliate_url` nullable → fallback `default_url`. Remplir un lien = une ligne à éditer.
- Chaque donnée de règle affichée doit être **vérifiée à la source** et datée
  (`reviewed_at`). Les prop firms changent souvent : une donnée fausse détruit le
  positionnement honnêteté.

---

## 9. Ce qu'on ne fait PAS

- Pas de faux compteurs, fausse urgence, faux « live ».
- Pas de tri par commission.
- Pas de copie du contenu concurrent. Les règles sont des faits publics à vérifier à la
  source ; les textes sont à écrire nous-mêmes.
- Pas de tics d'IA dans les guides : pas de « il convient de noter », pas de « dans le
  paysage en constante évolution », pas d'enfilade de tournures creuses. Ton direct,
  phrases courtes, chiffres concrets. Un guide doit se lire comme écrit par un trader.
- Pas de promesse de gain. ~14% passent un challenge, ~7% touchent un payout : on le dit.
