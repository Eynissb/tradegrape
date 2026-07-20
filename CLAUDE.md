# Tradegrape — Contexte projet

> Lu automatiquement par Claude Code. Contient les décisions déjà arbitrées.
> **Ne pas les remettre en question sans raison.**

---

## 1. Le produit

**Tradegrape** = comparateur de prop firms futures **+ journal de trading gratuit**, dans une
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
| Nom | **Tradegrape** (tradegrape.com) |
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

---

## 10. Automatisation

> Spec d'architecture à garder en tête pendant la construction. **Ne pas coder ces jobs
> maintenant** — mais ne rien concevoir qui les bloque plus tard.

**Principe.** Tradegrape doit être le plus automatisé possible. Toute donnée qui change
régulièrement a un **chemin de mise à jour automatique**, avec **validation humaine avant
publication** dès que l'erreur coûte cher.

**Règle d'or.** L'automatisation **alerte et propose**, l'humain **valide ce qui est
publié**. Une donnée fausse détruit le positionnement honnêteté, qui est le cœur du projet.

### Jobs à prévoir

Supabase Edge Functions planifiées ou cron Vercel.

| Job | Fréquence | Rôle |
|---|---|---|
| `sync-prices` | quotidien | Visite les pages tarifaires des firms, extrait prix + frais d'activation, compare à la base. Écart → entrée dans `data_alerts` (ancienne/nouvelle valeur + source). **Ne publie jamais directement.** |
| `sync-promos` | quotidien | Détecte codes promo expirés/modifiés, met à jour `promo_codes.is_active`, alerte sur les nouveaux codes repérés. |
| `compute-health-scores` | hebdo | Recalcule `firms.health_score` : ancienneté, nb de changements de règles sur 90 j (`offer_rule_versions`), payout proofs vérifiés + délais moyens, note Trustpilot. Détail dans `health_breakdown`. |
| `sync-trustpilot` | hebdo | Met à jour note et nombre d'avis. |
| `generate-stats` | quotidien | Agrège le journal **anonymisé** : taux d'échec par offre, règle la plus souvent cassée, temps moyen de passage. Alimente des pages de contenu automatiques. |
| `check-firm-health` | quotidien | Détecte les signaux d'alerte (site inaccessible, délais de payout qui s'allongent, pic de reviews négatives) et notifie le staff. |
| `digest-emails` | hebdo | Résumé personnalisé aux utilisateurs du journal : progression, alertes de règles, promos pertinentes. |

### Table tampon — `data_alerts`

Le tampon entre l'automatisation et la publication. Rien passe en prod sans revue.

```
source_table   text        -- ex "offers"
record_id      uuid
field          text        -- ex "price"
old_value      text
new_value      text
source_url     text        -- d'où vient la valeur détectée
detected_at    timestamptz
status         text         -- pending | applied | dismissed
reviewed_by    uuid references profiles(id)
```

### Contenu programmatique

Pages **générées depuis la base et régénérées à chaque changement de données (ISR)** :
comparatifs deux à deux, classements par critère, « moins cher du mois ».

Le contenu **éditorial** (guides, verdicts) reste **écrit à la main**. L'IA visible dans les
guides est un défaut de la concurrence, pas un modèle à suivre (cf. §9).

---

## 11. Journal (pièce maîtresse)

