// İlk boyamayı bloklamaması gereken ikincil işleri (rozet sayıları, sepet
// adedi gibi) tarayıcı boşta kalınca çalıştırır.
export function runWhenIdle(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => callback(), { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, 800);
  return () => window.clearTimeout(id);
}
