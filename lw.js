#!/usr/bin/env node
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIRS = {
  src: path.join(__dirname, 'start', 'pages'),
  comp: path.join(__dirname, 'start', 'components'),
  public: path.join(__dirname, 'public'),
  dist: path.join(__dirname, 'dist')
};

async function compilerLetsWhim(content) {
  try {
    let vars = { 
      title: "letswhim - Framework", 
      desc: "LetsWhim is a Human-Readable Static Site Generator (SSG) with a Terminal UI interface. Built on Node.js for Digital PR & Developers to build hacker-style portfolios instantly.",
      layout: "terminal", 
      outputLines: [], 
      commands: { clear: "CLEAR_window" },
      welcomeMessage: "LetsWhim Core [v1.0.0] - System Online."
    };

    const logic = content.match(/<logic>([\s\S]*?)<\/logic>/i)?.[1] || "";
    let template = content.match(/<template>([\s\S]*?)<\/template>/i)?.[1] || "";

    let transpiledLogic = logic
      .replace(/atur\s+(\w+)\s*=\s*/g, 'var $1 = vars.$1 = ')
      .replace(/perintah\s+(["'])(.*?)\1\s*->\s*(.+)/g, 'vars.commands[`$2`] = $3;') 
      .replace(/tunggu\s+/g, 'await ')              
      .replace(/ambil\((.*?)\)/g, 'await (await fetch($1)).json()')
      .replace(/jika\s*\((.*?)\)\s*{/g, 'if ($1) {') 
      .replace(/lainnya\s+jika\s*\((.*?)\)\s*{/g, '} else if ($1) {') 
      .replace(/lainnya\s*{/g, '} else {')
      .replace(/catat\s+["']([^"']+)["']/g, 'console.log("📝 [LOG]: $1")')
      .replace(/tulis\s+["']([^"']+)["']/g, 'vars.outputLines.push("$1")'); 

    try {
      const executeLogic = new Function('vars', 'fetch', `return (async () => { ${transpiledLogic} })()`);
      await executeLogic(vars, fetch); 
    } catch (e) { console.error(`⚠️ Error Logic: ${e.message}`); }

    let hasComponents = true;
    while (hasComponents) {
      const match = template.match(/<(?:whim|komponen):(\w+)\s*([\s\S]*?)\s*\/>/);
      if (!match) { hasComponents = false; continue; }
      const [fullTag, compName, attrString] = match;
      try {
        const compPath = path.join(DIRS.comp, `${compName}.letswhim`);
        let compTemplate = (await fsp.readFile(compPath, 'utf-8')).match(/<template>([\s\S]*?)<\/template>/i)?.[1] || "";
        const attrMatches = attrString.matchAll(/(\w+)=["'](.*?)["']/g);
        for (const attr of attrMatches) compTemplate = compTemplate.replace(new RegExp(`{{\\$?${attr[1]}}}`, 'g'), attr[2]);
        template = template.replace(fullTag, compTemplate);
      } catch (err) { template = template.replace(fullTag, ""); }
    }

    const terminalHTML = vars.outputLines
        .map(line => `<div class="mb-2 text-gray-500 dark:text-gray-400 font-mono text-sm"><span class="text-emerald-500 mr-2">➜</span>${line}</div>`)
        .join('');
    template = template.replace(/{terminal}/g, terminalHTML);
    template = template.replace(/\{\{([\s\S]*?)\}\}/g, (m, c) => {
      try { return new Function('vars', `with(vars) { return ${c} }`)(vars) || ""; } catch (e) { return ""; }
    });

    return { content: template, meta: vars };
  } catch (error) { return { content: error.message, meta: {} }; }
}

function wrapInLayout(innerContent, meta) {
    const commandsJSON = JSON.stringify(meta.commands);
    return `<!DOCTYPE html>
    <html lang="en" class="dark">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${meta.title}</title>
        <meta name="description" content="${meta.desc}">
        <meta name="theme-color" content="#1e1e1e">
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <script src="https://cdn.tailwindcss.com"></script>
        <script>tailwind.config={darkMode:'class',theme:{extend:{colors:{macDark:'#1e1e1e',macLight:'#ffffff',macBorder:'#333333'}}}}</script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
            body{font-family:'Geist Mono',monospace;}.font-sans{font-family:'Inter',sans-serif;}
            ::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#444;border-radius:3px;}
            .fade-in{animation:fadeIn 0.5s ease-out;}@keyframes fadeIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        </style>
    </head>
    <body class="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-gray-200 dark:bg-[#0d0d0d] selection:bg-emerald-500/30">
        <div class="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl bg-macLight/95 dark:bg-macDark/95 backdrop-blur-xl border border-gray-300 dark:border-macBorder flex flex-col h-[90vh] md:h-[750px]">
            <div class="bg-gray-100 dark:bg-[#252525] px-4 py-3 border-b border-gray-200 dark:border-black/40 flex items-center justify-between shrink-0">
                <div class="flex gap-2"><div class="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10"></div><div class="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10"></div><div class="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10"></div></div>
                <div class="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-widest uppercase opacity-60">LetsWhim Core</div>
                <button id="theme-btn" class="text-xs text-gray-400 hover:text-black dark:hover:text-white transition p-1">◐</button>
            </div>
            <div class="p-6 md:p-10 overflow-y-auto flex-1 text-gray-800 dark:text-gray-200" id="terminal-window">
                <div class="mb-8 opacity-95">${innerContent}</div>
                <div id="history" class="space-y-3 mb-4 text-sm">
                    <div class="text-xs text-gray-400 dark:text-gray-600 mb-6 font-bold tracking-widest uppercase border-b border-gray-200 dark:border-white/5 pb-2">${meta.welcomeMessage}</div>
                </div>
                <div class="flex items-center gap-3 mt-auto pt-4 pb-2">
                    <span class="text-emerald-600 dark:text-emerald-500 font-bold">➜</span>
                    <input type="text" id="cmd" autocomplete="off" class="bg-transparent border-none text-gray-900 dark:text-white w-full focus:outline-none placeholder-gray-400 dark:placeholder-gray-700 font-medium" placeholder="Type 'help' for commands...">
                </div>
            </div>
            <div class="py-3 text-center text-[10px] text-gray-500 dark:text-gray-600 bg-gray-50 dark:bg-[#151515] border-t border-gray-200 dark:border-white/5 shrink-0 font-sans font-medium">&copy; 2026 LetsWhim. Architected by Rifky.</div>
        </div>
        <script>
            const html=document.documentElement;const btn=document.getElementById('theme-btn');
            if(localStorage.theme==='light'){html.classList.remove('dark');}
            btn.addEventListener('click',()=>{html.classList.toggle('dark');localStorage.theme=html.classList.contains('dark')?'dark':'light';});
            const input=document.getElementById('cmd');const history=document.getElementById('history');const term=document.getElementById('terminal-window');const commands=${commandsJSON};
            term.addEventListener('click',(e)=>{if(window.getSelection().toString().length===0)input.focus();});
            input.addEventListener('keydown',(e)=>{if(e.key==='Enter'){const val=input.value.trim();const key=val.toLowerCase();if(val){history.innerHTML+='<div class="flex gap-3 mb-2 mt-4"><span class="text-blue-500 font-bold">➜</span> <span class="font-medium">'+val+'</span></div>';if(commands[key]){if(commands[key]==='CLEAR_window'){history.innerHTML='';}else{history.innerHTML+='<div class="mb-6 fade-in ml-6 border-l-2 border-emerald-500/30 pl-4 text-sm leading-relaxed">'+commands[key]+'</div>';}}else{history.innerHTML+='<div class="text-red-500 mb-2 fade-in ml-6 text-sm">Command not found. Try <span class="font-bold underline cursor-pointer" onclick="input.value=\\'help\\';input.focus()">help</span></div>';}}input.value='';setTimeout(()=>term.scrollTop=term.scrollHeight,10);}});
            
            // SERVICE WORKER KILLER (CLEANER)
            if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(regs){for(let reg of regs){reg.unregister();console.log('🧹 SW Cleaned');}});}
        </script>
    </body></html>`;
}

async function gas() {
    try { await fsp.rm(DIRS.dist, { recursive: true, force: true }); } catch (e) {}
    try { await fsp.mkdir(DIRS.dist, { recursive: true }); } catch (e) {}
    try { const files = await fsp.readdir(DIRS.public); for (const f of files) await fsp.copyFile(path.join(DIRS.public, f), path.join(DIRS.dist, f)); } catch (e) {}
    const pages = await fsp.readdir(DIRS.src);
    for (const page of pages) {
        if (!page.endsWith('.letswhim')) continue;
        const raw = await fsp.readFile(path.join(DIRS.src, page), 'utf-8');
        const { content, meta } = await compilerLetsWhim(raw);
        await fsp.writeFile(path.join(DIRS.dist, page.replace('.letswhim', '.html')), wrapInLayout(content, meta));
        console.log(`✅ ${page}`);
    }
}

const args = process.argv.slice(2);
if (args.includes('--watch')) {
    console.log("👀 Watching start/ for changes...");
    fs.watch(path.join(__dirname, 'start'), { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.letswhim')) {
            console.log(`🚀 Rebuilding ${filename}...`);
            gas();
        }
    });
}
gas();