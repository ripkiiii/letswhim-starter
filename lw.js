import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

// SETUP DIREKTORI
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// KONFIGURASI
const PORT = 2001;
const PAGES_DIR = path.join(__dirname, 'start', 'pages');
const COMPONENTS_DIR = path.join(__dirname, 'start', 'components');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DIST_DIR = path.join(__dirname, 'dist');

// Pastikan folder dist ada
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);

function readFileSafe(filePath) {
    try { return fs.readFileSync(filePath, 'utf8'); } 
    catch (err) { return null; }
}

// === 🔥 THE CORE ENGINE ===
function parseLlang(content) {
    const logicMatch = content.match(/<logic>([\s\S]*?)<\/logic>/);
    let templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
    
    let logicCode = logicMatch ? logicMatch[1] : '';
    let templateHtml = templateMatch ? templateMatch[1] : '';

    // 1. Handle Components
    if (fs.existsSync(COMPONENTS_DIR)) {
        const components = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.lw'));
        components.forEach(compFile => {
            const compName = compFile.replace('.lw', '');
            const compContent = readFileSafe(path.join(COMPONENTS_DIR, compFile));
            if (compContent) {
                const compTemplateMatch = compContent.match(/<template>([\s\S]*?)<\/template>/);
                if (compTemplateMatch) {
                    const regex = new RegExp(`<${compName}\\s*/>`, 'g');
                    templateHtml = templateHtml.replace(regex, compTemplateMatch[1]);
                }
            }
        });
    }

    // 2. SSR VARIABLE INJECTION
    const ssrVariables = {};
    logicCode.split('\n').forEach(line => {
        const aturMatch = line.match(/atur\s+(\w+)\s*=\s*["'](.*?)["'];/);
        if (aturMatch) ssrVariables[aturMatch[1]] = aturMatch[2];
    });

    for (const [key, value] of Object.entries(ssrVariables)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        templateHtml = templateHtml.replace(regex, value);
    }

    // 3. ⚡ THE TRANSPILER
    let clientJs = logicCode
        .replace(/atur\s+(\w+)\s*=\s*/g, 'var $1 = vars.$1 = ')
        .replace(/jika\s*\((.*?)\)\s*{/g, 'if ($1) {') 
        .replace(/lainnya\s+jika\s*\((.*?)\)\s*{/g, '} else if ($1) {') 
        .replace(/lainnya\s*{/g, '} else {')
        .replace(/ulangi\s*\((.*?)\s+dari\s+(.*?)\)\s*{/g, 'for (let $1 of $2) {')
        .replace(/selama\s*\((.*?)\)\s*{/g, 'while ($1) {')
        .replace(/\btunggu\b/g, 'await')
        .replace(/ambil\((.*?)\)/g, 'await (await fetch($1)).json()')
        .replace(/catat\s+["']([^"']+)["']/g, 'console.log("📝 [LOG]: $1")')
        .replace(/pajang\s+(.*)/g, 'console.log($1)')
        .replace(/tulis\s+["']([^"']+)["']/g, 'vars.outputLines.push("$1")')
        .replace(/\bbersihkan\b/g, 'console.clear()')
        .replace(/perintah\s+(["'])(.*?)\1\s*->\s*(.+)/g, 'vars.commands["$2"] = async function() { $3 };');

    return { html: templateHtml, script: clientJs, meta: ssrVariables };
}

// LAYOUT SYSTEM
function wrapInLayout(body, meta, clientScript) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${meta.title || 'LetsWhim App'}</title>
    <meta name="description" content="${meta.desc || 'Built with L-Lang Engine'}">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <style>
        :root { 
            --surf: #00ffcc; --bg: #0b0e14; --text: #e0e6ed; --text-muted: #888;
            --card: #1e1e20; --border: rgba(255, 255, 255, 0.05);
            --nav-bg: rgba(30, 30, 32, 0.85);
        }
        body.light-mode {
            --bg: #ffffff; --text: #1a1a1a; --text-muted: #555;
            --card: #f4f4f5; --border: #e4e4e7; --nav-bg: rgba(255, 255, 255, 0.85);
        }
        body {
            margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: var(--bg); color: var(--text); line-height: 1.6; overflow-x: hidden;
            transition: background 0.3s ease, color 0.3s ease;
        }
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        section { animation: fadeIn 0.6s ease-out; }
    </style>
</head>
<body>
    ${body}
    <script>
        const vars = { commands: {}, outputLines: [] };
        (async function() {
            try {
                ${clientScript}
            } catch (e) {
                console.error("L-Lang Runtime Error:", e);
            }
            Object.keys(vars.commands).forEach(cmd => {
                window[cmd] = vars.commands[cmd];
            });
        })();
    </script>
</body>
</html>`;
}

// BUILD & SERVE
function build() {
    console.log("⚙️  Starting L-Lang Engine v2.0.1 (FULL POWER)...");

    // 1. Copy Public Assets ke Dist (Penting buat Cloudflare!)
    if (fs.existsSync(PUBLIC_DIR)) {
        fs.readdirSync(PUBLIC_DIR).forEach(file => {
            const src = path.join(PUBLIC_DIR, file);
            const dest = path.join(DIST_DIR, file);
            if (fs.lstatSync(src).isFile()) {
                fs.copyFileSync(src, dest);
            }
        });
    }

    // 2. Render Pages
    if (!fs.existsSync(PAGES_DIR)) return;
    const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.lw'));
    files.forEach(file => {
        const content = readFileSafe(path.join(PAGES_DIR, file));
        if (!content) return;
        const { html, script, meta } = parseLlang(content);
        const finalHtml = wrapInLayout(html, meta, script);
        fs.writeFileSync(path.join(DIST_DIR, file.replace('.lw', '.html')), finalHtml);
        console.log(`✅ Compiled: ${file.replace('.lw', '.html')}`);
    });
}

function startServer() {
    const server = http.createServer((req, res) => {
        const publicFilePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
        if (fs.existsSync(publicFilePath) && fs.statSync(publicFilePath).isFile()) {
            let contentType = 'text/plain';
            if (publicFilePath.endsWith('.svg')) contentType = 'image/svg+xml';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(fs.readFileSync(publicFilePath));
            return;
        }
        let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
        if (!filePath.endsWith('.html')) filePath += '.html';
        if (fs.existsSync(filePath)) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - Not Found</h1>');
        }
    });
    server.listen(PORT, () => console.log(`\n🏄 SURFBOARD v2.0.1 READY!\n🚀 Local: http://localhost:${PORT}`));
}

// --- JALANKAN PROSES ---
build();

// CEK: Apakah sedang berjalan di Cloudflare Pages?
if (process.env.CF_PAGES === '1') {
    console.log("\n✅ BUILD SUCCESS! Cloudflare deployment in progress...");
    process.exit(0); // WAJIB biar Cloudflare tau build udah beres
} else {
    startServer();
}