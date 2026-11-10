import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from './theme';

export function useFlashStatus(durationMs = motion.statusTtl) {
  const [status, setStatus] = useState('');
  const timer = useRef<number | null>(null);

  const flash = useCallback(
    (msg: string) => {
      setStatus(msg);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus(''), durationMs);
    },
    [durationMs],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return [status, flash, setStatus] as const;
}
