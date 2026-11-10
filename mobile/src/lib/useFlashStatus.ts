import { useCallback, useEffect, useRef, useState } from 'react';

export function useFlashStatus(durationMs = 5000) {
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
