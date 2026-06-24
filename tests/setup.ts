import { beforeEach } from "vitest";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    },
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(`s:${k}`) ?? null,
      setItem: (k: string, v: string) => store.set(`s:${k}`, v),
      removeItem: (k: string) => store.delete(`s:${k}`),
      clear: () => {
        for (const k of [...store.keys()]) {
          if (k.startsWith("s:")) store.delete(k);
        }
      },
    },
  });
});
