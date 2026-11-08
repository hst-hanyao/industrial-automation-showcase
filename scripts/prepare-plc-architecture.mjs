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
if (!original.includes('id="tab-framework"') || !original.includes('function renderFramework()')) {
  throw new Error('Use the newer plc-framework-preview document containing the framework detail view.')
}
const sourceSha256 = createHash('sha256').update(original).digest('hex')
let html = original

function replaceOnce(pattern, replacement, label) {
  const matches = typeof pattern === 'string' ? html.split(pattern).length - 1 : [...html.matchAll(new RegExp(pattern.source, 'gm'))].length
  if (matches !== 1) throw new Error(`Expected one ${label}; found ${matches}. Review the source before packaging.`)
  html = html.replace(pattern, replacement)
}

// Remove only the header content selected by the owner, retaining the view tabs.
replaceOnce('<div class="kicker">WAFER ELECTROPLATING / CONTROL ARCHITECTURE</div>', '', 'header strapline')
replaceOnce(/<p class="subtitle">[^\r\n]*?<\/p>/, '', 'header subtitle')
replaceOnce(/^[ \t]*<div class="header-actions">[^\r\n]*?<\/div>[ \t]*\r?\n/m, '', 'header toolbar')
replaceOnce(/<div class="save-state" id="saveState">[^\r\n]*?<\/div>/, '', 'draft status toolbar')

// Keep the existing Ctrl+S draft shortcut and inspector editing without the toolbar.
const saveBinding = html.match(/^[ \t]*\$\('saveDraft'\)\.addEventListener\('click',\(\)=>\{([^\r\n]*)\}\);[ \t]*\r?$/m)
if (!saveBinding) throw new Error('Draft save binding changed; review the keyboard shortcut.')
const saveBody = saveBinding[1]
  .replace('已保存本机草稿。长期保存或分享，请导出完整网页。', '已保存本机草稿。')
  .replace("+' 可导出完整网页备份。'", "")
replaceOnce(saveBinding[0], `  function saveDraft(){${saveBody}}`, 'draft save handler')
replaceOnce("$('saveDraft').click();", 'saveDraft();', 'Ctrl+S action')
replaceOnce(/^[ \t]*function updateSaveState\(\)\{[^\r\n]*\}\r?\n/m, '', 'removed draft status renderer')
html = html.replaceAll('updateSaveState();', '')
for (const id of ['exportJson', 'exportHtml', 'importButton', 'helpButton']) {
  replaceOnce(`$('${id}').addEventListener(`, `$('${id}')?.addEventListener(`, `${id} optional toolbar binding`)
}
html = html.replace('核对后请保存或导出。', '核对后可按 Ctrl+S 保存。')

const demoMenu = `<details id="plcDemoMenu" class="plc-demo-menu" data-host-only>
      <summary class="btn" aria-label="选择3D演示">3D 演示 <span class="plc-demo-chevron" aria-hidden="true">⌄</span></summary>
      <nav class="plc-demo-list" aria-label="3D 演示">
        <a href="/waferplt/"><b>晶圆电镀工艺</b><small>工艺流程与设备模块</small></a>
        <a href="/stretch-bender/"><b>三维拉弯机</b><small>左右 16 轴独立调节</small></a>
      </nav>
    </details>`
