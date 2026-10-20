#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { remote } from 'webdriverio'

const __filename = fileURLToPath(import.meta.url)
const frontendDir = path.resolve(path.dirname(__filename), '..')
const rootDir = path.resolve(frontendDir, '..')
const artifactsDir = path.join(rootDir, '.codex-artifacts', 'ios-e2e', 'auth')
const appiumLogPath = path.join(artifactsDir, 'appium.log')
const webLogPath = path.join(artifactsDir, 'frontend-dev.log')
const resultPath = path.join(artifactsDir, 'result.json')
const failureScreenshotPath = path.join(artifactsDir, 'failure.png')
const failureSourcePath = path.join(artifactsDir, 'failure-source.xml')
const accountsLedgerPath = path.join(rootDir, '.codex-artifacts', 'ios-e2e', 'accounts.ndjson')
const rootEnvPath = path.join(rootDir, '.env')
const appiumHomeDir = path.join(rootDir, '.codex-artifacts', 'appium-home')
const iosSpmPackageSwiftPath = path.join(rootDir, 'frontend-app', 'ios', 'App', 'CapApp-SPM', 'Package.swift')

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

const appPath =
  process.env.IOS_APP_PATH ||
  path.join(rootDir, '.codex-artifacts', 'ios-derived-data', 'Build', 'Products', 'Debug-iphonesimulator', 'App.app')
const appiumPort = Number(process.env.IOS_APPIUM_PORT || 4725)
const appiumBasePath = process.env.IOS_APPIUM_BASE_PATH || '/wd/hub'
const appBaseUrl = process.env.IOS_APP_BASE_URL || 'capacitor://localhost'
const webOrigin = process.env.IOS_WEB_ORIGIN || 'http://localhost:5175'
const useWebOrigin = process.env.IOS_USE_WEB_ORIGIN === 'true'
const autoStartWebServer = process.env.IOS_START_WEB_SERVER !== 'false'
const autoBuildNativeShell = process.env.IOS_AUTO_BUILD_NATIVE_SHELL !== 'false'
const nativeOriginForKeyCheck = process.env.IOS_NATIVE_ORIGIN || 'capacitor://localhost'
const gcpProjectForNativeKey = process.env.IOS_GCP_PROJECT_ID || 'jualuma-dev'
const nativeKeyDisplayNameRegex =
  process.env.IOS_NATIVE_IDENTITY_KEY_REGEX ||
  '(ios|android).*(e2e|identitytoolkit)|identitytoolkit.*(ios|android)'
const testmailNamespace = process.env.TESTMAIL_NAMESPACE || 'jualuma'
const testmailApiKey = process.env.TESTMAIL_API_KEY
const apiBaseUrl = (process.env.IOS_API_BASE_URL || process.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const simulatorNameHint = process.env.IOS_SIMULATOR_NAME || 'iPhone'

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

function parseVersionFromRuntime(runtime) {
  const marker = '.iOS-'
  const idx = runtime.indexOf(marker)
  if (idx === -1) return ''
  return runtime.slice(idx + marker.length).replaceAll('-', '.')
}

function selectSimulator() {
  const raw = run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'])
  const parsed = JSON.parse(raw)
  const runtimes = Object.keys(parsed.devices)
    .filter((runtime) => runtime.includes('.iOS-'))
    .sort()
    .reverse()

  for (const runtime of runtimes) {
    const devices = parsed.devices[runtime] || []
    const preferred = devices.find((device) => device.isAvailable && device.name.includes(simulatorNameHint))
    const fallback = devices.find((device) => device.isAvailable)
    const picked = preferred || fallback
    if (picked) {
      return {
        name: picked.name,
        udid: picked.udid,
        platformVersion: parseVersionFromRuntime(runtime),
      }
    }
  }
  throw new Error('No available iOS Simulator runtime/device found via simctl.')
}

function assertPrerequisites() {
  if (!testmailApiKey) {
    throw new Error('TESTMAIL_API_KEY is required for ios auth E2E.')
  }
  if (!apiBaseUrl || !apiBaseUrl.startsWith('http')) {
    throw new Error('VITE_API_BASE_URL (or IOS_API_BASE_URL) must be set to an absolute backend URL.')
  }
  if (useWebOrigin && !process.env.VITE_GCP_API_KEY) {
    throw new Error('VITE_GCP_API_KEY is required for ios auth E2E in web-origin mode.')
  }
  if (!autoBuildNativeShell && !fs.existsSync(appPath)) {
    throw new Error(`Built iOS app not found at ${appPath}. Run ios no-keychain build first.`)
  }
}

async function waitForAppiumStatus(url, timeoutMs = 90000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // retry
    }
    await delay(1000)
  }
  throw new Error(`Appium status endpoint did not become ready: ${url}`)
}

