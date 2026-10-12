// Which module a note is about. An app that hosts extensions (src/ext/registry.ts) files a note written inside an
// extension under that extension's id; anywhere else (Home, Me, My notes) it belongs to the app itself.

/** The first path segment of a route: '/garden/beds/3' → 'garden'. */
export function firstSegment(route: string): string {
  return route.split('?')[0].split('#')[0].split('/').find((s) => s !== '') ?? '';
}

/** The feedback `module` for a screen: the extension id when the route is inside one of `extensionIds`, else `appId`. */
export function moduleForRoute(route: string, extensionIds: readonly string[], appId: string): string {
  const first = firstSegment(route);
  return first && extensionIds.includes(first) ? first : appId;
}
