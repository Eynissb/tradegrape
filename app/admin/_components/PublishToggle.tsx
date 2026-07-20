/**
 * Toggle Publié/Brouillon — sauvegarde immédiate au clic (server action).
 * Le bouton EST le toggle : cliquer bascule et enregistre, pas de formulaire à valider.
 */
export default function PublishToggle({
  action,
  id,
  isPublished,
  back,
  onLabel = 'Publiée',
  offLabel = 'Brouillon',
  hidden = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  isPublished: boolean;
  back: string;
  onLabel?: string;
  offLabel?: string;
  /** Publié mais masqué en public car un parent est en brouillon. */
  hidden?: boolean;
}) {
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value={isPublished ? '0' : '1'} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        className={isPublished ? 'admin-toggle is-on' : 'admin-toggle'}
        title={isPublished ? 'Cliquer pour repasser en brouillon' : 'Cliquer pour publier'}
      >
        <span className="admin-toggle-dot" />
        {isPublished ? onLabel : offLabel}
      </button>
      {hidden ? <span className="admin-hidden" title="Publié mais masqué : un parent est en brouillon">masqué</span> : null}
    </form>
  );
}
