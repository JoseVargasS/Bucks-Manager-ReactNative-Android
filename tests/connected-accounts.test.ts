describe("connectedAccounts:store", () => {
  const g = globalThis as any;
  const secureStore = g.__bucksSecureStoreMock;

  let saveConnectedAccount: typeof import("../src/data/connectedAccounts.ts").saveConnectedAccount;
  let loadConnectedAccounts: typeof import("../src/data/connectedAccounts.ts").loadConnectedAccounts;
  let removeConnectedAccount: typeof import("../src/data/connectedAccounts.ts").removeConnectedAccount;
  let findAccountBySheet: typeof import("../src/data/connectedAccounts.ts").findAccountBySheet;

  beforeAll(async () => {
    const mod = await import("../src/data/connectedAccounts.ts");
    saveConnectedAccount = mod.saveConnectedAccount;
    loadConnectedAccounts = mod.loadConnectedAccounts;
    removeConnectedAccount = mod.removeConnectedAccount;
    findAccountBySheet = mod.findAccountBySheet;
  });

  beforeEach(() => {
    secureStore.reset();
  });

  test("guarda varias cuentas sin limite y ordena por ultimo uso", async () => {
    await saveConnectedAccount({ email: "a@x.com", lastUsedAt: new Date().toISOString() });
    await saveConnectedAccount({ email: "b@x.com", lastUsedAt: new Date().toISOString() });
    await saveConnectedAccount({ email: "c@x.com", lastUsedAt: new Date().toISOString() });
    const list = await loadConnectedAccounts();
    expect(list.map((a) => a.email).sort()).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });

  test("refresca el token en cada guardado sin tumbar sheetId ni scopes", async () => {
    await saveConnectedAccount({
      email: "b@x.com",
      lastUsedAt: new Date().toISOString(),
      spreadsheetId: "sheet-b",
      scopesGranted: true,
      accessToken: "tok-viejo",
    });
    await saveConnectedAccount({ email: "b@x.com", lastUsedAt: new Date().toISOString(), accessToken: "tok-fresco" });
    const list = await loadConnectedAccounts();
    const acc = list.find((a) => a.email === "b@x.com")!;
    expect(acc.accessToken).toBe("tok-fresco");
    expect(acc.spreadsheetId).toBe("sheet-b");
    expect(acc.scopesGranted).toBe(true);
  });

  test("limpiar el token cacheado no borra la cuenta", async () => {
    await saveConnectedAccount({ email: "b@x.com", lastUsedAt: new Date().toISOString(), accessToken: "tok" });
    await saveConnectedAccount({ email: "b@x.com", lastUsedAt: new Date().toISOString(), accessToken: undefined });
    const list = await loadConnectedAccounts();
    expect(list.some((a) => a.email === "b@x.com")).toBe(true);
    expect(list.find((a) => a.email === "b@x.com")!.accessToken).toBeUndefined();
  });

  test("findAccountBySheet ubica al dueño del sheet", async () => {
    await saveConnectedAccount({ email: "a@x.com", lastUsedAt: new Date().toISOString(), spreadsheetId: "sheet-a" });
    expect((await findAccountBySheet("sheet-a"))?.email).toBe("a@x.com");
    expect(await findAccountBySheet("sheet-otro")).toBeNull();
  });

  test("removeConnectedAccount solo saca la cuenta pedida", async () => {
    await saveConnectedAccount({ email: "a@x.com", lastUsedAt: new Date().toISOString() });
    await saveConnectedAccount({ email: "b@x.com", lastUsedAt: new Date().toISOString() });
    await removeConnectedAccount("a@x.com");
    expect((await loadConnectedAccounts()).map((a) => a.email)).toEqual(["b@x.com"]);
  });
});
