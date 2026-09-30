// Text input validation only. All scientific and energy calculations stay in Python.
export function parseSeries(text: string): number[] | null {
  if (!text.trim()) return null;
  if (/(^\s*,|,\s*,|,\s*$)/.test(text)) throw new Error("Input series contains a missing measurement. Supply every interval explicitly.");
  const values = text.trim().split(/[\s,]+/).map(Number);
  if (values.some(value => !Number.isFinite(value))) throw new Error("Input series contains a non-finite or invalid measurement.");
  return values;
}
