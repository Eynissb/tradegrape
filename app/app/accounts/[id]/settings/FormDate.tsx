'use client';

import { useState } from 'react';
import DatePicker from '@/components/ui/DatePicker';

/** DatePicker utilisable dans un formulaire à server action : gère son propre état,
 *  soumet via l'input caché `name` du DatePicker. */
export default function FormDate({ id, name, label }: { id: string; name: string; label: string }) {
  const [value, setValue] = useState('');
  return <DatePicker id={id} name={name} label={label} value={value} onChange={setValue} />;
}
