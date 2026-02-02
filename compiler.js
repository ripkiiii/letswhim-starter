import fs from 'fs/promises';

export async function compileWhim(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    let vars = { 
      title: "letswhim - Let's just start", 
      desc: "Minimalist frontend framework.",
      url: "https://letswhim.pages.dev",
      profil: { name: "Rifky", avatar_url: "https://github.com/guug-labs.png" } 
    };

    const logic = content.match(/<logic>([\s\S]*?)<\/logic>/i)?.[1] || "";
    let template = content.match(/<template>([\s\S]*?)<\/template>/i)?.[1] || "";

    let transpiledLogic = logic
      .replace(/atur\s+(\w+)\s*=\s*/g, 'vars.$1 = ') 
      .replace(/tunggu\s+/g, 'await ')              
      .replace(/ambil\((.*?)\)/g, 'await (await fetch($1)).json()');

    try {
      const executeLogic = new Function('vars', 'fetch', `return (async () => { ${transpiledLogic} })()`);
      await executeLogic(vars, fetch); 
    } catch (e) { }

    let hasComponents = true;
    while (hasComponents) {
      const match = template.match(/<whim:(\w+)\s*([\s\S]*?)\s*\/>/);
      if (!match) { hasComponents = false; continue; }
      const [fullTag, compName, attrString] = match;
      try {
        const compContent = await fs.readFile(`./components/${compName}.letswhim`, 'utf-8');
        let compTemplate = compContent.match(/<template>([\s\S]*?)<\/template>/i)?.[1] || compContent;
        const attrMatches = attrString.matchAll(/(\w+)=["'](.*?)["']/g);
        for (const attr of attrMatches) compTemplate = compTemplate.replace(new RegExp(`{{\\$?${attr[1]}}}`, 'g'), attr[2]);
        template = template.replace(fullTag, compTemplate);
      } catch (err) { template = template.replace(fullTag, ""); }
    }

    template = template.replace(/\{\{([\s\S]*?)\}\}/g, (m, code) => {
      try { return new Function('vars', `with(vars) { return ${code} }`)(vars) || ""; } catch (e) { return ""; }
    });

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${vars.title}</title>
      <meta name="description" content="${vars.desc}">
      <link rel="canonical" href="${vars.url}">
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"LetsWhim","url":"${vars.url}"}</script>

      <link rel="icon" type="image/svg+xml" href="/public/favicon.svg">
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/lucide@latest"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
      <style>
        :root { --bg: #1e1f20; --text: #ffffff; --border: rgba(255,255,255,0.1); --inverse-bg: #ffffff; --inverse-text: #000000; }
        body.light-mode { --bg: #ffffff; --text: #1e1f20; --border: rgba(0,0,0,0.1); --inverse-bg: #1e1f20; --inverse-text: #ffffff; }
        body { background: var(--bg); color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; transition: 0.3s; margin: 0; }
        .glass { background: rgba(125,125,125,0.03); border: 1px solid var(--border); backdrop-filter: blur(12px); }
        .text-huge { font-size: clamp(3rem, 8vw, 6rem); line-height: 0.95; letter-spacing: -0.04em; }
        #toast { visibility: hidden; min-width: 250px; background: var(--inverse-bg); color: var(--inverse-text); border-radius: 99px; padding: 14px 28px; position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%) translateY(20px); font-size: 14px; font-weight: 600; opacity: 0; transition: 0.4s; display: flex; align-items: center; gap: 10px; z-index: 100; }
        #toast.show { visibility: visible; opacity: 1; transform: translateX(-50%) translateY(0); }
        
        /* --- LOGIC ICON MATAHARI & BULAN --- */
        .icon-moon { display: none; } /* Default: Bulan Ngumpet */
        body.light-mode .icon-sun { display: none; } /* Light Mode: Matahari Ngumpet */
        body.light-mode .icon-moon { display: block; } /* Light Mode: Bulan Muncul */
      </style>
    </head>
    <body>
      <main>${template}</main>
      <div id="toast"><i data-lucide="check-circle" class="w-4 h-4"></i><span id="toast-msg"></span></div>
      <script>
        lucide.createIcons();
        if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
        window.toggleTheme = () => {
          document.body.classList.toggle('light-mode');
          localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        }
        window.showToast = (msg) => {
          const t = document.getElementById("toast");
          document.getElementById("toast-msg").innerText = msg;
          t.className = "show";
          setTimeout(() => { t.className = ""; }, 3000);
        }
      </script>
    </body>
    </html>`;
  } catch (error) { return error.message; }
}