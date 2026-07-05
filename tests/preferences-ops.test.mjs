import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const {
  readUiPreferences,
  writeUiPreferences,
  buildUiPreferences,
  sanitizeUiPreferences,
  UI_PREFERENCES_HEADER,
  UI_PREFERENCES_INIT_JSON,
} = await import("../src/api/googleWorkspace.ts");

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function installFetch(t, handler) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  t.after(() => {
    globalThis.fetch = original;
  });
}

test("readUiPreferences returns null when the sheet is empty", async (t) => {
  installFetch(t, async () => json({ values: [] }));
  const result = await readUiPreferences("token", "sheet");
  assert.equal(result, null);
});

test("readUiPreferences returns null when the header is missing", async (t) => {
  installFetch(t, async () =>
    json({ values: [["SOMETHING ELSE"], [UI_PREFERENCES_INIT_JSON]] }),
  );
  const result = await readUiPreferences("token", "sheet");
  assert.equal(result, null);
});

test("readUiPreferences returns null when L2 is empty", async (t) => {
  installFetch(t, async () => json({ values: [[UI_PREFERENCES_HEADER], [""]] }));
  const result = await readUiPreferences("token", "sheet");
  assert.equal(result, null);
});

test("readUiPreferences parses a valid JSON payload", async (t) => {
  const prefs = buildUiPreferences({
    language: "en",
    currencySymbol: "$",
    fontPreference: "inter",
    colorScheme: "vulcanico",
  });
  installFetch(t, async () =>
    json({ values: [[UI_PREFERENCES_HEADER], [JSON.stringify(prefs)]] }),
  );
  const result = await readUiPreferences("token", "sheet");
  assert.deepEqual(result, prefs);
});

test("readUiPreferences returns null on malformed JSON", async (t) => {
  installFetch(t, async () =>
    json({ values: [[UI_PREFERENCES_HEADER], ["not json"]] }),
  );
  const result = await readUiPreferences("token", "sheet");
  assert.equal(result, null);
});

test("readUiPreferences returns null when an unknown colour scheme slips in", async (t) => {
  installFetch(t, async () =>
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
  const result = await readUiPreferences("token", "sheet");
  assert.equal(result, null);
});

test("readUiPreferences returns null when an unknown font slips in", async (t) => {
  installFetch(t, async () =>
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
  const result = await readUiPreferences("token", "sheet");
  assert.equal(result, null);
});

test("readUiPreferences returns null when language is wrong", async (t) => {
  installFetch(t, async () =>
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
  const result = await readUiPreferences("token", "sheet");
  assert.equal(result, null);
});

test("readUiPreferences returns null when currency is empty", async (t) => {
  installFetch(t, async () =>
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
  const result = await readUiPreferences("token", "sheet");
  assert.equal(result, null);
});

test("writeUiPreferences sends header + JSON to L1:L2", async (t) => {
  const requests = [];
  installFetch(t, async (input, init = {}) => {
    const url = decodeURIComponent(String(input));
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ url, method: init.method || "GET", body });
    return json({});
  });
  const prefs = buildUiPreferences({
    language: "en",
    currencySymbol: "€",
    fontPreference: "playfair",
    colorScheme: "milky",
  });
  await writeUiPreferences("token", "sheet", prefs);
  const write = requests.find(({ method }) => method === "PUT");
  assert.ok(write, "should issue a PUT");
  assert.ok(write.url.includes("MONTHLY SUMMARY!L1:L2"), "should target L1:L2 of MONTHLY SUMMARY");
  assert.equal(write.body.values[0][0], UI_PREFERENCES_HEADER);
  assert.deepEqual(JSON.parse(write.body.values[1][0]), prefs);
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
  assert.deepEqual(result, {
    v: 1,
    language: "en",
    currencySymbol: "$",
    fontPreference: "fredoka",
    colorScheme: "truepink",
  });
});

test("sanitizeUiPreferences returns null for non-objects", () => {
  assert.equal(sanitizeUiPreferences(null), null);
  assert.equal(sanitizeUiPreferences("string"), null);
  assert.equal(sanitizeUiPreferences(42), null);
});

test("buildUiPreferences stamps the version key", () => {
  const prefs = buildUiPreferences({
    language: "es",
    currencySymbol: "S/",
    fontPreference: "dmsans",
    colorScheme: "sky",
  });
  assert.equal(prefs.v, 1);
});
