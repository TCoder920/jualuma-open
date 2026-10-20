#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const __filename = fileURLToPath(import.meta.url)
const frontendDir = path.resolve(path.dirname(__filename), '..')
const rootDir = path.resolve(frontendDir, '..')
const rootEnvPath = path.join(rootDir, '.env')
const artifactsDir = path.join(rootDir, '.codex-artifacts', 'ios-e2e', 'smoke')
const resultPath = path.join(artifactsDir, 'result.json')
const iosSpmPackageSwiftPath = path.join(rootDir, 'frontend-app', 'ios', 'App', 'CapApp-SPM', 'Package.swift')

const nativeOriginForKeyCheck = process.env.IOS_NATIVE_ORIGIN || 'capacitor://localhost'
const gcpProjectForNativeKey = process.env.IOS_GCP_PROJECT_ID || 'jualuma-dev'
const nativeKeyDisplayNameRegex =
  process.env.IOS_NATIVE_IDENTITY_KEY_REGEX ||
  '(ios|android).*(e2e|identitytoolkit)|identitytoolkit.*(ios|android)'

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

function run(command, args, cwd = rootDir, extraEnv = undefined) {
  return execFileSync(command, args, {
    cwd,
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function hasCommand(command) {
  try {
    run('which', [command])
    return true
  } catch {
    return false
  }
}

async function verifyProvidedApiKeyForOrigin(apiKey, origin) {
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
  if (message === 'INVALID_EMAIL') return
  if (message.includes('API key expired') || message.includes('Requests from referer')) {
    throw new Error(`Provided API key is not valid for origin '${origin}': ${message}`)
  }
  throw new Error(`Provided API key did not pass origin verification '${origin}': ${message || response.status}`)
}

function listCandidateNativeApiKeys(projectId, displayRegex) {
  if (!hasCommand('gcloud')) {
    throw new Error('gcloud CLI is required to auto-discover iOS native auth API keys.')
  }
  const raw = run(
    'gcloud',
    [
      'services',
      'api-keys',
      'list',
      '--project',
      projectId,
      '--format=json(name,displayName,restrictions)',
    ],
    rootDir,
  )
  const keys = JSON.parse(raw)
  const nameRegex = new RegExp(displayRegex, 'i')
  const requiredTargets = new Set(['identitytoolkit.googleapis.com', 'securetoken.googleapis.com'])
  return keys
    .filter((key) => nameRegex.test(String(key.displayName || '')))
    .filter((key) => {
      const restrictions = key.restrictions || {}
      const targets = new Set((restrictions.apiTargets || []).map((item) => item.service))
      const hasAllTargets = [...requiredTargets].every((service) => targets.has(service))
      if (!hasAllTargets) return false
      return !(
        restrictions.browserKeyRestrictions ||
        restrictions.serverKeyRestrictions ||
        restrictions.androidKeyRestrictions ||
        restrictions.iosKeyRestrictions
      )
    })
}

function getKeyString(projectId, keyName) {
  return run(
    'gcloud',
    [
      'services',
      'api-keys',
      'get-key-string',
      keyName,
      '--project',
      projectId,
      '--format=value(keyString)',
    ],
    rootDir,
  )
}

async function resolveNativeApiKey() {
  if (process.env.IOS_NATIVE_GCP_API_KEY) {
    await verifyProvidedApiKeyForOrigin(process.env.IOS_NATIVE_GCP_API_KEY, nativeOriginForKeyCheck)
    return process.env.IOS_NATIVE_GCP_API_KEY
  }
  if (process.env.VITE_GCP_API_KEY) {
    try {
      await verifyProvidedApiKeyForOrigin(process.env.VITE_GCP_API_KEY, nativeOriginForKeyCheck)
      return process.env.VITE_GCP_API_KEY
    } catch {
      // fall through
    }
  }
  const candidates = listCandidateNativeApiKeys(gcpProjectForNativeKey, nativeKeyDisplayNameRegex)
  if (!candidates.length) {
    throw new Error(
      `No native-capable Identity API key candidates found in project '${gcpProjectForNativeKey}'. Set IOS_NATIVE_GCP_API_KEY.`,
    )
  }
  const key = getKeyString(gcpProjectForNativeKey, candidates[0].name)
  await verifyProvidedApiKeyForOrigin(key, nativeOriginForKeyCheck)
  return key
}

function restoreVendoredCapacitorSpmPackage() {
  if (!fs.existsSync(iosSpmPackageSwiftPath)) return
  const expected = `// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.1.0"),
        .package(name: "CapacitorApp", path: "../../../node_modules/@capacitor/app"),
        .package(name: "CapacitorKeyboard", path: "../../../node_modules/@capacitor/keyboard"),
        .package(name: "CapacitorSplashScreen", path: "../../../node_modules/@capacitor/splash-screen"),
        .package(url: "https://github.com/plaid/plaid-link-ios-spm.git", exact: "6.4.3")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorKeyboard", package: "CapacitorKeyboard"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "LinkKit", package: "plaid-link-ios-spm")
            ]
        )
    ]
)
`
  const current = fs.readFileSync(iosSpmPackageSwiftPath, 'utf8')
  if (current !== expected) {
    fs.writeFileSync(iosSpmPackageSwiftPath, expected)
  }
}

async function main() {
  loadEnvFallback(rootEnvPath)
  fs.mkdirSync(artifactsDir, { recursive: true })

  const apiBaseUrl = (process.env.IOS_API_BASE_URL || process.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
  if (!apiBaseUrl || !apiBaseUrl.startsWith('http')) {
    throw new Error('VITE_API_BASE_URL (or IOS_API_BASE_URL) must be set to an absolute backend URL.')
  }

  const apiKey = await resolveNativeApiKey()
  const buildEnv = {
    VITE_GCP_API_KEY: apiKey,
    VITE_API_BASE_URL: apiBaseUrl,
  }

  run('npm', ['run', 'build:mobile'], frontendDir, buildEnv)
  run('npm', ['run', 'sync:ios'], frontendDir, buildEnv)
  restoreVendoredCapacitorSpmPackage()
  run(
    './mobile/scripts/build-ios-nokeychain.sh',
    [],
    rootDir,
    { ...buildEnv, MOBILE_ENV_FILE: '.codex-artifacts/mobile.env', MOBILE_TARGET_ENV: 'dev' },
  )

  const result = {
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    status: 'passed',
    apiBaseUrl,
    authKeySource: process.env.IOS_NATIVE_GCP_API_KEY ? 'IOS_NATIVE_GCP_API_KEY' : 'resolved-native-key',
  }
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write('ios smoke passed: build/sync/native-shell complete\n')
}

main().catch((error) => {
  const result = {
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    status: 'failed',
    error: error instanceof Error ? error.message : String(error),
  }
  fs.mkdirSync(artifactsDir, { recursive: true })
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`)
  process.stderr.write(`ios smoke failed: ${result.error}\n`)
  process.exit(1)
})
