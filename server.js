import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { compileWhim } from './compiler.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const app = new Hono()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 1. PUBLIC ASSETS
app.get('/public/*', async (c) => {
  const relativePath = c.req.path.substring(1) 
  const fullPath = path.join(process.cwd(), relativePath)
  try {
    const content = await fs.readFile(fullPath)
    if (fullPath.endsWith('.svg')) c.header('Content-Type', 'image/svg+xml')
    if (fullPath.endsWith('.jpg')) c.header('Content-Type', 'image/jpeg')
    return c.body(content)
  } catch (e) {
    return c.notFound()
  }
})

// 2. DYNAMIC ROUTING (SMART FIX)
app.get('/:page?', async (c) => {
  let page = c.req.param('page') || 'index'
  
  // FIX: Hapus .html kalau user/navbar minta file .html
  // examples.html -> examples
  page = page.replace('.html', '')

  const filePath = `${page}.letswhim`

  try {
    await fs.access(filePath)
    const html = await compileWhim(filePath)
    return c.html(html)
  } catch (err) {
    // Error Handling Ganteng
    return c.html(`
      <div style="font-family:sans-serif; text-align:center; padding:100px; background:#1e1f20; color:white; height:100vh;">
        <h1 style="font-size:3rem; margin-bottom:10px;">404</h1>
        <p style="opacity:0.6;">File <b>${filePath}</b> gak ketemu, Rifky.</p>
        <p style="font-size:0.8rem; opacity:0.3; margin-top:20px;">Tips: Pastikan nama file .letswhim sesuai dengan URL.</p>
        <a href="/" style="color:#3b82f6; text-decoration:none; border-bottom:1px solid #3b82f6; margin-top:30px; display:inline-block;">Balik ke Home</a>
      </div>
    `, 404)
  }
})

// 3. HOT RELOAD
app.get('/hot-whim', (c) => {
  return c.streamText(async (stream) => {
    while (true) {
      await new Promise(r => setTimeout(r, 1000))
      await stream.write('ping\n')
    }
  })
})

console.log("🌑 LetsWhim v2.9 Dev Server Running...")
console.log("👉 http://localhost:1234")

serve({ fetch: app.fetch, port: 1234 })