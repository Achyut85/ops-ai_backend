// utils/strip-undefined.ts
export function stripUndefined<T extends object>(
  obj: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return obj as { [K in keyof T]: Exclude<T[K], undefined> };
}