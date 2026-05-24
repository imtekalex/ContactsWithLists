import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const commands = [
  { name: 'build', cmd: 'pnpm', args: ['build'] },
  { name: 'test', cmd: 'pnpm', args: ['test'] },
  // non-blocking lint and format checks (do not mutate code)
  { name: 'lint (non-blocking)', cmd: 'pnpm', args: ['lint'] },
  { name: 'format-check (non-blocking)', cmd: 'pnpm', args: ['format'] },
  { name: 'typecheck', cmd: 'pnpm', args: ['exec', 'tsc', '--noEmit'] },
  { name: 'forbidden-patterns', cmd: 'pnpm', args: ['check-forbidden-patterns'] },
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
    // Non-blocking checks return non-zero but should not fail the wrapper
    if (task.name.includes('non-blocking')) {
      console.warn(`\n! ${task.name} exited with code ${result.status} (non-blocking)`)
    } else {
      console.error(`\n✗ ${task.name} failed with exit code ${result.status}`)
      process.exit(result.status || 1)
    }
  }
}

for (const command of commands) {
  run(command)
}

console.log('\n✓ check-quality passed')
