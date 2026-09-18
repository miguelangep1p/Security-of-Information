"use client";

import { useRef, useState } from "react";

// Aviso breve tipo toast: se muestra al confirmar una acción y desaparece solo.
export function useFlash(duration = 2200) {
  const [message, setMessage] = useState<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (text: string) => {
    if (timeout.current) clearTimeout(timeout.current);
    setMessage(text);
    timeout.current = setTimeout(() => setMessage(null), duration);
  };

  return [message, flash] as const;
}
