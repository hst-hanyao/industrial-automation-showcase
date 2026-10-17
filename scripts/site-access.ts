import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

const loginPage = 'site-access/index.html'
const marker = 'id="site-access-lock"'

/** Apply the same display gate to Vite entries and verbatim public HTML. */
export function withSiteAccess(html: string, relativeFile: string): string {
  const file = relativeFile.replaceAll('\\', '/').replace(/^\/+/, '')
  if (file === loginPage || html.includes(marker)) return html
  const script = path.posix.relative(path.posix.dirname(file), 'site-access/access.js')
    .split('/').map((part) => encodeURIComponent(part)).join('/')
  // Synchronous and first in <head>: neither page styles nor a failed script
  // may reveal content before the session check has completed.
  const gate = `\n<style ${marker}>html{visibility:hidden!important}</style>\n<script src="${script}"></script>\n`
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (head) => head + gate)
  // HTML permits an omitted head; the bibliography is one such valid document.
  return html.replace(/^(\s*(?:<!doctype[^>]*>\s*)?(?:<html\b[^>]*>\s*)?)/i, `$1<head>${gate}</head>\n`)
}

async function htmlFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink in site output: ${file}`)
    return entry.isDirectory() ? htmlFiles(file) : Promise.resolve(/\.html$/i.test(file) ? [file] : [])
  }))
  return files.flat()
}

export function siteAccessPlugin(): Plugin {
  let root: string
  let output: string
  let building = false
  return {
    name: 'site-access',
    configResolved(config) {
      root = config.root
      output = path.resolve(root, config.build.outDir)
      building = config.command === 'build'
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        return withSiteAccess(html, path.relative(root, context.filename))
      },
    },
    configureServer(server) {
      // Vite serves public HTML verbatim, bypassing transformIndexHtml.
      server.middlewares.use(async (request, response, next) => {
        try {
          const url = new URL(request.url ?? '/', 'http://vite.local')
          const base = server.config.base.startsWith('/') ? server.config.base : '/'
          if (base !== '/' && !url.pathname.startsWith(base)) return next()
          const pathname = decodeURIComponent(base === '/' ? url.pathname : `/${url.pathname.slice(base.length)}`)
          const relative = pathname.endsWith('.html') ? pathname : `${pathname.replace(/\/$/, '')}/index.html`
          const publicDirectory = path.resolve(server.config.publicDir)
          const file = path.resolve(publicDirectory, `.${relative}`)
          if (!file.startsWith(publicDirectory + path.sep)) return next()
          let html: string
          try {
            html = await fs.readFile(file, 'utf8')
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') return next()
            throw error
          }
          // Directory URLs must end in / so all existing relative URLs work.
          if (!pathname.endsWith('/') && !pathname.endsWith('.html')) {
            response.writeHead(302, { Location: `${url.pathname}/${url.search}` })
            response.end()
            return
          }
          response.setHeader('Content-Type', 'text/html; charset=utf-8')
          response.setHeader('Cache-Control', 'no-cache')
          response.end(withSiteAccess(html, path.relative(publicDirectory, file)))
        } catch (error) {
          next(error)
        }
      })
    },
    async closeBundle() {
      if (!building) return
      const files = await htmlFiles(output)
      await Promise.all(files.map(async (file) => {
        const before = await fs.readFile(file, 'utf8')
        const after = withSiteAccess(before, path.relative(output, file))
        if (after !== before) await fs.writeFile(file, after)
      }))
    },
  }
}
