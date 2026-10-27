export function copyCookies<T extends { name: string; value: string }>(
  cookies: T[],
  set: (name: string, value: string, options: Omit<T, "name" | "value">) => void
): void {
  for (const { name, value, ...options } of cookies) {
    set(name, value, options);
  }
}
