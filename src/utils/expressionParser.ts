function parseAddSub(expr: string, ctx: { pos: number }): number {
  let result = parseMulDiv(expr, ctx);
  while (ctx.pos < expr.length) {
    const ch = expr[ctx.pos];
    if (ch === "+" || ch === "-") {
      ctx.pos++;
      const right = parseMulDiv(expr, ctx);
      result = ch === "+" ? result + right : result - right;
    } else break;
  }
  return result;
}

function parseMulDiv(expr: string, ctx: { pos: number }): number {
  let result = parsePrimary(expr, ctx);
  while (ctx.pos < expr.length) {
    const ch = expr[ctx.pos];
    if (ch === "*" || ch === "/") {
      ctx.pos++;
      const right = parsePrimary(expr, ctx);
      const div = ch === "/" ? result / right : result * right;
      result = Number.isFinite(div) ? div : 0;
    } else break;
  }
  return result;
}

function parseParenthesized(expr: string, ctx: { pos: number }): number {
  ctx.pos++;
  const result = parseAddSub(expr, ctx);
  skipSpaces(expr, ctx);
  if (ctx.pos < expr.length && expr[ctx.pos] === ")") ctx.pos++;
  return result;
}

function parsePrimary(expr: string, ctx: { pos: number }): number {
  skipSpaces(expr, ctx);
  if (ctx.pos < expr.length && expr[ctx.pos] === "(") {
    return parseParenthesized(expr, ctx);
  }
  let sign = 1;
  if (ctx.pos < expr.length && expr[ctx.pos] === "+") { ctx.pos++; }
  else if (ctx.pos < expr.length && expr[ctx.pos] === "-") { sign = -1; ctx.pos++; }
  skipSpaces(expr, ctx);
  if (ctx.pos < expr.length && expr[ctx.pos] === "(") {
    return sign * parseParenthesized(expr, ctx);
  }
  const start = ctx.pos;
  while (ctx.pos < expr.length && /[\d.]/.test(expr[ctx.pos])) ctx.pos++;
  const num = Number(expr.slice(start, ctx.pos));
  return Number.isFinite(num) ? sign * num : 0;
}

function skipSpaces(expr: string, ctx: { pos: number }) {
  while (ctx.pos < expr.length && expr[ctx.pos] === " ") ctx.pos++;
}

export function calculateExpression(expression: string): number {
  const clean = expression.replace(/[^0-9+\-*/().\s]/g, "");
  if (!clean.trim()) return 0;
  return parseAddSub(clean, { pos: 0 });
}

export function normalizeAmountExpression(value: string): string {
  return value.trim().replace(/^=/, "").trim();
}

function isMathExpression(value: string): boolean {
  const expression = normalizeAmountExpression(value);
  return value.trim().startsWith("=") || /[+*/()]/.test(expression) || /.\s*-/.test(expression);
}

export function getDraftAmountValue(draft: { amount: string; type: string }): number {
  return Number(calculateExpression(normalizeAmountExpression(draft.amount)));
}

export function isMathFormula(value: string): boolean {
  return isMathExpression(value);
}
