let memoryToken = '';

export function setCsrfToken(token: string) {
  if (token) {
    memoryToken = token;
  }
}

export function readCsrfToken() {
  if (memoryToken) return memoryToken;
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}