> Périmètre v1 complet à garder en tête. Livré en **3 tranches** pour validation au fur et
> à mesure. Objectif : meilleur que TradeZella, Tradervue, Edgewonk — **parce qu'eux ne sont
> pas pensés pour les prop firms**. C'est le levier de rétention n°1 et la source de la
> donnée propriétaire (filtre « compatible avec mon style », stats d'échec par offre).

**Calculs de règles : toujours via `lib/rules/futures-engine.ts`.** Ne jamais réimplémenter
le drawdown, le payout ou la cohérence ailleurs. `evaluateAccount(rules, start, trades)` et
`evaluatePayout(payout, start, balance, cycleTrades)`.

### Modèle de données — deux granularités dans `trades`

La table `trades` accepte les deux niveaux dans une seule table :
- **Entrée journalière** : `trade_date` + `pnl`, champs `symbol`/`entry_price`/`exit_price`
  vides (`symbol = ''`). C'est le mode par défaut.
- **Trade détaillé** : symbole, direction, quantité, entrée/sortie, durée, tags, notes.

Le moteur ne lit que `tradeDate`, `closedAt`, `pnl`, `fees` → les deux granularités le
nourrissent indifféremment. `rules_snapshot` (jsonb sur `journal_accounts`) fige les règles
de l'offre à l'ajout : l'offre peut changer ensuite, le compte garde ses règles + une alerte.

**Concevoir les analytics et le module « ailleurs » dès le modèle**, même non codés.

### Périmètre complet

**Socle prop firm** — jauges de règles temps réel, compteur de payout avec *ce qu'il manque*,
alertes de changement de règles (`rules_changed_at` vs `rules_ack_at`), multi-comptes.

**Saisie** — P&L journalier par défaut, trade détaillé en option, **édition et suppression
d'une entrée** (clic sur la ligne → formulaire pré-rempli → le moteur recalcule aussitôt),
import CSV Tradovate/NinjaTrader/Rithmic, tags prédéfinis en **3 familles** (setup, émotion,
erreur), notes, screenshots.

**Vue calendrier (vue principale du journal)** — grille mensuelle, un jour par case, en haut
de la page compte. Par case : P&L du jour (fond vert/rouge, **intensité ∝ montant**), nombre
de trades ; total par semaine sur le côté ; navigation mois précédent / suivant ; clic sur un
jour → détail des entrées du jour. **Ce que les concurrents n'ont pas, superposé au
calendrier** : marquer les jours où le **daily loss** a été approché/dépassé, les **jours de
trading validés**, et surtout **le jour qui casse la cohérence** (celui qui pèse trop dans le
profit total) — le calendrier doit montrer d'un coup d'œil quel jour est responsable.

**Analytics** — courbe d'équité **avec le plancher de drawdown superposé**, win rate,
expectancy, R moyen, perf par symbole / heure / jour de semaine / setup / émotion,
distribution gains-pertes, séries.

**Modules exclusifs** (le fossé concurrentiel) :
- Calculateur de risque avant trade : « avec ton daily loss restant, tu peux prendre X
  contrats avec un stop de Y ticks ».
- « Aurais-tu passé ce challenge ailleurs ? » — rejoue l'historique réel contre les règles
  des autres offres du comparateur, **route vers l'affiliation**.
- Score de discipline · revue de session guidée.
- Leaderboard anonymisé, classé sur la **discipline**, jamais sur le profit.

### Découpage en tranches

1. **Socle** — `/app` liste des comptes + état ; ajout d'un compte (offre publiée →
   `rules_snapshot`) ; page compte avec jauges (`evaluateAccount`) + bloc payout
   (`evaluatePayout`) ; saisie rapide journalière + trade détaillé ; tags prédéfinis ;
   édition des entrées ; calendrier mensuel. **(livré)**
2. **Analytics** — courbe d'équité + plancher, métriques, ventilations, distributions.
   Plus, indispensables :
   - **Plage de dates + filtres** — sélecteur de période (ce mois, ce trimestre, depuis le
     début, personnalisé) qui **recalcule toutes les statistiques**. Sans ça l'outil devient
     inutilisable dès quelques mois d'historique. Filtres complémentaires : par symbole, par
     setup, par résultat.
   - **Vue multi-comptes agrégée** — sélecteur « Tous les comptes » consolidant la
     performance globale (un trader cumule souvent plusieurs comptes). ⚠️ **Les jauges de
     règles restent par compte** (chaque offre a ses propres règles) ; **seules les analytics
     s'agrègent**.
   - **Export des données** — export CSV de ses trades par l'utilisateur (confiance + RGPD).
3. **Modules exclusifs** — calculateur de risque avant trade, « aurais-tu passé ailleurs ? »,
   score de discipline, leaderboard, import CSV des trades. Plus :
   - **Notebook** — notes libres non rattachées à un trade (plan de trading, observations de
     marché, règles perso). C'est ce qui fait ouvrir l'outil **les jours sans trade**.
   - **Playbook** — définition structurée des setups (nom, critères d'entrée, gestion,
     invalidation) puis **mesure de la performance réelle par setup**. Les tags `setup`
     existants doivent pouvoir s'y relier. Le passage du journal *qui enregistre* au journal
     *qui améliore*.

### Compte personnalisé — firm non listée

