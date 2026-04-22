export function buildPath(route: string): string {
  // Local development
  if (import.meta.env.DEV) {
    return `http://localhost:5000/${route}`;
  }

  // Production (live site)
  return `/${route}`;
}