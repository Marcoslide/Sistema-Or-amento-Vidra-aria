"use client";

import { useEffect } from "react";

// Registra o service worker (apenas em https/localhost). Silencioso em falha.
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const ok = window.location.protocol === "https:" || window.location.hostname === "localhost";
    if (!ok) return;
    navigator.serviceWorker.register("/service-worker.js").catch(() => { /* ignora */ });
  }, []);
  return null;
}
