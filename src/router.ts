/**
 * GitHub Pages는 SPA 라우팅(서버 rewrite)을 지원하지 않으므로 해시 라우팅을 쓴다.
 *   #/            카드 목록
 *   #/card/:id    카드 편집 (의미 그래프)
 *   #/schema      내 재미 도식 (내보내기 · AI 성찰 프롬프트)
 */
export type Route = { name: 'list' } | { name: 'card'; id: string } | { name: 'schema' };

export function parseHash(hash: string): Route {
  if (hash === '#/schema') return { name: 'schema' };
  const match = hash.match(/^#\/card\/([^/]+)$/);
  return match ? { name: 'card', id: decodeURIComponent(match[1]) } : { name: 'list' };
}

export function navigate(path: string) {
  window.location.hash = path;
}