async function waitForHttpOk(url, timeoutMs = 90000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' })
      if (response.ok || response.status === 301 || response.status === 302 || response.status === 304) return
    } catch {
      // retry
    }
    await delay(1000)
  }
  throw new Error(`HTTP endpoint did not become ready: ${url}`)
}

async function verifyIdentityKeyForOrigin(origin) {
  const apiKey = process.env.VITE_GCP_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GCP_API_KEY is missing.')
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

  if (message === 'INVALID_EMAIL') return
  if (message.includes('API key expired') || message.includes('Requests from referer')) {
    throw new Error(`Identity key policy check failed for origin '${origin}': ${message}`)
  }
  throw new Error(`Identity key policy check failed for origin '${origin}': ${message || response.status}`)
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

  const candidates = []
  for (const key of keys) {
    const displayName = key.displayName || ''
    if (!nameRegex.test(displayName)) continue

    const restrictions = key.restrictions || {}
    const targets = new Set((restrictions.apiTargets || []).map((item) => item.service))
    const hasAllTargets = [...requiredTargets].every((service) => targets.has(service))
    if (!hasAllTargets) continue

    if (
      restrictions.browserKeyRestrictions ||
      restrictions.serverKeyRestrictions ||
      restrictions.androidKeyRestrictions ||
      restrictions.iosKeyRestrictions
    ) {
      continue
    }

    candidates.push({
      keyName: key.name,
      displayName,
    })
  }

  return candidates
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
    return {
      apiKey: process.env.IOS_NATIVE_GCP_API_KEY,
      source: 'IOS_NATIVE_GCP_API_KEY',
      keyName: 'provided',
    }
  }

  if (process.env.VITE_GCP_API_KEY) {
    try {
      await verifyProvidedApiKeyForOrigin(process.env.VITE_GCP_API_KEY, nativeOriginForKeyCheck)
      return {
        apiKey: process.env.VITE_GCP_API_KEY,
        source: 'VITE_GCP_API_KEY',
        keyName: 'provided',
      }
    } catch {
      // fall through to discovery
    }
  }

  const candidates = listCandidateNativeApiKeys(gcpProjectForNativeKey, nativeKeyDisplayNameRegex)
  if (!candidates.length) {
    throw new Error(
      `No native-capable Identity API key candidates found in project '${gcpProjectForNativeKey}'. Set IOS_NATIVE_GCP_API_KEY.`,
    )
  }

  const discovered = {
    ...candidates[0],
    keyString: getKeyString(gcpProjectForNativeKey, candidates[0].keyName),
  }
  await verifyProvidedApiKeyForOrigin(discovered.keyString, nativeOriginForKeyCheck)
  return {
    apiKey: discovered.keyString,
    source: `gcloud:${discovered.displayName}`,
    keyName: discovered.keyName,
  }
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

function buildNativeShellWithApiKey(apiKey) {
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
}

async function waitForWebViewContext(browser, timeoutMs = 120000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const contexts = await browser.getContexts()
    const webview = contexts.find((ctx) => ctx.startsWith('WEBVIEW'))
    if (webview) {
      await browser.switchContext(webview)
      return webview
    }
    await delay(2000)
  }
  throw new Error('Timed out waiting for WEBVIEW context.')
}

async function pollTestmailOtp(tag, timeoutMs = 120000) {
  const startedAt = Date.now()
  const endpoint = `https://api.testmail.app/api/json?apikey=${encodeURIComponent(testmailApiKey)}&namespace=${encodeURIComponent(testmailNamespace)}&tag=${encodeURIComponent(tag)}&livequery=true`
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) })
      if (response.ok) {
        const payload = await response.json()
        for (const email of payload.emails || []) {
          const blob = `${email.subject || ''}\n${email.text || ''}\n${email.html || ''}`
          const match = blob.match(/\b(\d{6})\b/)
          if (match) return match[1]
        }
      }
    } catch {
      // continue polling on transient timeout/network failures
    }
    await delay(5000)
  }
  throw new Error('Timed out waiting for Testmail OTP.')
}

function bootSimulator(udid) {
  try {
    run('xcrun', ['simctl', 'boot', udid])
  } catch {
    // already booted
  }
  run('xcrun', ['simctl', 'bootstatus', udid, '-b'])
}

function ensureXcuitestDriver() {
  const driverEnv = { APPIUM_HOME: appiumHomeDir }
  const installedJson = run('npx', ['appium', 'driver', 'list', '--installed', '--json'], frontendDir, driverEnv)
  const installed = JSON.parse(installedJson)
  if (installed.xcuitest?.installed) return
  run('npx', ['appium', 'driver', 'install', 'xcuitest'], frontendDir, driverEnv)
}

