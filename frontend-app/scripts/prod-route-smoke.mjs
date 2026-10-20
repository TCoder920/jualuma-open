import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { chromium } from 'playwright'

const frontendDir = path.resolve(new URL('..', import.meta.url).pathname)
const distDir = path.join(frontendDir, 'dist')
const artifactDir = path.resolve(frontendDir, '..', '.codex-artifacts', 'prod-route-smoke')
const routes = ['/login', '/signup', '/reset-password', '/dashboard', '/ai-assistant', '/does-not-exist']

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('Missing frontend-app/dist. Run `npm run build` first.')
  process.exit(1)
}

fs.mkdirSync(artifactDir, { recursive: true })

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const sendFile = (response, filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  response.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  fs.createReadStream(filePath).pipe(response)
}

const server = http.createServer((request, response) => {
  const requestPath = new URL(request.url || '/', 'http://127.0.0.1').pathname
  const normalized = decodeURIComponent(requestPath).replace(/^\/+/, '')
  const filePath = path.join(distDir, normalized)
  if (normalized && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(response, filePath)
    return
  }
  sendFile(response, path.join(distDir, 'index.html'))
})

const listen = () =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve(address)
    })
  })

const address = await listen()
const port = typeof address === 'object' && address ? address.port : 0
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const failures = []
const results = []

try {
  for (const route of routes) {
    const pageErrors = []
    const consoleErrors = []
    const onPageError = (error) => pageErrors.push(error.stack || error.message)
    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    }
    page.on('pageerror', onPageError)
    page.on('console', onConsole)

    const url = `http://127.0.0.1:${port}${route}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1500)

    const state = await page.evaluate(() => ({
      path: location.pathname,
      title: document.title,
      bodyText: document.body.innerText.replace(/\s+/g, ' ').trim(),
      emptyRoot: (document.getElementById('root')?.childElementCount || 0) === 0,
      hasBrandLogo: Array.from(document.images).some((img) =>
        (img.getAttribute('src') || '').includes('jualuma-logo-main'),
      ),
      bootstrap: window.__JUALUMA_BOOTSTRAP__ || null,
    }))

    const label = route === '/' ? 'root' : route.replaceAll('/', '_').replace(/^_/, '')
    await page.screenshot({
      path: path.join(artifactDir, `${label}.png`),
      fullPage: true,
    })

    const result = {
      route,
      ...state,
      pageErrors,
      consoleErrors,
    }
    results.push(result)

    if (pageErrors.length > 0) {
      failures.push(`${route}: pageerror`)
    }
    if (state.emptyRoot) {
      failures.push(`${route}: empty root`)
    }
    if (!state.bodyText) {
      failures.push(`${route}: blank body text`)
    }
    if (route === '/login' && !state.hasBrandLogo) {
      failures.push('/login: missing jualuma main logo')
    }

    page.off('pageerror', onPageError)
    page.off('console', onConsole)
  }
} finally {
  fs.writeFileSync(path.join(artifactDir, 'results.json'), JSON.stringify(results, null, 2))
  await browser.close()
  server.close()
}

if (failures.length > 0) {
  console.error('Production route smoke failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Production route smoke passed.')
