// WCAG AA contrast auditor for the 9 accent schemes.
// Measures: text-on-bg, text-on-card, textSubtle-on-bg, primary-on-bg,
// primary-on-card, onPrimary-on-primary, income/expense-on-card,
// editBorder-on-editBg.

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relLuminance(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function ratio(a, b) {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function check(name, scheme) {
  const lines = [`\n=== ${name} (${scheme.mode}) ===`];
  const pairs = [
    ["text vs bg", scheme.text, scheme.bg, 4.5],
    ["textSubtle vs bg", scheme.textSubtle, scheme.bg, 3.0],
    ["text vs card", scheme.text, scheme.card, 4.5],
    ["textSubtle vs card", scheme.textSubtle, scheme.card, 3.0],
    ["primary vs bg", scheme.primary, scheme.bg, 4.5],
    ["primary vs card", scheme.primary, scheme.card, 4.5],
    ["onPrimary vs primary", scheme.onPrimary, scheme.primary, 4.5],
    ["income vs card", scheme.income, scheme.card, 3.0],
    ["expense vs card", scheme.expense, scheme.card, 3.0],
    ["editBorder vs editBg", scheme.editBorder, scheme.editBg, 3.0],
  ];
  for (const [label, fg, bg, target] of pairs) {
    const r = ratio(fg, bg);
    const pass = r >= target;
    const flag = pass ? "OK  " : "FAIL";
    lines.push(`  ${flag}  ${label.padEnd(22)}  ${r.toFixed(2).padStart(5)}:1  (need ${target})  ${fg} on ${bg}`);
  }
  return lines.join("\n");
}

// Current schemes (post-fix).
const schemes = {
  cyprus: {
    dark: { bg: "#003530", card: "#0c625c", input: "#126e68", text: "#fafcf8", textSubtle: "#a8d4cc", primary: "#a8dcc8", onPrimary: "#001a16", income: "#7ce8ac", expense: "#ff9c80", editBg: "#002824", editBorder: "#a8dcc8" },
    light: { bg: "#F0EDE4", card: "#fdfaf3", input: "#e6dfd2", text: "#1a2622", textSubtle: "#5a6660", primary: "#003c37", onPrimary: "#ffffff", income: "#0e6e4a", expense: "#b83020", editBg: "#d6ebe2", editBorder: "#003c37" },
  },
  vulcanico: {
    dark: { bg: "#001621", card: "#0a1f2c", input: "#0f2837", text: "#f1f5f8", textSubtle: "#8aa8b8", primary: "#FF4103", onPrimary: "#001621", income: "#5cc89a", expense: "#ff8870", editBg: "#0c1a14", editBorder: "#FF4103" },
    light: { bg: "#f4ede6", card: "#fdf8f2", input: "#ebe1d6", text: "#1a1f24", textSubtle: "#6a5a50", primary: "#b82c00", onPrimary: "#ffffff", income: "#1d6e4a", expense: "#b8341a", editBg: "#fce0d2", editBorder: "#b82c00" },
  },
  charcoalline: {
    dark: { bg: "#331425", card: "#4E2340", input: "#57293C", text: "#f4ecf8", textSubtle: "#b09cc0", primary: "#D98A4E", onPrimary: "#2A0E14", income: "#88d878", expense: "#ff7ea8", editBg: "#1c1a08", editBorder: "#D98A4E" },
    light: { bg: "#f4ecf4", card: "#fcf6fc", input: "#e8dce8", text: "#2c1430", textSubtle: "#604868", primary: "#8A4F1E", onPrimary: "#ffffff", income: "#1a5a18", expense: "#a82058", editBg: "#e0e0b8", editBorder: "#8A4F1E" },
  },
  truepink: {
    dark: { bg: "#1a0a0e", card: "#26121a", input: "#321824", text: "#FFF9FA", textSubtle: "#c8a8b0", primary: "#FD1843", onPrimary: "#1a0008", income: "#5cdcb0", expense: "#FD1843", editBg: "#2c0a14", editBorder: "#FD1843" },
    light: { bg: "#FFF9FA", card: "#ffffff", input: "#fce8ec", text: "#2a1418", textSubtle: "#6a4850", primary: "#a8001f", onPrimary: "#ffffff", income: "#0e6e4a", expense: "#a8001f", editBg: "#fcd8e0", editBorder: "#a8001f" },
  },
  silver: {
    dark: { bg: "#141414", card: "#1e1e1e", input: "#262626", text: "#f4f4f4", textSubtle: "#949494", primary: "#3ED598", onPrimary: "#0a0a0a", income: "#3ED598", expense: "#ff5560", editBg: "#0c1a0e", editBorder: "#3ED598" },
    light: { bg: "#f4f4f4", card: "#fcfcfc", input: "#e8e8e8", text: "#141414", textSubtle: "#5a5a5a", primary: "#1E7A34", onPrimary: "#ffffff", income: "#1E7A34", expense: "#b83020", editBg: "#d0ecc8", editBorder: "#1E7A34" },
  },
  sky: {
    dark: { bg: "#060a16", card: "#0c1424", input: "#101c30", text: "#eceef4", textSubtle: "#7898c8", primary: "#4A90D9", onPrimary: "#040c1c", income: "#48d8a0", expense: "#e86878", editBg: "#0c1828", editBorder: "#4A90D9" },
    light: { bg: "#eef4fc", card: "#f8fbff", input: "#dce8f6", text: "#0e1620", textSubtle: "#385878", primary: "#1E5FA8", onPrimary: "#ffffff", income: "#108850", expense: "#b83050", editBg: "#d8e8f8", editBorder: "#1E5FA8" },
  },
  bridal: {
    dark: { bg: "#741A2F", card: "#822438", input: "#8e2e42", text: "#FFE6D6", textSubtle: "#d8a890", primary: "#FFC6A8", onPrimary: "#2a0c14", income: "#88d4a0", expense: "#ff9c92", editBg: "#2c0c12", editBorder: "#FFC6A8" },
    light: { bg: "#fce8dc", card: "#fef0e8", input: "#f0d8c4", text: "#2c0c14", textSubtle: "#5a3840", primary: "#741A2F", onPrimary: "#ffffff", income: "#1d6e4a", expense: "#a82020", editBg: "#f4d4c0", editBorder: "#741A2F" },
  },
  obsidian: {
    dark: { bg: "#0D0F12", card: "#21252b", input: "#1B1D22", text: "#F1F2F4", textSubtle: "#ACB0B9", primary: "#C8FF00", onPrimary: "#0D0F12", income: "#409663", expense: "#c26060", editBg: "#0B0C0F", editBorder: "#C8FF00" },
    light: { bg: "#F4F5F6", card: "#ffffff", input: "#E7E8E9", text: "#1F2228", textSubtle: "#5e646e", primary: "#5A7A00", onPrimary: "#FFFFFF", income: "#356E4D", expense: "#813737", editBg: "#ECEDEE", editBorder: "#5A7A00" },
  },
  arcilla: {
    dark: { bg: "#241109", card: "#3B2113", input: "#452818", text: "#F7EDDC", textSubtle: "#C8A87E", primary: "#E8B83A", onPrimary: "#241109", income: "#88d4a0", expense: "#ff6f61", editBg: "#1A0E06", editBorder: "#E8B83A" },
    light: { bg: "#F3EAD9", card: "#FDF8EC", input: "#EADFC6", text: "#2A1A0E", textSubtle: "#6B543A", primary: "#7A4E0C", onPrimary: "#ffffff", income: "#1d6e4a", expense: "#a82020", editBg: "#F0E2C0", editBorder: "#7A4E0C" },
  },
};

let totalFails = 0;
const all = [];
for (const [name, sc] of Object.entries(schemes)) {
  for (const mode of ["dark", "light"]) {
    const text = check(name, { mode, ...sc[mode] });
    all.push(text);
    if (text.includes("FAIL")) {
      const fails = (text.match(/FAIL/g) || []).length;
      totalFails += fails;
    }
  }
}
console.log(all.join("\n"));
console.log(`\n========\nTOTAL FAILS: ${totalFails}\n========`);
process.exit(totalFails > 0 ? 1 : 0);
