import { useState } from 'react';
import { actionSchemas, type ModerationRequest } from '../services/detail-moderation.service';

export function useObservationsViewModel(submit: (request: ModerationRequest) => Promise<boolean>) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'INTERNAL' | 'CITIZEN_RESPONSE'>('INTERNAL');
  const [error, setError] = useState('');
  async function save() {
    const result = actionSchemas.observations.safeParse({ content, visibility });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError('');
    if (await submit({ action: 'observations', body: result.data })) setContent('');
  }
  return { content, setContent, visibility, setVisibility, error, save };
}

