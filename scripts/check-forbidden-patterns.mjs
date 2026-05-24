import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exclusions = [
  'node_modules',
  '.next',
  'data/local',
  '.git',
  '.pnpm-store',
  'public/fonts',
  'scripts',
]
const fileExtensions = ['.js', '.mjs', '.ts', '.tsx', '.jsx', '.json', '.md']
const warnings = []
const failures = []

const patterns = [
  { label: 'debugger statement', regex: /^\s*debugger\s*;?/, fail: true },
  { label: 'committed private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, fail: true },
  { label: 'console.log statement', regex: /console\.log\(/, fail: false },
  { label: 'eslint-disable comment', regex: /eslint-disable(?!\s*<)/, fail: false },
  { label: 'ts-ignore comment', regex: /@ts-ignore(?!\s*<)/, fail: false },
  { label: 'hardcoded localhost URL', regex: /https?:\/\/localhost(:\d+)?/, fail: false },
]

async function scanDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const relPath = path.relative(root, path.join(dir, entry.name))
    const normalizedRelPath = relPath.split(path.sep).join('/')
    if (exclusions.some((exclude) => normalizedRelPath === exclude || normalizedRelPath.startsWith(`${exclude}/`))) {
      continue
    }
    if (entry.isDirectory()) {
      await scanDir(path.join(dir, entry.name))
      continue
    }
    if (!fileExtensions.includes(path.extname(entry.name))) {
      continue
    }
    const content = await fs.readFile(path.join(dir, entry.name), 'utf8')
    patterns.forEach((pattern) => {
      if (path.extname(entry.name) === '.md' && pattern.label === 'hardcoded localhost URL') {
        return
      }
      if (pattern.regex.test(content)) {
        const message = `${normalizedRelPath}: ${pattern.label}`
        if (pattern.fail) {
          failures.push(message)
        } else {
          warnings.push(message)
        }
      }
    })
  }
}

await scanDir(root)

if (warnings.length) {
  console.log('\nForbidden-pattern warnings:')
  warnings.slice(0, 50).forEach((msg) => console.log(`- ${msg}`))
  if (warnings.length > 50) console.log(`- and ${warnings.length - 50} more`)
}

if (failures.length) {
  console.error('\nForbidden-pattern failures:')
  failures.forEach((msg) => console.error(`- ${msg}`))
  process.exit(1)
}

if (!warnings.length) {
  console.log('\nNo forbidden-pattern warnings found.')
} else {
  console.log('\nForbidden-pattern check completed with warnings.')
}
