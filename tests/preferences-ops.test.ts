describe("preferencesOps", () => {
  let readUiPreferences: typeof import("../src/api/googleWorkspace.ts").readUiPreferences;
  let writeUiPreferences: typeof import("../src/api/googleWorkspace.ts").writeUiPreferences;
  let buildUiPreferences: typeof import("../src/api/googleWorkspace.ts").buildUiPreferences;
  let sanitizeUiPreferences: typeof import("../src/api/googleWorkspace.ts").sanitizeUiPreferences;
  let UI_PREFERENCES_HEADER: typeof import("../src/api/googleWorkspace.ts").UI_PREFERENCES_HEADER;
  let UI_PREFERENCES_INIT_JSON: typeof import("../src/api/googleWorkspace.ts").UI_PREFERENCES_INIT_JSON;

  beforeAll(async () => {
    const mod = await import("../src/api/googleWorkspace.ts");
    readUiPreferences = mod.readUiPreferences;
    writeUiPreferences = mod.writeUiPreferences;
    buildUiPreferences = mod.buildUiPreferences;
    sanitizeUiPreferences = mod.sanitizeUiPreferences;
    UI_PREFERENCES_HEADER = mod.UI_PREFERENCES_HEADER;
    UI_PREFERENCES_INIT_JSON = mod.UI_PREFERENCES_INIT_JSON;
  });

  function json(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
  }

  function installFetch(handler: (input: any, init?: any) => Promise<Response>) {
    const original = globalThis.fetch;
    globalThis.fetch = handler as any;
    return () => { globalThis.fetch = original; };
  }

  test("readUiPreferences returns null when the sheet is empty", async () => {
    const restore = installFetch(async () => json({ values: [] }));
    try {
      const result = await readUiPreferences("token", "sheet");
      expect(result).toBeNull();
    } finally {
      restore();
    }
  });

  test("readUiPreferences returns null when the header is missing", async () => {
    const restore = installFetch(async () =>
      json({ values: [["SOMETHING ELSE"], [UI_PREFERENCES_INIT_JSON]] }),
    );
    try {
      const result = await readUiPreferences("token", "sheet");
      expect(result).toBeNull();
    } finally {
      restore();
    }
  });

  test("readUiPreferences returns null when L2 is empty", async () => {
    const restore = installFetch(async () => json({ values: [[UI_PREFERENCES_HEADER], [""]] }));
    try {
      const result = await readUiPreferences("token", "sheet");
      expect(result).toBeNull();
    } finally {
      restore();
    }
  });

  test("readUiPreferences parses a valid JSON payload", async () => {
    const prefs = buildUiPreferences({
      language: "en",
      currencySymbol: "$",
      fontPreference: "inter",
      colorScheme: "vulcanico",
    });
    const restore = installFetch(async () =>
      json({ values: [[UI_PREFERENCES_HEADER], [JSON.stringify(prefs)]] }),
    );
    try {
      const result = await readUiPreferences("token", "sheet");
      expect(result).toEqual(prefs);
    } finally {
      restore();
    }
  });

  test("readUiPreferences returns null on malformed JSON", async () => {
    const restore = installFetch(async () =>
      json({ values: [[UI_PREFERENCES_HEADER], ["not json"]] }),
    );
    try {
      const result = await readUiPreferences("token", "sheet");
      expect(result).toBeNull();
    } finally {
      restore();
    }
  });

  test("readUiPreferences returns null when an unknown colour scheme slips in", async () => {
    const restore = installFetch(async () =>
      json({
        values: [[UI_PREFERENCES_HEADER], [
          JSON.stringify({
            v: 1,
            language: "es",
            currencySymbol: "S/",
            fontPreference: "dmsans",
            colorScheme: "unicorn",
          }),
        ]],
      }),
    );
    try {
      const result = await readUiPreferences("token", "sheet");
      expect(result).toBeNull();
    } finally {
      restore();
    }
  });

  test("readUiPreferences returns null when an unknown font slips in", async () => {
    const restore = installFetch(async () =>
      json({
        values: [[UI_PREFERENCES_HEADER], [
          JSON.stringify({
            v: 1,
            language: "es",
            currencySymbol: "S/",
            fontPreference: "comicsans",
            colorScheme: "sky",
          }),
        ]],
      }),
    );
    try {
      const result = await readUiPreferences("token", "sheet");
      expect(result).toBeNull();
    } finally {
      restore();
    }
  });

  test("readUiPreferences returns null when language is wrong", async () => {
    const restore = installFetch(async () =>
      json({
        values: [[UI_PREFERENCES_HEADER], [
          JSON.stringify({
            v: 1,
            language: "fr",
            currencySymbol: "S/",
            fontPreference: "dmsans",
            colorScheme: "sky",
          }),
        ]],
      }),
    );
    try {
      const result = await readUiPreferences("token", "sheet");
      expect(result).toBeNull();
    } finally {
      restore();
    }
  });

  test("readUiPreferences returns null when currency is empty", async () => {
    const restore = installFetch(async () =>
      json({
        values: [[UI_PREFERENCES_HEADER], [
          JSON.stringify({
            v: 1,
            language: "es",
            currencySymbol: "",
            fontPreference: "dmsans",
            colorScheme: "sky",
          }),
        ]],
      }),
    );
    try {
      const result = await readUiPreferences("token", "sheet");
      expect(result).toBeNull();
    } finally {
      restore();
    }
  });

  test("writeUiPreferences sends header + JSON to L1:L2", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      return json({});
    });
    try {
      const prefs = buildUiPreferences({
        language: "en",
        currencySymbol: "€",
        fontPreference: "playfair",
        colorScheme: "milky",
      });
      await writeUiPreferences("token", "sheet", prefs);
      const write = requests.find(({ method }) => method === "PUT");
      expect(write).toBeTruthy();
      expect(write!.url.includes("MONTHLY SUMMARY!L1:L2")).toBeTruthy();
      expect(write!.body.values[0][0]).toBe(UI_PREFERENCES_HEADER);
      expect(JSON.parse(write!.body.values[1][0])).toEqual(prefs);
    } finally {
      restore();
    }
  });

  test("sanitizeUiPreferences drops unknown fields and keeps the rest", () => {
    const result = sanitizeUiPreferences({
      v: 1,
      language: "en",
      currencySymbol: "$",
      fontPreference: "fredoka",
      colorScheme: "truepink",
      futureFlag: "ignore-me",
    });
    expect(result).toEqual({
      v: 1,
      language: "en",
      currencySymbol: "$",
      fontPreference: "fredoka",
      colorScheme: "truepink",
    });
  });

  test("sanitizeUiPreferences returns null for non-objects", () => {
    expect(sanitizeUiPreferences(null)).toBeNull();
    expect(sanitizeUiPreferences("string")).toBeNull();
    expect(sanitizeUiPreferences(42)).toBeNull();
  });

  test("buildUiPreferences stamps the version key", () => {
    const prefs = buildUiPreferences({
      language: "es",
      currencySymbol: "S/",
      fontPreference: "dmsans",
      colorScheme: "sky",
    });
    expect(prefs.v).toBe(1);
  });
});
