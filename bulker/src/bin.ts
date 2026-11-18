import { main } from './cli.js'

const today = new Date().toISOString().slice(0, 10)

process.exitCode = await main({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  today,
  stdout: (text) => process.stdout.write(`${text}\n`),
  stderr: (text) => process.stderr.write(`${text}\n`)
})
