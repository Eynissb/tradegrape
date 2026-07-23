import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import { saveFirmPlatforms } from './actions';

export interface PlatformOption {
  id: string;
  name: string;
  is_datafeed: boolean;
}
export interface FirmPlatformRow {
  platform_id: string;
  is_free: boolean;
  extra_cost: number | null;
  note: string | null;
}

/**
 * Rattache les plateformes du catalogue à une firm, avec licence offerte,
 * surcoût et note. Case décochée = la plateforme n'est pas proposée (supprimée).
 */
export default function FirmPlatformsForm({
  firmId,
  platforms,
  attached,
}: {
  firmId: string;
  platforms: PlatformOption[];
  attached: FirmPlatformRow[];
}) {
  const byId = new Map(attached.map((a) => [a.platform_id, a]));

  if (platforms.length === 0) {
    return (
      <fieldset className="admin-section">
        <legend>Plateformes & licences</legend>
        <p className="admin-sub" style={{ margin: 0 }}>
          Aucune plateforme au catalogue.{' '}
          <Link href="/admin/platforms" className="link-accent">Ajoute-en d’abord</Link>.
        </p>
      </fieldset>
    );
  }

  return (
    <form action={saveFirmPlatforms} className="ds-form-wide">
      <input type="hidden" name="firm_id" value={firmId} />
      <input type="hidden" name="platform_ids" value={platforms.map((p) => p.id).join(',')} />
      <fieldset className="admin-section">
        <legend>Plateformes & licences</legend>
        <p className="admin-sub" style={{ margin: '2px 0 10px' }}>
          Coche les plateformes proposées. « Licence offerte » = flux/licence gratuit ;
          sinon renseigne le surcoût.
        </p>

        <div className="fplat-head" aria-hidden="true">
          <span>Proposée</span>
          <span>Licence offerte</span>
          <span>Surcoût</span>
          <span>Note</span>
        </div>

        <div className="stylerule-list">
          {platforms.map((p) => {
            const cur = byId.get(p.id);
            return (
              <div key={p.id} className="fplat-row">
                <Checkbox
                  name={`on__${p.id}`}
                  defaultChecked={!!cur}
                  label={`${p.name}${p.is_datafeed ? ' · flux' : ''}`}
                />
                <Checkbox name={`free__${p.id}`} defaultChecked={cur?.is_free ?? true} label="Offerte" />
                <Input name={`cost__${p.id}`} type="number" step="0.01" defaultValue={cur?.extra_cost ?? ''} placeholder="0" width="sm" mono />
                <Input name={`note__${p.id}`} defaultValue={cur?.note ?? ''} placeholder="précision libre" />
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4">
        <Button type="submit">Enregistrer les plateformes</Button>
      </div>
    </form>
  );
}
