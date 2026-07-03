export function maskProxyUrl(url: string): string {
  return url.replace(/\/\/([^:@/]+):([^@/]+)@/, (_match, user: string) => `//${user}:****@`)
}