async function ensureWebOriginReady() {
  if (!useWebOrigin) return { proc: null, stream: null, startedLocalServer: false }
  await verifyIdentityKeyForOrigin(webOrigin)
  const healthUrl = `${webOrigin.replace(/\/+$/, '')}/login`

  try {
    await waitForHttpOk(healthUrl, 5000)
    return { proc: null, stream: null, startedLocalServer: false }
  } catch {
    if (!autoStartWebServer) {
      throw new Error(`Frontend dev server is not reachable at ${healthUrl} and IOS_START_WEB_SERVER=false.`)
    }
  }

  const webLogStream = fs.createWriteStream(webLogPath, { flags: 'w' })
  const webProc = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5175'], {
    cwd: frontendDir,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  webProc.stdout.pipe(webLogStream)
  webProc.stderr.pipe(webLogStream)

  await waitForHttpOk(healthUrl)
  return { proc: webProc, stream: webLogStream, startedLocalServer: true }
}

async function createIdentityUser(email, password, apiKey) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.idToken) {
    const message = payload?.error?.message || `Identity signUp failed (${response.status})`
    throw new Error(message)
  }
  return payload
}

async function backendSignupPending(idToken) {
  const response = await fetch(`${apiBaseUrl}/api/auth/signup/pending`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      first_name: 'IOS',
      last_name: 'Auth',
      agreements: [
        { agreement_key: 'terms_of_service', agreement_version: '2025-01-15', acceptance_method: 'cli' },
        { agreement_key: 'privacy_policy', agreement_version: '2025-01-15', acceptance_method: 'cli' },
      ],
    }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Backend signup/pending failed (${response.status}): ${body}`)
  }
}

async function backendEnableEmail(idToken, code) {
  const response = await fetch(`${apiBaseUrl}/api/auth/mfa/email/enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ code }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Backend email verify failed (${response.status}): ${body}`)
  }
}

async function backendSelectFreePlan(idToken) {
  const response = await fetch(`${apiBaseUrl}/api/billing/plans/free`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({}),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Backend free plan selection failed (${response.status}): ${body}`)
  }
}

