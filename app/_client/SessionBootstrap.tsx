'use client';

import { useEffect } from 'react';
import { createSession } from '@/src/lib/persist';

export default function SessionBootstrap() {
  useEffect(() => {
    const sid = localStorage.getItem('sid');
    if (!sid) {
      createSession('Nuevo chat')
        .then(s => localStorage.setItem('sid', s.id))
        .catch(console.error);
    }
  }, []);

  return null; // no renderiza nada
}
