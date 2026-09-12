describe("connectedAccounts:isAccountStale", () => {
  let isAccountStale: typeof import("../src/data/connectedAccounts.ts").isAccountStale;

  beforeAll(async () => {
    const mod = await import("../src/data/connectedAccounts.ts");
    isAccountStale = mod.isAccountStale;
  });

  const DAY_MS = 24 * 60 * 60 * 1000;

  test("cuenta usada hoy no esta vencida", () => {
    const now = Date.now();
    expect(isAccountStale(new Date(now - DAY_MS).toISOString(), now)).toBe(false);
  });

  test("cuenta con 9 dias sigue entrando directo", () => {
    const now = Date.now();
    expect(isAccountStale(new Date(now - 9 * DAY_MS).toISOString(), now)).toBe(false);
  });

  test("cuenta con mas de 10 dias pide picker", () => {
    const now = Date.now();
    expect(isAccountStale(new Date(now - 11 * DAY_MS).toISOString(), now)).toBe(true);
  });

  test("fecha invalida o ausente pide picker", () => {
    const now = Date.now();
    expect(isAccountStale(undefined, now)).toBe(true);
    expect(isAccountStale("no-es-fecha", now)).toBe(true);
  });
});
