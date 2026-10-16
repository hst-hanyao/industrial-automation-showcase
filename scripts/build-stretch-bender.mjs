import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { Buffer } from 'node:buffer'
import { log } from 'node:console'
import { rolldown } from 'rolldown'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = path.join(root, 'src/stretch-bender')
const output = path.join(root, 'public/stretch-bender')
const bundle = await rolldown({ input: path.join(source, 'main.ts'), platform: 'browser' })
const generated = await bundle.generate({ format: 'iife', minify: true, name: 'StretchBender', codeSplitting: false })
const js = generated.output.find((item) => item.type === 'chunk')?.code
if (!js) throw new Error('Stretch bender bundle was not generated')
const template = await fs.readFile(path.join(source, 'page.html'), 'utf8')
const style = await fs.readFile(path.join(source, 'style.css'), 'utf8')
const licenses = await fs.readFile(path.join(source, 'THIRD-PARTY-NOTICES.txt'), 'utf8')
const html = template
  .replace('/* BENDER_STYLES */', () => style)
  .replace('/* BENDER_SCRIPT */', () => js.replaceAll('</script', '<\\/script'))
  .replace('</body>', () => `<!--\n${licenses.replaceAll('--', '—')}\n-->\n</body>`)
await fs.mkdir(output, { recursive: true })
await fs.writeFile(path.join(output, 'index.html'), html, 'utf8')
await bundle.close()
log(`Stretch bender: standalone HTML, ${Buffer.byteLength(html).toLocaleString()} bytes; all runtime assets inlined.`)
