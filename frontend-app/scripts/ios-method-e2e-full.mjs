#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const __filename = fileURLToPath(import.meta.url)
const frontendDir = path.resolve(path.dirname(__filename), '..')
const rootDir = path.resolve(frontendDir, '..')
const artifactsDir = path.join(rootDir, '.codex-artifacts', 'ios-e2e', 'full')
const resultPath = path.join(artifactsDir, 'result.json')

const runCleanup = process.env.IOS_FULL_RUN_CLEANUP === 'true'

const steps = [
  { id: 'doctor', cmd: ['npm', 'run', 'ios:method:e2e:doctor'] },
  { id: 'smoke', cmd: ['npm', 'run', 'ios:method:e2e:smoke'] },
  { id: 'signup', cmd: ['npm', 'run', 'ios:method:e2e:signup'] },
  { id: 'auth', cmd: ['npm', 'run', 'ios:method:e2e:auth'] },
  { id: 'mfa-passkey', cmd: ['npm', 'run', 'ios:method:e2e:mfa-passkey'] },
]

if (runCleanup) {
  steps.push({ id: 'cleanup', cmd: ['npm', 'run', 'ios:method:e2e:cleanup'] })
}

function runStep(step) {
  const startedAt = Date.now()
  const [command, ...args] = step.cmd
  const completed = spawnSync(command, args, {
    cwd: frontendDir,
    env: {
      ...process.env,
      IOS_USE_WEB_ORIGIN: process.env.IOS_USE_WEB_ORIGIN || 'false',
    },
    stdio: 'inherit',
  })
  return {
    id: step.id,
    command: step.cmd.join(' '),
    exitCode: completed.status ?? 1,
    durationMs: Date.now() - startedAt,
  }
}

function main() {
  fs.mkdirSync(artifactsDir, { recursive: true })
  const result = {
    startedAt: new Date().toISOString(),
    status: 'failed',
    runCleanup,
    steps: [],
  }

  for (const step of steps) {
    const out = runStep(step)
    result.steps.push(out)
    if (out.exitCode !== 0) {
      result.finishedAt = new Date().toISOString()
      fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`)
      process.stderr.write(`ios full e2e failed at step '${step.id}'\n`)
      process.exit(out.exitCode)
    }
  }

  result.status = 'passed'
  result.finishedAt = new Date().toISOString()
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(`ios full e2e passed: steps=${result.steps.length}\n`)
}

main()
