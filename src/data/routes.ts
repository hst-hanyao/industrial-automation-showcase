export const showcaseRoutePaths = ['/', '/capabilities', '/hmi', '/plc', '/plc/case', '/motion', '/vision', '/cases'] as const

export type ShowcaseRoutePath = (typeof showcaseRoutePaths)[number]

export function isShowcaseRoute(path: string): path is ShowcaseRoutePath {
  return showcaseRoutePaths.some((candidate) => candidate === path)
}