async function verifyBackendProfile(idToken, expectedEmail) {
  const response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Backend profile assertion failed (${response.status}): ${JSON.stringify(payload)}`)
  }
  const actualEmail = payload?.user?.email
  if (!actualEmail || String(actualEmail).toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error(`Backend profile email mismatch. expected=${expectedEmail} actual=${actualEmail || 'missing'}`)
  }
  return payload
}

function appendProvisionedAccount(entry) {
  fs.mkdirSync(path.dirname(accountsLedgerPath), { recursive: true })
  fs.appendFileSync(accountsLedgerPath, `${JSON.stringify(entry)}\n`)
}

async function provisionVerifiedAccount(apiKey) {
  const tag = `iosauth${Date.now()}`
  const email = `${testmailNamespace}.${tag}@inbox.testmail.app`
  const password = `IosAuth!${Date.now().toString().slice(-6)}`
  const identity = await createIdentityUser(email, password, apiKey)
  await backendSignupPending(identity.idToken)
  const otp = await pollTestmailOtp(tag, 180000)
  await backendEnableEmail(identity.idToken, otp)
  await backendSelectFreePlan(identity.idToken)
  appendProvisionedAccount({
    createdAt: new Date().toISOString(),
    source: 'ios-method-e2e-auth',
    email,
    password,
    tag,
    uid: identity.localId,
  })
  return { email, password, uid: identity.localId, tag }
}

async function readSessionTokenFromWebview(browser) {
  const raw = await browser.execute(() => window.localStorage.getItem('gcp_auth_session'))
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.idToken || null
  } catch {
    return null
  }
}

async function assertCookieBannerHidden(browser) {
  const cookieBannerHeading = await browser.$('h3=Cookie Preferences')
  if (await cookieBannerHeading.isExisting()) {
    throw new Error('Cookie banner is visible in native iOS flow; expected hidden.')
  }
}

async function main() {
  fs.mkdirSync(artifactsDir, { recursive: true })
  assertPrerequisites()
  ensureXcuitestDriver()

  const webServer = await ensureWebOriginReady()
  const resolvedApiKey = useWebOrigin
    ? { apiKey: process.env.VITE_GCP_API_KEY, source: 'VITE_GCP_API_KEY', keyName: 'provided' }
    : await resolveNativeApiKey()

  if (!resolvedApiKey?.apiKey) {
    throw new Error('Failed to resolve native API key for iOS auth E2E.')
  }

  process.env.VITE_GCP_API_KEY = resolvedApiKey.apiKey

  if (autoBuildNativeShell) {
    buildNativeShellWithApiKey(resolvedApiKey.apiKey)
  } else if (!fs.existsSync(appPath)) {
    throw new Error('iOS app artifact missing and IOS_AUTO_BUILD_NATIVE_SHELL=false.')
  }

  const provisioned = await provisionVerifiedAccount(resolvedApiKey.apiKey)
  const simulator = selectSimulator()
  bootSimulator(simulator.udid)

  const appiumLogStream = fs.createWriteStream(appiumLogPath, { flags: 'w' })
  const appiumProc = spawn(
    'npx',
    ['appium', '--port', String(appiumPort), '--base-path', appiumBasePath],
    {
      cwd: frontendDir,
      env: {
        ...process.env,
        APPIUM_HOME: appiumHomeDir,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  appiumProc.stdout.pipe(appiumLogStream)
  appiumProc.stderr.pipe(appiumLogStream)

  let browser
  let webProc = webServer.proc
  let webLogStream = webServer.stream
  const result = {
    email: provisioned.email,
    simulator,
    appPath,
    startedAt: new Date().toISOString(),
    status: 'failed',
    finalUrl: '',
    webviewContext: '',
    webOrigin: useWebOrigin ? webOrigin : appBaseUrl,
    apiBaseUrl,
    startedWebServer: webServer.startedLocalServer,
    authKeySource: resolvedApiKey?.source || 'VITE_GCP_API_KEY',
    authKeyName: resolvedApiKey?.keyName || '',
    provisionedUid: provisioned.uid,
  }

  try {
    await waitForAppiumStatus(`http://127.0.0.1:${appiumPort}${appiumBasePath}/status`)

    browser = await remote({
      hostname: '127.0.0.1',
      port: appiumPort,
      path: appiumBasePath,
      logLevel: 'error',
      capabilities: {
        platformName: 'iOS',
        'appium:automationName': 'XCUITest',
        'appium:deviceName': simulator.name,
        'appium:platformVersion': simulator.platformVersion,
        'appium:udid': simulator.udid,
        'appium:app': appPath,
        'appium:noReset': false,
        'appium:newCommandTimeout': 300,
        'appium:autoAcceptAlerts': true,
        'appium:autoWebview': true,
        'appium:autoWebviewTimeout': 120000,
        'appium:includeSafariInWebviews': true,
        'appium:additionalWebviewBundleIds': ['*'],
        'appium:webviewConnectRetries': 30,
        'appium:webviewConnectTimeout': 120000,
      },
    })

    result.webviewContext = await waitForWebViewContext(browser)

    if (useWebOrigin) {
      await browser.url(`${webOrigin.replace(/\/+$/, '')}/login`)
    } else {
      await browser.waitUntil(
        async () => {
          const loginEmail = await browser.$('#email')
          return loginEmail.isExisting()
        },
        { timeout: 120000, interval: 1000, timeoutMsg: 'Login screen did not load in WEBVIEW.' },
      )
      await browser.url(`${appBaseUrl}/login`)
    }

    await (await browser.$('#email')).waitForDisplayed({ timeout: 120000 })
    await assertCookieBannerHidden(browser)
    await (await browser.$('#email')).setValue(provisioned.email)
    await (await browser.$('#password')).setValue(provisioned.password)
    await (await browser.$('button=Sign In')).click()

    await browser.waitUntil(
      async () => {
        const url = await browser.getUrl()
        return url.includes('/plan-selection') || url.includes('/pricing') || url.includes('/dashboard')
      },
      { timeout: 180000, interval: 2000, timeoutMsg: 'Post-login route did not reach /plan-selection, /pricing, or /dashboard.' },
    )

    result.finalUrl = await browser.getUrl()
    const idToken = await readSessionTokenFromWebview(browser)
    if (!idToken) {
      throw new Error('Missing gcp_auth_session.idToken in webview localStorage after login.')
    }
    const profilePayload = await verifyBackendProfile(idToken, provisioned.email)
    result.backendStatus = profilePayload?.user?.status || ''
    result.backendPlan = profilePayload?.user?.plan || ''
    result.status = 'passed'
    result.finishedAt = new Date().toISOString()
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`)
    process.stdout.write(`ios auth e2e passed: ${result.finalUrl}\n`)
  } catch (error) {
    if (browser) {
      try {
        await browser.saveScreenshot(failureScreenshotPath)
      } catch {
        // no-op
      }
      try {
        const source = await browser.getPageSource()
        fs.writeFileSync(failureSourcePath, source)
      } catch {
        // no-op
      }
    }
    result.error = error instanceof Error ? error.message : String(error)
    result.finishedAt = new Date().toISOString()
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`)
    throw error
  } finally {
    if (browser) {
      try {
        await browser.deleteSession()
      } catch {
        // no-op
      }
    }
    appiumProc.kill('SIGTERM')
    appiumLogStream.end()
    if (webProc) {
      webProc.kill('SIGTERM')
    }
    if (webLogStream) {
      webLogStream.end()
    }
  }
}

main().catch((error) => {
  process.stderr.write(`ios auth e2e failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
