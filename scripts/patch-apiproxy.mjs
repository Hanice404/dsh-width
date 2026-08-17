// Idempotently expose the dsh-width settings namespace to the browser
// settings client. This DSH version gates browser-visible namespaces behind a
// hardcoded allowlist (WEB_SETTINGS_NAMESPACES) in
// @deepseek-ai/dsh-host-apiproxy — the design defers plugin-side exposure, so
// the deployment owner must add the namespace there. Run this after a profile
// reinstall or a dsh upgrade that restored the package:
//
//   npm run expose
//
// It patches every copy of dsh-host-apiproxy/lib/index.js it can find (the
// profile store, any npx cache checkout, and the plugin's own node_modules),
// then prints the resulting allowlist.
import { readFileSync, writeFileSync, existsSync, realpathSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const NS = 'dsh-width'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(__dirname, '..')

const home = process.env.DSH_HOME
  ? null
  : process.env.HOME || process.env.USERPROFILE || ''

/** Assemble candidate paths of the deployed dsh-host-apiproxy lib. */
function candidates() {
  const list = []
  const push = (p) => p && list.push(p)

  // 1) Profile store the running loader resolves from.
  if (process.env.DSH_HOME) {
    push(join(process.env.DSH_HOME, 'profiles', 'node_modules', '@deepseek-ai', 'dsh-host-apiproxy', 'lib', 'index.js'))
  } else if (home) {
    push(join(home, '.dsh', 'profiles', 'node_modules', '@deepseek-ai', 'dsh-host-apiproxy', 'lib', 'index.js'))
  }

  // 2) npx cache checkouts (global CLI install).
  if (home) {
    const npxRoot = join(home, '.npm', '_npx')
    if (existsSync(npxRoot)) {
      for (const entry of readdirSync(npxRoot)) {
        push(join(npxRoot, entry, 'node_modules', '@deepseek-ai', 'dsh-host-apiproxy', 'lib', 'index.js'))
      }
    }
  }

  // 3) The plugin's own node_modules (harmless if absent).
  push(join(pluginRoot, 'node_modules', '@deepseek-ai', 'dsh-host-apiproxy', 'lib', 'index.js'))

  return list
}

const MARKER = '// dsh-width exposure (patch-apiproxy.mjs)'
const START = 'const WEB_SETTINGS_NAMESPACES = ['
const END = '];'

/** Patch one file; returns a result record. */
function patchFile(path) {
  if (!existsSync(path)) return { path, patched: false, reason: 'missing' }
  let text = readFileSync(path, 'utf8')
  const start = text.indexOf(START)
  if (start === -1) return { path, patched: false, reason: 'WEB_SETTINGS_NAMESPACES not found' }
  const end = text.indexOf(END, start)
  if (end === -1) return { path, patched: false, reason: 'list terminator not found' }
  const listText = text.slice(start, end + END.length)
  if (listText.includes(`"${NS}"`)) return { path, patched: false, reason: 'already exposed' }
  const insert = `\n\t"${NS}",\n\t${MARKER}`
  text = text.slice(0, end) + insert + text.slice(end)
  writeFileSync(path, text)
  return { path, patched: true, reason: 'patched' }
}

// Dedupe by resolved path so a profile-store symlink into the npx checkout is
// patched exactly once.
const seen = new Set()
const results = []
for (const candidate of candidates()) {
  let real
  try {
    real = realpathSync(candidate)
  } catch {
    continue
  }
  if (seen.has(real)) continue
  seen.add(real)
  results.push(patchFile(real))
}

let patched = 0
for (const r of results) {
  console.log(`${r.patched ? 'PATCHED' : 'SKIPPED'} ${r.reason}: ${r.path}`)
  if (r.patched) patched += 1
}

if (patched === 0) {
  console.log('Nothing to patch. If your deployment keeps dsh-host-apiproxy elsewhere, add this line to')
  console.log('its WEB_SETTINGS_NAMESPACES list (in lib/index.js):')
  console.log(`  "${NS}",`)
  process.exit(1)
}

console.log(`\nDone. Restart the web server (dsh web) for the namespace "${NS}" to become browser-visible.`)