Le choix d'une offre du catalogue **n'est pas obligatoire**. Un trader dont la firm n'est
pas encore listée saisit lui-même ses règles (nom de firm en champ libre, taille, type +
montant de drawdown, objectif, daily loss, cohérence, jours min, payout optionnel).

- `journal_accounts.offer_id` reste **null**, `rules_snapshot` est rempli depuis la saisie.
  **Le moteur fonctionne à l'identique** — il ne lit que le snapshot.
- Écran d'ajout : **deux chemins visibles** — « Choisir une offre du catalogue »
  (recommandé, pré-rempli) et « Ma firm n'est pas listée » (saisie manuelle).
- Le nom saisi alimente `requested_firms` (nom, compteur, dernière demande) via la fonction
  `record_firm_request()` — **l'admin voit les firms les plus demandées**, ça pilote les
  priorités d'ajout au comparateur. Table dédup par nom normalisé, lecture staff.

### Module — Bilan financier prop firm (priorité haute, exclusif)

La question que tout trader prop firm se pose sans jamais avoir la réponse : **est-ce que je
gagne réellement de l'argent avec ça ?** Aucun concurrent ne le calcule.

Page dédiée agrégeant **tous les comptes** : total dépensé (challenges + resets + activations),
nombre de comptes achetés / en cours / passés / échoués, total des payouts reçus, **résultat
net**, taux de réussite personnel, coût moyen d'un compte financé, délai moyen jusqu'au
premier payout, répartition par firm.

Schéma à prévoir — table `account_purchases` :

```
journal_account_id  uuid references journal_accounts(id) on delete cascade
kind                text        -- challenge | reset | activation
amount              numeric
currency            text
purchased_at        date
```

Quand un compte est créé depuis une offre du catalogue, **pré-remplir le montant depuis le
prix de l'offre** — mais modifiable, car les promos changent le prix réellement payé. Les
payouts existent déjà (`journal_payouts`).

Cette donnée, agrégée et anonymisée, alimente un contenu que personne ne peut produire :
**quelles firms font réellement gagner de l'argent aux traders.**

### Module — Calendrier économique (priorité moyenne)

Annonces à venir (FOMC, NFP, CPI…) avec horaire et impact attendu, depuis une **source
gratuite**. Angle distinctif : **croiser avec `firm_style_rules`** pour avertir quand une
annonce approche et que la firm de l'utilisateur **restreint le news trading**.

Pas de flux de news temps réel (type Financial Juice) pour l'instant : dépendance à une API
payante, hors de notre axe. À reconsidérer plus tard.

### Ce qu'on ne fait PAS (journal)

- **Pas de backtesting ni de trade replay** : nécessite des données de marché historiques,
  c'est un produit à part entière.
- **Pas de score composite en radar** : on garde un **score de discipline lié aux règles
  réelles de la prop firm**, qui a un sens concret. Pas de note fourre-tout.

### Rappel de cadrage

Notre différence n'est **pas de refaire TradeZella**. Eux disent *comment on a tradé*, nous
disons *si le challenge va passer*. Restent **prioritaires sur toute fonctionnalité copiée à
la concurrence** : les jauges de règles, le calcul de payout, le calculateur de risque avant
trade, le module « aurais-tu passé ailleurs », le calendrier de conformité et le bilan
financier.

### Style

**Base visuelle de travail : `docs/tradegrape-design-system.html`** (Liquid Glass iOS 26),
qui **remplace `docs/homepage-reference.html`**. Direction : verre réfractif réservé à la
couche de navigation flottante (header, menus, dropdowns, modales, panneaux) — **jamais sur
le contenu** ; les tableaux d'offres, jauges de règles et chiffres financiers restent sur
surface **solide** et chirurgicalement lisibles. Échelle de rayons unique (`--r-xs`→`--r-pill`),
hauteurs de contrôle (`--h-sm/md/lg`), focus double anneau, états **lime/amber/red** (jamais
l'accent de marque pour un état), chiffres en **JetBrains Mono tabulaire**.

Transposition : tokens + classes dans `app/design-system.css` (importé par `globals.css`),
composants React dans `components/ui/`. **Cette référence reste susceptible d'évoluer** — les
finitions seront affinées une fois appliquée sur de vrais écrans ; concevoir les composants
pour que ces ajustements soient faciles (variables centralisées, aucune valeur en dur).
