#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { compileWhim } from './compiler.js';

const command = process.argv[2];

// PERINTAH 1: lw dev
if (command === 'dev') {
  console.log("🚀 Starting LetsWhim Dev Server...");
  const server = spawn('node', ['server.js'], { stdio: 'inherit' });
  server.on('close', (code) => process.exit(code));
} 

// PERINTAH 2: lw build
else if (command === 'build') {
  (async () => {
    console.log("📦 Building for Production...");
    const domain = "https://letswhim.pages.dev"; 
    
    // 1. Bersihkan dist lama
    await fs.rm('./dist', { recursive: true, force: true }).catch(() => {});
    await fs.mkdir('./dist');
    
    const files = await fs.readdir('.');
    const whimFiles = files.filter(f => f.endsWith('.letswhim'));

    let sitemapEntries = "";

    // 2. Kompilasi file .letswhim ke .html
    for (const file of whimFiles) {
      const name = file.replace('.letswhim', '');
      console.log(`   Compiling ${name}...`);
      const html = await compileWhim(file);
      await fs.writeFile(`./dist/${name}.html`, html);
      sitemapEntries += `  <url><loc>${domain}/${name}.html</loc><priority>0.8</priority></url>\n`;
    }

    // 3. SEO & Sitemap Generation
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}</urlset>`;
    await fs.writeFile('./dist/sitemap.xml', sitemap);

    const robots = `User-agent: *\nAllow: /\nSitemap: ${domain}/sitemap.xml`;
    await fs.writeFile('./dist/robots.txt', robots);

    // 4. THE HYBRID COPY (ORGANIZED BUT GOOGLE-READY)
    try {
      // A. Copy semua isi public ke dist/public (Biar folder structure rapi)
      await fs.mkdir('./dist/public', { recursive: true });
      await fs.cp('./public', './dist/public', { recursive: true });

      // B. DUPLIKAT file verifikasi Google ke root dist (Biar Google langsung nemu)
      const googleFile = 'google98a5a08f0286b6c3.html';
      await fs.copyFile(`./public/${googleFile}`, `./dist/${googleFile}`);
      
      console.log("   ✅ Public assets organized and Google verification moved to root.");
    } catch (e) {
      console.log("   ⚠️ Gagal copy: Pastikan folder 'public' dan file Google lo sudah ada.");
    }

    console.log("✅ Build Success! LetsWhim v2.9 is Google-Ready.");
  })();
}