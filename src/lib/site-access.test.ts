import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { withSiteAccess } from '../../scripts/site-access'

function entriesAt(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? entriesAt(file) : /\.html$/i.test(file) ? [file] : []
  })
}

describe('static site display gate coverage', () => {
  const publicRoot = path.resolve('public')
  const entries = [
    ...entriesAt(publicRoot).map((file) => ({ file, relative: path.relative(publicRoot, file) })),
    ...['index.html', 'waferplt/robots/index.html'].map((file) => ({ file, relative: file })),
  ].filter(({ relative }) => relative.replaceAll('\\', '/') !== 'site-access/index.html')

  it.each(entries)('guards $relative before any page script or automatic redirect', ({ file, relative }) => {
    const html = withSiteAccess(fs.readFileSync(file, 'utf8'), relative)
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? ''
    expect(head.trimStart()).toMatch(/^<style id="site-access-lock">html\{visibility:hidden!important\}<\/style>\s*<script src="[^"]*site-access\/access.js"><\/script>/)
    const scriptPath = head.match(/<script src="([^"]+)"/)?.[1] ?? ''
    expect(path.posix.normalize(path.posix.join(path.posix.dirname(relative.replaceAll('\\', '/')), scriptPath))).toBe('site-access/access.js')
  })

  it('leaves the login page reachable without redirecting to itself', () => {
    const login = '<html><head><title>访问验证</title></head><body>Login</body></html>'
    expect(withSiteAccess(login, 'site-access/index.html')).toBe(login)
    expect(withSiteAccess(login, 'site-access\\index.html')).toBe(login)
    expect(withSiteAccess(login, 'other/site-access/index.html')).not.toBe(login)
  })

  it('is deterministic so public-file integrity hashes match the final build', () => {
    const html = '<!doctype html><html><head><meta http-equiv="refresh" content="0;url=../"></head><body></body></html>'
    const once = withSiteAccess(html, 'waferplt/modules/index.html')
    expect(withSiteAccess(once, 'waferplt/modules/index.html')).toBe(once)
    expect(once).toContain('../../site-access/access.js')
  })

  it('also guards valid documents that omit the optional head element', () => {
    const html = withSiteAccess('<!doctype html><meta charset="utf-8"><title>References</title><p>Content</p>', 'references/index.html')
    expect(html).toMatch(/^<!doctype html><head>\s*<style id="site-access-lock">/)
    expect(html.indexOf('site-access/access.js')).toBeLessThan(html.indexOf('<p>Content</p>'))
  })
})
