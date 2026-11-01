export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function indexById<T extends { id: string }>(
  items: readonly T[]
): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}
