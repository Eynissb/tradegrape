/**
 * Visuel décoratif du panneau promo (auth) — un « aperçu comparateur » stylisé
 * (carte d'offre + signature payout), pas un screenshot du produit. Chiffres
 * illustratifs, purement décoratif (aria-hidden). Reprend le langage verre/
 * dégradé du site.
 */
export default function AuthArt() {
  return (
    <div className="auth-art" aria-hidden="true">
      <span className="auth-art-note">
        <b>9</b>
        <span>/10</span>
      </span>

      <div className="auth-art-card auth-art-card--front">
        <div className="auth-art-head">
          <span className="auth-art-firm">Apex · 50K</span>
          <span className="auth-art-health">Health 92</span>
        </div>

        <div className="auth-art-price">
          <span className="auth-art-price-label">Prix TTC</span>
          <span className="auth-art-price-val">167&nbsp;€</span>
        </div>

        <div className="auth-art-gauge">
          <span className="auth-art-gauge-fill" />
        </div>
        <div className="auth-art-gauge-legend">
          <span>Drawdown TRAIL</span>
          <span>2 500&nbsp;$</span>
        </div>

        <div className="auth-art-payout">
          <span className="auth-art-payout-label">Pour retirer</span>
          <span className="auth-art-payout-val">il te manque 2 jours + 340&nbsp;$</span>
        </div>
      </div>

      <div className="auth-art-card auth-art-card--back">
        <div className="auth-art-head">
          <span className="auth-art-firm">Topstep · 50K</span>
          <span className="auth-art-health">Health 88</span>
        </div>
        <div className="auth-art-price">
          <span className="auth-art-price-label">Prix TTC</span>
          <span className="auth-art-price-val">165&nbsp;€</span>
        </div>
      </div>
    </div>
  );
}
