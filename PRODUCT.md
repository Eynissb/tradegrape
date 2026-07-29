# Product

<!-- impeccable:product-schema 1 -->

<!-- Pré-rempli depuis CLAUDE.md (source de vérité produit du projet). Faits produit
     uniquement — aucune décision visuelle ici. À confirmer/ajuster par l'utilisateur. -->

## Platform

web

## Stack

Next.js (App Router) + Supabase. Comparateur pré-rendu SSG/ISR (SEO vital, YMYL) ;
journal authentifié sous `/app` ; admin sous `/admin` (6 rôles). TypeScript strict.
i18n FR + EN dès le premier jour. Le moteur de règles est pur (ni réseau ni DB).

## Users

Traders de **futures en prop firm** (francophones et anglophones). Ils achètent des
comptes de challenge auprès de prop firms, doivent passer une évaluation aux règles
strictes (drawdown, cohérence, objectif), puis — une fois financés — obtenir des
payouts. Situation type : le trader compare des offres avant d'acheter, journalise ses
trades au quotidien pour savoir s'il respecte les règles, et revient comparer/racheter
quand une firm le déçoit. Environ 14 % passent un challenge, ~7 % touchent un payout.

## Product Purpose

**Tradegrape** = comparateur de prop firms futures **+ journal de trading gratuit**
dans une seule application, adossé à une présence créateur (chaîne, Discord, lives).
Modèle économique : **affiliation** (compare → journalise → achète/rachète via nos
liens). Succès = rétention quotidienne via le journal, e-mail capté, retour naturel, et
clics affiliés qualifiés. Boucle : arrivée (SEO/chaîne/Discord) → compare → ajoute une
offre au journal → journalise → CTA affilié → revient comparer.

## Positioning

Ce qu'aucun concurrent ne fait, structurellement :
- **On EXÉCUTE les règles que les autres DÉCRIVENT.** Un moteur pur calcule le drawdown
  restant, le plancher, la cohérence, et surtout le payout : « il te manque 2 jours de
  profit et 340 $ ». Le concurrent documente ça en prose sans jamais le calculer.
- **Le journal** → donnée propriétaire (taux d'échec par offre, filtre « compatible avec
  mon style ») et rétention. Les comparateurs concurrents sont en lecture seule.
- **Bilingue** FR + EN (le concurrent direct est FR only).
- **Honnêteté** : prix TTC réels, règles qui font échouer (surtout le trailing intraday,
  piège n°1), santé réelle des firms. Tri par fiabilité, **jamais par commission**.

## Operating Context

Le trader évalue des **offres** (firm → plan → offre ; ~100-150 lignes pour 13 firms),
pas des firms : les règles vivent sur l'offre (le drawdown d'un 50k ≠ celui d'un 100k).
Il achète un challenge, le passe (ou échoue/reset), devient financé (règles souvent
**durcies** en financé : EOD → trailing intraday), puis demande des payouts. Il utilise
des plateformes (Rithmic, Tradovate, NinjaTrader, WealthCharts…) dont les licences
peuvent être offertes. Il importe ses trades par CSV (Tradovate, NinjaTrader, Rithmic).

## Capabilities and Constraints

- **Moteur de règles pur** (`lib/rules/futures-engine.ts`) : `evaluateAccount`,
  `evaluatePayout`. Types de drawdown STATIC / EOD / TRAIL. Résolution de phase
  obligatoire (`rulesForStatus`) — le financé peut durcir les règles.
- **Comparateur** : filtres complets, presets, comparaison côte à côte, tri par health
  score. Filtres exclusifs : Health Score (fiabilité opérateur) et « Compatible avec mon
  style » (piloté par le journal).
- **Journal** (pièce maîtresse) : jauges temps réel, compteur de payout, alertes de
  changement de règles, multi-comptes, calendrier mensuel, analytics, modules exclusifs
  (calculateur de risque avant trade, « aurais-tu passé ailleurs ? », bilan financier).
- **Guides** : 13 firms, bilingues, sections ancrables, modules interactifs.
- Contraintes : RLS sur toutes les tables ; jamais de `service_role` côté client ;
  montants en `numeric` (jamais de float dans les règles) ; toute chaîne affichée passe
  par l'i18n ; chaque donnée de règle vérifiée à la source et datée (`reviewed_at`).

## Brand Commitments

- **Nom** : Tradegrape (tradegrape.com). **Phrase de marque** :
  « Ne choisis pas ta prop firm. Teste-la d'abord. »
- **Voix** : directe, phrases courtes, chiffres concrets. **Aucun tic d'IA** (« il
  convient de noter », « paysage en constante évolution »). Un guide doit se lire comme
  écrit par un trader. Pas de promesse de gain.
- **Contraintes visuelles rendues contraignantes par le projet** (à préserver, sans les
  élargir) : dark ; accent de marque indigo→fuchsia (`#5b3fff`→`#c04bff`, ponctuation
  magenta `#ff3ba6`) ; **jamais de bleu/cyan** (testé et rejeté) ; états ok/warning/danger
  en **lime/amber/red**, jamais l'accent de marque (la lisibilité du risque prime) ;
  chiffres en Inter tabulaire ; JetBrains Mono réservé au code et aux codes promo.
- **Ce qu'on ne fait jamais** : faux compteurs / fausse urgence / faux « live » ; tri par
  commission ; copie du contenu concurrent.

## Evidence on Hand

- **Réel, vérifié** : 4 firms publiées (Lucid Trading, Tradeify, Take Profit Trader,
  Bulenox) avec prix, plateformes, pays + année de création vérifiés à la source
  (2026-07). Note Lucid Pro 9 / Flex 10 / Direct 7 (réelle). 35 offres.
- **Absences à NE PAS inventer** : pas encore d'avis clients ni de payout proofs ; codes
  promo négociés seulement sur des firms en brouillon (Topstep, TradeDay) donc absents du
  public ; health scores non calculés ; données propriétaires du journal pas encore
  agrégées. L'honnêteté du positionnement interdit de fabriquer ces éléments.

## Product Principles

1. **La donnée est vérifiée à la source et datée.** Une donnée fausse détruit le
   positionnement, qui est le cœur du produit.
2. **On exécute, on ne décrit pas.** Là où la concurrence écrit un paragraphe, on met un
   outil qui calcule (jauges, payout, « ce qu'il te manque »).
3. **Le journal fait revenir.** Rétention quotidienne + donnée propriétaire = la douve.
4. **Fiabilité avant commission.** Jamais de tri par commission, jamais de fausse urgence.
5. **Bilingue de bout en bout, dès le premier jour.**

## Accessibility & Inclusion

Bilingue FR + EN dès le départ. Lisibilité chirurgicale des chiffres financiers (les
états de risque doivent rester lisibles avant l'esthétique). Contenu YMYL : exactitude et
datation priment.
