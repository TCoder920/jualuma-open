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
const artifactsDir = path.join(rootDir, '.codex-artifacts', 'ios-e2e', 'signup')
const appiumLogPath = path.join(artifactsDir, 'appium.log')
const webLogPath = path.join(artifactsDir, 'frontend-dev.log')
const resultPath = path.join(artifactsDir, 'result.json')
const failureScreenshotPath = path.join(artifactsDir, 'failure.png')
const failureSourcePath = path.join(artifactsDir, 'failure-source.xml')
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
    throw new Error('TESTMAIL_API_KEY is required for ios signup E2E.')
  }
  if (useWebOrigin && !process.env.VITE_GCP_API_KEY) {
    throw new Error('VITE_GCP_API_KEY is required for ios signup E2E.')
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
    throw new Error(`Identity key policy check failed for origin '${origin}': ${message}`)
  }
  throw new Error(`Identity key policy check failed for origin '${origin}': ${message || response.status}`)
}

function discoverGcpNativeIdentityKey(projectId, nameRegex, origin) {
  if (!hasCommand('gcloud')) {
    throw new Error('gcloud CLI is required to auto-discover native Identity API key.')
  }
  const listRaw = run(
    'gcloud',
    ['services', 'api-keys', 'list', `--project=${projectId}`, '--format=json'],
    rootDir,
  )
  const parsed = JSON.parse(listRaw)
  const regex = new RegExp(nameRegex, 'i')
  const candidates = (parsed || [])
    .filter((key) => regex.test(String(key.displayName || '')))
    .sort((a, b) => String(b.updateTime || '').localeCompare(String(a.updateTime || '')))

  for (const candidate of candidates) {
    const keyName = String(candidate.name || '')
    if (!keyName) continue
    const detailRaw = run(
      'gcloud',
      ['services', 'api-keys', 'describe', keyName, `--project=${projectId}`, '--format=json'],
      rootDir,
    )
    const detail = JSON.parse(detailRaw)
    const targets = new Set((detail.restrictions?.apiTargets || []).map((target) => target.service))
    if (!targets.has('identitytoolkit.googleapis.com')) continue
    if (!targets.has('securetoken.googleapis.com')) continue
    if (detail.restrictions?.serverKeyRestrictions?.allowedIps?.length) continue
    if (detail.restrictions?.iosKeyRestrictions?.allowedBundleIds?.length) continue
    if (detail.restrictions?.androidKeyRestrictions?.allowedApplications?.length) continue
    if (detail.restrictions?.browserKeyRestrictions?.allowedReferrers?.length) continue

    const keyString = run(
      'gcloud',
      ['services', 'api-keys', 'get-key-string', keyName, `--project=${projectId}`, '--format=value(keyString)'],
      rootDir,
    )
    return {
      keyString,
      keyName,
      displayName: String(detail.displayName || candidate.displayName || ''),
      origin,
    }
  }
  throw new Error(
    `No native-capable Identity key found in project ${projectId} using regex '${nameRegex}'.`,
  )
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

async function resolveNativeApiKey() {
  if (process.env.IOS_NATIVE_GCP_API_KEY) {
    await verifyProvidedApiKeyForOrigin(process.env.IOS_NATIVE_GCP_API_KEY, nativeOriginForKeyCheck)
    return {
      apiKey: process.env.IOS_NATIVE_GCP_API_KEY,
      source: 'IOS_NATIVE_GCP_API_KEY',
      keyName: '',
    }
  }

  if (process.env.VITE_GCP_API_KEY) {
    try {
      await verifyProvidedApiKeyForOrigin(process.env.VITE_GCP_API_KEY, nativeOriginForKeyCheck)
      return {
        apiKey: process.env.VITE_GCP_API_KEY,
        source: 'VITE_GCP_API_KEY',
        keyName: '',
      }
    } catch {
      // fallback to discovery
    }
  }

  const discovered = discoverGcpNativeIdentityKey(
    gcpProjectForNativeKey,
    nativeKeyDisplayNameRegex,
    nativeOriginForKeyCheck,
  )
  await verifyProvidedApiKeyForOrigin(discovered.keyString, nativeOriginForKeyCheck)
  return {
    apiKey: discovered.keyString,
    source: `gcloud:${discovered.displayName}`,
    keyName: discovered.keyName,
  }
}

function buildNativeShellWithApiKey(apiKey) {
  run('npm', ['run', 'build:mobile'], frontendDir, { VITE_GCP_API_KEY: apiKey })
  run('npm', ['run', 'sync:ios'], frontendDir, { VITE_GCP_API_KEY: apiKey })
  restoreVendoredCapacitorSpmPackage()
  run(
    path.join(rootDir, 'mobile', 'scripts', 'build-ios-nokeychain.sh'),
    [],
    rootDir,
    { VITE_GCP_API_KEY: apiKey },
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

async function fetchOtpWithResend(browser, tag) {
  const resendButton = await browser.$('button=Resend Code')
  const attempts = 3

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await pollTestmailOtp(tag, 90000)
    } catch (error) {
      if (attempt === attempts) throw error
      if (await resendButton.isExisting()) {
        await resendButton.click()
        await delay(1500)
      }
    }
  }

  throw new Error('Timed out waiting for Testmail OTP.')
}

async function ensureSwitchEnabled(browser, index) {
  const toggles = await browser.$$(`button[role='switch']`)
  if (!toggles[index]) {
    throw new Error(`Expected signup switch index ${index} not found.`)
  }
  const checked = await toggles[index].getAttribute('aria-checked')
  if (checked !== 'true') {
    await toggles[index].click()
  }
}

async function assertCookieBannerHidden(browser) {
  const cookieBannerHeading = await browser.$('h3=Cookie Preferences')
  if (await cookieBannerHeading.isExisting()) {
    throw new Error('Cookie banner is visible in native iOS flow; expected hidden.')
  }
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
  const healthUrl = `${webOrigin.replace(/\/+$/, '')}/signup`

  try {
    await waitForHttpOk(healthUrl, 5000)
    return { proc: null, stream: null, startedLocalServer: false }
  } catch {
    if (!autoStartWebServer) {
      throw new Error(`Frontend dev server is not reachable at ${healthUrl} and IOS_START_WEB_SERVER=false.`)
    }
  }

  const webLogStream = fs.createWriteStream(webLogPath, { flags: 'w' })
  const parsedOrigin = new URL(webOrigin)
  const webPort = parsedOrigin.port || '5175'
  const webHost = parsedOrigin.hostname || 'localhost'
  const webProc = spawn(
    'npm',
    ['run', 'dev', '--', '--host', webHost, '--port', webPort],
    {
      cwd: frontendDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  webProc.stdout.pipe(webLogStream)
  webProc.stderr.pipe(webLogStream)

  await waitForHttpOk(healthUrl, 120000)
  return { proc: webProc, stream: webLogStream, startedLocalServer: true }
}

async function main() {
  fs.mkdirSync(artifactsDir, { recursive: true })
  fs.mkdirSync(appiumHomeDir, { recursive: true })
  assertPrerequisites()
  ensureXcuitestDriver()
  let resolvedApiKey = null

  if (!useWebOrigin) {
    resolvedApiKey = await resolveNativeApiKey()
    process.env.VITE_GCP_API_KEY = resolvedApiKey.apiKey
    if (autoBuildNativeShell) {
      buildNativeShellWithApiKey(resolvedApiKey.apiKey)
    } else if (!fs.existsSync(appPath)) {
      throw new Error('iOS app artifact missing and IOS_AUTO_BUILD_NATIVE_SHELL=false.')
    }
  }

  const webServer = await ensureWebOriginReady()

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
  const tag = `iossignup${Date.now()}`
  const email = `${testmailNamespace}.${tag}@inbox.testmail.app`
  const password = `IosE2e!${Date.now().toString().slice(-6)}`
  const result = {
    email,
    simulator,
    appPath,
    startedAt: new Date().toISOString(),
    status: 'failed',
    finalUrl: '',
    webviewContext: '',
    webOrigin: useWebOrigin ? webOrigin : appBaseUrl,
    startedWebServer: webServer.startedLocalServer,
    authKeySource: resolvedApiKey?.source || 'VITE_GCP_API_KEY',
    authKeyName: resolvedApiKey?.keyName || '',
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
      await browser.url(`${webOrigin.replace(/\/+$/, '')}/signup`)
    } else {
      await browser.waitUntil(
        async () => {
          const loginEmail = await browser.$('#email')
          return loginEmail.isExisting()
        },
        { timeout: 120000, interval: 1000, timeoutMsg: 'Login screen did not load in WEBVIEW.' },
      )
      const signupLink = await browser.$(`a[href^='/signup']`)
      if (await signupLink.isExisting()) {
        await signupLink.click()
      } else {
        await browser.url(`${appBaseUrl}/signup`)
      }
    }

    await (await browser.$('#signup-first-name')).waitForDisplayed({ timeout: 120000 })
    await assertCookieBannerHidden(browser)
    await (await browser.$('#signup-first-name')).setValue('IOS')
    await (await browser.$('#signup-last-name')).setValue('Automation')
    await (await browser.$('#signup-email')).setValue(email)
    await (await browser.$('#signup-password')).setValue(password)
    await (await browser.$('#confirm-password')).setValue(password)
    await ensureSwitchEnabled(browser, 0)
    await ensureSwitchEnabled(browser, 1)
    await (await browser.$('button=Create account')).click()

    await (await browser.$('h2=Verify Your Email')).waitForDisplayed({ timeout: 120000 })
    const otp = await fetchOtpWithResend(browser, tag)
    const codeInput = await browser.$(`input[placeholder='123456']`)
    await codeInput.setValue(otp)
    await (await browser.$('button=Validate')).click()

    await browser.waitUntil(
      async () => {
        const url = await browser.getUrl()
        return url.includes('/plan-selection') || url.includes('/pricing') || url.includes('/dashboard')
      },
      { timeout: 180000, interval: 2000, timeoutMsg: 'Post-verify route did not reach /plan-selection, /pricing, or /dashboard.' },
    )

    result.finalUrl = await browser.getUrl()
    result.status = 'passed'
    result.finishedAt = new Date().toISOString()
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`)
    process.stdout.write(`ios signup e2e passed: ${result.finalUrl}\n`)
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
  process.stderr.write(`ios signup e2e failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
