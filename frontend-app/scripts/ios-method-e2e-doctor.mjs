#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const __filename = fileURLToPath(import.meta.url)
const frontendDir = path.resolve(path.dirname(__filename), '..')
const rootDir = path.resolve(frontendDir, '..')
const artifactsDir = path.join(rootDir, '.codex-artifacts', 'ios-e2e', 'doctor')
const resultPath = path.join(artifactsDir, 'result.json')
const rootEnvPath = path.join(rootDir, '.env')
const appiumHomeDir = path.join(rootDir, '.codex-artifacts', 'appium-home')

const appPath =
  process.env.IOS_APP_PATH ||
  path.join(rootDir, '.codex-artifacts', 'ios-derived-data', 'Build', 'Products', 'Debug-iphonesimulator', 'App.app')
const webOrigin = process.env.IOS_WEB_ORIGIN || 'http://localhost:5175'
const requireWebOrigin = process.env.IOS_DOCTOR_REQUIRE_WEB_ORIGIN === 'true'
const shouldInstallDriver = process.env.IOS_DOCTOR_INSTALL_DRIVER !== 'false'

function loadEnvFallback(filePath) {
  if (!fs.existsSync(filePath)) return
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    if (process.env[key]) continue
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadEnvFallback(rootEnvPath)

function run(command, args, cwd = rootDir, extraEnv = undefined) {
  return execFileSync(command, args, {
    cwd,
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function check(name, fn) {
  try {
    const detail = fn()
    return { name, status: 'pass', detail }
  } catch (error) {
    return {
      name,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function ensureXcuitestDriver() {
  fs.mkdirSync(appiumHomeDir, { recursive: true })
  const driverEnv = { APPIUM_HOME: appiumHomeDir }
  const installedJson = run('npx', ['appium', 'driver', 'list', '--installed', '--json'], frontendDir, driverEnv)
  const installed = JSON.parse(installedJson)
  if (installed.xcuitest?.installed) {
    return `xcuitest@${installed.xcuitest.version} installed`
  }
  if (!shouldInstallDriver) {
    throw new Error('xcuitest driver missing and IOS_DOCTOR_INSTALL_DRIVER=false.')
  }
  run('npx', ['appium', 'driver', 'install', 'xcuitest'], frontendDir, driverEnv)
  return 'xcuitest installed during doctor run'
}

async function verifyIdentityKeyForOrigin(origin) {
  const apiKey = process.env.VITE_GCP_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GCP_API_KEY missing in environment.')
  }
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: origin,
    },
    body: JSON.stringify({
      email: 'invalid',
      password: 'x',
      returnSecureToken: true,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  const message = String(payload?.error?.message || '')
  if (message === 'INVALID_EMAIL') return `Identity key accepts referer ${origin}`
  throw new Error(`Identity key rejected referer ${origin}: ${message || response.status}`)
}

async function main() {
  fs.mkdirSync(artifactsDir, { recursive: true })

  const checks = [
    check('xcodebuild', () => run('xcodebuild', ['-version'])),
    check('simctl', () => {
      const output = run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'])
      const parsed = JSON.parse(output)
      const runtimeCount = Object.keys(parsed.devices || {}).length
      if (!runtimeCount) throw new Error('No iOS simulators found.')
      return `available runtimes: ${runtimeCount}`
    }),
    check('node', () => run('node', ['--version'])),
    check('npm', () => run('npm', ['--version'])),
    check('appium', () => run('npx', ['appium', '--version'], frontendDir)),
    check('appium-xcuitest-driver', () => ensureXcuitestDriver()),
    check('ios-app-artifact', () => {
      if (!fs.existsSync(appPath)) {
        throw new Error(`Missing app artifact at ${appPath}. Run mobile/scripts/build-ios-nokeychain.sh.`)
      }
      return appPath
    }),
    check('testmail-key', () => {
      if (!process.env.TESTMAIL_API_KEY) throw new Error('TESTMAIL_API_KEY missing.')
      return 'present'
    }),
  ]

  if (requireWebOrigin) {
    try {
      const identityDetail = await verifyIdentityKeyForOrigin(webOrigin)
      checks.push({ name: 'identity-key-policy', status: 'pass', detail: identityDetail })
    } catch (error) {
      checks.push({
        name: 'identity-key-policy',
        status: 'fail',
        detail: error instanceof Error ? error.message : String(error),
      })
    }

    let webProbeStatus = 'fail'
    let webProbeDetail = `unreachable: ${webOrigin}`
    try {
      const response = await fetch(`${webOrigin.replace(/\/+$/, '')}/signup`, { redirect: 'manual' })
      if (response.ok || response.status === 301 || response.status === 302 || response.status === 304) {
        webProbeStatus = 'pass'
        webProbeDetail = `reachable (${response.status})`
      }
    } catch {
      // keep fail
    }
    checks.push({ name: 'web-origin', status: webProbeStatus, detail: webProbeDetail })
  } else {
    checks.push({
      name: 'identity-key-policy',
      status: 'pass',
      detail: 'skipped (IOS_DOCTOR_REQUIRE_WEB_ORIGIN=false)',
    })
    checks.push({
      name: 'web-origin',
      status: 'pass',
      detail: 'skipped (IOS_DOCTOR_REQUIRE_WEB_ORIGIN=false)',
    })
  }

  const failed = checks.filter((item) => item.status === 'fail')
  const report = {
    checkedAt: new Date().toISOString(),
    appPath,
    webOrigin,
    status: failed.length ? 'failed' : 'passed',
    checks,
  }
  fs.writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`)

  if (failed.length) {
    process.stderr.write(`ios doctor failed (${failed.length} checks). See ${resultPath}\n`)
    process.exit(1)
  }
  process.stdout.write(`ios doctor passed. Report: ${resultPath}\n`)
}

main().catch((error) => {
  process.stderr.write(`ios doctor failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
