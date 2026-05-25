import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const commands = [
  { name: 'build', cmd: 'pnpm', args: ['build'] },
  { name: 'test', cmd: 'pnpm', args: ['test'] },
  { name: 'lint', cmd: 'pnpm', args: ['exec', 'eslint', '.', '--max-warnings=0'] },
  {
    name: 'format-check',
    cmd: 'pnpm',
    args: ['exec', 'prettier', '--check', '**/*.{ts,tsx,js,jsx,json,md}'],
  },
  { name: 'typecheck', cmd: 'pnpm', args: ['exec', 'tsc', '--noEmit'] },
  { name: 'forbidden-patterns', cmd: 'pnpm', args: ['check-forbidden-patterns'] },
  { name: 'security-audit', cmd: 'pnpm', args: ['audit'] },
]

function run(task) {
  process.stdout.write(`\n> Running ${task.name}...\n`)
  const result = spawnSync(task.cmd, task.args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) {
    console.error(`\n✗ ${task.name} could not start: ${result.error.message}`)
    process.exit(1)
  }

  if (result.status !== 0) {
    console.error(`\n✗ ${task.name} failed with exit code ${result.status}`)
    process.exit(result.status || 1)
  }
}

for (const command of commands) {
  run(command)
}

console.log('\n✓ check-quality passed')