replaceOnce(/ {2}<\/div>\r?\n {2}<div class="topline">/, `    ${demoMenu}\n  </div>\n  <div class="topline">`, 'header demo menu position')
const demoStyles = `.header-main>div:first-child{min-width:0}.plc-demo-menu{position:relative;flex-shrink:0;z-index:40}.plc-demo-menu>summary{list-style:none;min-height:40px;gap:8px}.plc-demo-menu>summary::-webkit-details-marker{display:none}.plc-demo-menu>summary:focus-visible{outline:3px solid #50b7a7;outline-offset:3px}.plc-demo-chevron{transition:transform 140ms ease}.plc-demo-menu[open] .plc-demo-chevron{transform:rotate(180deg)}.plc-demo-list{position:absolute;right:0;top:calc(100% + 8px);width:260px;max-width:calc(100vw - 32px);padding:8px;display:grid;gap:4px;border:1px solid var(--line);border-radius:8px;background:#fff;box-shadow:0 12px 32px #1e30361c}.plc-demo-menu:not([open]) .plc-demo-list{display:none}.plc-demo-list a{display:block;padding:10px 12px;border-radius:5px;color:var(--ink);text-decoration:none}.plc-demo-list a:hover,.plc-demo-list a:focus-visible{background:var(--teal-soft)}.plc-demo-list b,.plc-demo-list small{display:block}.plc-demo-list b{font-size:13px}.plc-demo-list small{margin-top:3px;font-size:11px;color:var(--muted)}@media(max-width:820px){.header-main{display:flex;align-items:center;gap:12px}.plc-demo-menu>summary{padding:7px 10px;white-space:nowrap}}`
html = html.replace('</head>', `<style data-host-only id="plc-demo-styles">${demoStyles}</style>\n</head>`)
const demoRuntime = `(() => {
  const menu = document.getElementById('plcDemoMenu');
  const trigger = menu.querySelector('summary');
  const links = [...menu.querySelectorAll('a')];
  document.addEventListener('pointerdown', event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  menu.addEventListener('focusout', event => {
    if (!menu.contains(event.relatedTarget)) menu.open = false;
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      event.preventDefault(); event.stopPropagation(); menu.open = false; trigger.focus(); return;
    }
    if (event.target === trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault(); menu.open = true;
      links[event.key === 'ArrowUp' ? links.length - 1 : 0]?.focus(); return;
    }
    const index = links.indexOf(event.target);
    if (!menu.open || index < 0 || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
    links[next]?.focus();
  });
  for (const link of links) link.addEventListener('click', () => { menu.open = false; });
})();`
html = html.replace('</body>', `<script id="plc-demo-runtime" data-host-only>${demoRuntime}</script>\n</body>`)

// The site's existing build injects a login display script into public HTML.
// Strip that host-only script when exporting, so downloaded HTML remains offline.
const exportAnchor = 'function exportHtml(){const doc=document.documentElement.cloneNode(true);'
if (html.split(exportAnchor).length !== 2) throw new Error('PLC export entry point changed; review offline export.')
const cleanHost = String.raw`doc.querySelectorAll('[data-host-only],#site-access-lock,#hst-edge-session-lock,base').forEach(el=>el.remove());doc.style.removeProperty('visibility');doc.querySelectorAll('script[src]').forEach(el=>{if(/(?:^|\/)(?:site-access\/access|__access\/legacy-bridge)\.js(?:[?#]|$)/.test(el.getAttribute('src')||''))el.remove();});`
html = html.replace(exportAnchor, exportAnchor + cleanHost)

html = html.replace('</head>', `<meta data-host-only name="plc-source-sha256" content="${sourceSha256}">\n</head>`)
// Preserve the existing public filing links when the document becomes the homepage.
const filings = '<footer data-host-only class="page-footer" aria-label="网站备案信息" style="justify-content:center;flex-wrap:wrap;gap:10px 22px">'
  + '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2026082555号-1</a>'
  + '<a href="https://beian.mps.gov.cn/#/query/webSearch?code=33020002001289" target="_blank" rel="noopener noreferrer"><img src="/media/public-security-filing.png" alt="" width="20" height="20" aria-hidden="true" style="vertical-align:middle;margin-right:6px">浙公网安备33020002001289号</a></footer>'
if (html.split('</footer>').length !== 2) throw new Error('PLC footer changed; review existing filing links.')
html = html.replace('</footer>', '</footer>\n' + filings)

for (const id of ['document-runtime', 'application-script', 'plc-demo-runtime']) {
  const match = html.match(new RegExp('<script id="' + id + '"[^>]*>([\\s\\S]*?)<\\/script>'))
  if (!match) throw new Error(`Missing script: ${id}`)
  new Script(match[1], { filename: id })
}
if (html.match(/<script id="embedded-data" type="application\/json">([\s\S]*?)<\/script>/)[1] !== embedded[1]) {
  throw new Error('Packaging changed the documentation data.')
}
const target = path.join(root, 'public', 'plc-architecture', 'index.html')
await fs.mkdir(path.dirname(target), { recursive: true })
await fs.writeFile(path.join(root, 'index.html'), html, 'utf8')
await fs.writeFile(target, html, 'utf8')
process.stdout.write(JSON.stringify({ homepage: '/', alias: '/plc-architecture/', sourceSha256, bytes: Buffer.byteLength(html), nodes: data.nodes.length }) + '\n')
