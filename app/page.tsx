import { redirect } from 'next/navigation';

/**
 * Racine du site → home publique française.
 *
 * `/` n'est pas une page en soi : la vitrine SEO vit sur `/fr` et `/en`
 * (canonical + hreflang y sont posés). On redirige ici plutôt que de dupliquer
 * la home à la racine, ce qui créerait du contenu dupliqué.
 *
 * Redirection temporaire (307), pas permanente : elle laisse la porte ouverte à
 * une détection de langue (`Accept-Language`) plus tard sans avoir à défaire un
 * 308 mis en cache par les navigateurs.
 *
 * N'affecte PAS le retour de login : l'action `login` redirige explicitement
 * vers `/app` (ou son paramètre `redirect`), jamais vers `/`.
 */
export default function RootPage() {
  redirect('/fr');
}
