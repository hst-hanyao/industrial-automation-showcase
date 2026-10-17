import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { log } from 'node:console'
import { Buffer } from 'node:buffer'
import { withSiteAccess } from './site-access.ts'

const workspace = fileURLToPath(new URL('../', import.meta.url))
const preparing = process.argv.includes('--prepare')
const root = path.join(workspace, preparing ? 'public' : 'dist')
const teachingRoot = path.join(root, 'waferplt')
const manifestPath = path.join(teachingRoot, 'publication.json')
const videoExtension = /\.(?:mp4|webm|mov|m4v|avi|mkv)$/i
const textExtension = /\.(?:html|js|mjs|css|json|md|txt|svg|xml)$/i
const forbiddenText = [
  { pattern: /\bLam\b|Novellus|lamresearch/gi, label: 'removed brand' },
  { pattern: /模型说明/g, label: 'removed explanation page' },
  { pattern: /<video\b|\.(?:mp4|webm|mov|m4v|avi|mkv)\b/gi, label: 'video player or reference' },
]

async function filesAt(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Symbolic link in publication: ${absolute}`)
    return entry.isDirectory() ? filesAt(absolute) : [absolute]
  }))
  return files.flat().sort()
}

const relativePath = (absolute, from = teachingRoot) => path.relative(from, absolute).split(path.sep).join('/')
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const allFiles = await filesAt(root)
const teachingFiles = allFiles.filter((file) => file.startsWith(teachingRoot + path.sep) && file !== manifestPath)
const violations = []
const publicationInputs = path.join(workspace, 'public')
const scans = [{ directory: root, files: allFiles }]
if (!preparing) scans.push({ directory: publicationInputs, files: await filesAt(publicationInputs) })

for (const { directory, files } of scans) {
  for (const file of files) {
    const relative = relativePath(file, workspace)
    if (videoExtension.test(file)) violations.push(`${relative}: video file`)
    if (relativePath(file, directory).split('/').includes('local-backups')) violations.push(`${relative}: local-only backup`)
    // The previous manifest is replaced below; it can still describe removed videos.
    if (preparing && file === manifestPath) continue
    if (textExtension.test(file)) {
      const content = await fs.readFile(file, 'utf8')
      for (const { pattern, label } of forbiddenText) {
        const match = content.match(pattern)
        if (match) violations.push(`${relative}: ${label} (${[...new Set(match)].join(', ')})`)
      }
    }
  }
}

if (violations.length) throw new Error(`Teaching publication check failed:\n${violations.join('\n')}`)

if (preparing) {
  const previous = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  const files = await Promise.all(teachingFiles.map(async (absolute) => {
    const original = await fs.readFile(absolute)
    const bytes = /\.html$/i.test(absolute)
      ? Buffer.from(withSiteAccess(original.toString('utf8'), relativePath(absolute, root)))
      : original
    return { path: relativePath(absolute), bytes: bytes.length, sha256: digest(bytes) }
  }))
  const manifest = {
    createdAt: previous.createdAt,
    updatedAt: new Date().toISOString(),
    basePath: previous.basePath,
    kind: 'Static files for the unified, manually controlled wafer electroplating teaching workspace',
    entry: 'index.html',
    videoPolicy: 'Local backup only; no videos, video players or video links are published',
    controls: 'Two columns: module structure and process steps; paused by default; stop at each step boundary',
    scope: 'Files from public/waferplt with the shared access gate applied to HTML; generated robot entry and Vite bundles are checked separately after build',
    files,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    largest: files.reduce((largest, file) => !largest || file.bytes > largest.bytes ? file : largest, null),
  }
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  log(`Teaching publication input checked; manifest refreshed for ${files.length} files.`)
} else {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  for (const file of manifest.files) {
    const absolute = path.resolve(teachingRoot, file.path)
    if (!absolute.startsWith(teachingRoot + path.sep)) throw new Error(`Manifest path escapes teaching directory: ${file.path}`)
    const bytes = await fs.readFile(absolute)
    if (bytes.length !== file.bytes || digest(bytes) !== file.sha256) throw new Error(`Stale publication manifest: ${file.path}`)
  }
  const htmlFiles = allFiles.filter((file) => /\.html$/i.test(file))
  for (const file of htmlFiles) {
    if (relativePath(file, root) === 'site-access/index.html') continue
    const html = await fs.readFile(file, 'utf8')
    if (withSiteAccess(html, relativePath(file, root)) !== html || !html.includes('id="site-access-lock"')) {
      throw new Error(`Published HTML is missing its access gate: ${relativePath(file, root)}`)
    }
  }
  log(`Site access gate checked: ${htmlFiles.length - 1} protected HTML entries and one login page.`)
  log(`Teaching publication checked: ${allFiles.length} output files, no videos, no local backups, no removed brands or explanation page; ${manifest.files.length} static file hashes match.`)
}
