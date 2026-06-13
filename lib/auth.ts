export function saveLoginRedirect(path: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('redirectAfterLogin', path);
  }
}

export function consumeLoginRedirect(fallback = '/'): string {
  if (typeof window === 'undefined') return fallback;
  const path = sessionStorage.getItem('redirectAfterLogin') ?? fallback;
  sessionStorage.removeItem('redirectAfterLogin');
  return path;
}
