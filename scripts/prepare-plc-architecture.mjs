import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { createHash } from 'node:crypto'
import { Script } from 'node:vm'
import { Buffer } from 'node:buffer'

// Publish the independent PLC document as the homepage and at its existing URL.
// The original capability app is retained at its unlinked route.
const source = process.argv[2]
if (!source) throw new Error('Usage: node scripts/prepare-plc-architecture.mjs <standalone HTML>')
const root = fileURLToPath(new URL('../', import.meta.url))
const original = await fs.readFile(path.resolve(source), 'utf8')
const embedded = original.match(/<script id="embedded-data" type="application\/json">([\s\S]*?)<\/script>/)
if (!embedded || /<script\b[^>]*\bsrc=/i.test(original) || /<base\b/i.test(original)) {
  throw new Error('Expected the independent, offline PLC HTML with embedded data and scripts.')
}
const data = JSON.parse(embedded[1])
if (data.nodes?.length !== 24 || data.walkthrough?.length !== 11 || data.operationFlows?.length !== 3) {
  throw new Error('Unexpected PLC architecture version; review the package assumptions before updating.')
}
const sourceSha256 = createHash('sha256').update(original).digest('hex')
let html = original

// The site's existing build injects a login display script into public HTML.
// Strip that host-only script when exporting, so downloaded HTML remains offline.
const exportAnchor = 'function exportHtml(){const doc=document.documentElement.cloneNode(true);'
if (html.split(exportAnchor).length !== 2) throw new Error('PLC export entry point changed; review offline export.')
const cleanHost = String.raw`doc.querySelectorAll('[data-host-only],#site-access-lock,#hst-edge-session-lock,base').forEach(el=>el.remove());doc.style.removeProperty('visibility');doc.querySelectorAll('script[src]').forEach(el=>{if(/(?:^|\/)(?:site-access\/access|__access\/legacy-bridge)\.js(?:[?#]|$)/.test(el.getAttribute('src')||''))el.remove();});`
html = html.replace(exportAnchor, exportAnchor + cleanHost)

const headerAnchor = '<div class="header-actions">'
if (html.split(headerAnchor).length !== 2) throw new Error('PLC header changed; review host navigation.')
html = html.replace('</head>', `<meta data-host-only name="plc-source-sha256" content="${sourceSha256}">\n</head>`)
// Preserve the existing public filing links when the document becomes the homepage.
const filings = '<footer data-host-only class="page-footer" aria-label="网站备案信息" style="justify-content:center;flex-wrap:wrap;gap:10px 22px">'
  + '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2026082555号-1</a>'
  + '<a href="https://beian.mps.gov.cn/#/query/webSearch?code=33020002001289" target="_blank" rel="noopener noreferrer"><img src="/media/public-security-filing.png" alt="" width="20" height="20" aria-hidden="true" style="vertical-align:middle;margin-right:6px">浙公网安备33020002001289号</a></footer>'
if (html.split('</footer>').length !== 2) throw new Error('PLC footer changed; review existing filing links.')
html = html.replace('</footer>', '</footer>\n' + filings)

for (const id of ['document-runtime', 'application-script']) {
  const match = html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)<\\/script>'))
  if (!match) throw new Error(`Missing script: ${id}`)
  new Script(match[1], { filename: id })
}
if (html.match(/<script id="embedded-data" type="application\/json">([\s\S]*?)<\/script>/)[1] !== embedded[1]) {
  throw new Error('Packaging changed the documentation data.')
}
const target = path.join(root, 'public', 'plc-architecture', 'index.html')
await fs.mkdir(path.dirname(target), { recursive: true })
await fs.writeFile(path.join(root, 'index.html'), html, 'utf8')
const alias = html.replace(headerAnchor, headerAnchor + '<a class="btn" data-host-only href="../" aria-label="返回 me 网站主页">返回首页</a>')
await fs.writeFile(target, alias, 'utf8')
process.stdout.write(JSON.stringify({ homepage: '/', alias: '/plc-architecture/', sourceSha256, bytes: Buffer.byteLength(html), nodes: data.nodes.length }) + '\n')
