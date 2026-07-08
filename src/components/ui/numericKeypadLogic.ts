export type AmountEdit = { value: string; cursor: number };

export function applyChar(value: string, cursor: number, ch: string): AmountEdit {
  return { value: value.slice(0, cursor) + ch + value.slice(cursor), cursor: cursor + 1 };
}

export function applyBackspace(value: string, cursor: number): AmountEdit | null {
  if (cursor === 0) return null;
  return { value: value.slice(0, cursor - 1) + value.slice(cursor), cursor: cursor - 1 };
}
