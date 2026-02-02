import fs from 'fs'
const name = process.argv[2] || 'new-page'

const template = `<logic>
  $title = "${name.toUpperCase()}"
  $bg = "#1e1f20"
</logic>

<template>
  <div class="h-screen flex items-center justify-center">
    <h1 class="text-4xl font-light tracking-[1em]">${name.toUpperCase()}</h1>
  </div>
</template>`

fs.writeFileSync(`${name}.letswhim`, template)
console.log(`✅ File ${name}.letswhim berhasil dirakit, Founder!`)