// Usage: node scripts/shot.mjs <out.png> [url] [width] [height] [waitMs]
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

const [out = 'shot.png', url = 'http://localhost:5173', w = '1440', h = '810', wait = '1500'] = process.argv.slice(2)
const exe = ['/opt/pw-browsers/chromium'].find((p) => existsSync(p))
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(+wait)
await page.screenshot({ path: out })
await browser.close()
console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors')
