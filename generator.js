class Generator {
  constructor(ast) {
    this.ast = ast;
  }

  generate() {
    let stateProps = [];
    let rawScript = "";

    // 1. Logic Processing
    const logicText = (this.ast.logic || []).join('\n');
    logicText.split(/\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('$')) {
        const parts = trimmed.split('=');
        const key = parts[0].replace('$', '').trim();
        const value = parts.slice(1).join('=').trim();
        if (key && value) stateProps.push(`${key}: ${value}`);
      } else if (trimmed.length > 0) {
        rawScript += line + '\n';
      }
    });

    // 2. Template Processing (Interpolation fix)
    const templateContent = (this.ast.template || []).join(' ');
    let templateString = `"${templateContent.replace(/\n/g, ' ').replace(/"/g, '\\"').trim()}"`;
    
    // Ganti {{ $var }} jadi JS Variable
    templateString = templateString.replace(/\{\{\s*\$([a-zA-Z0-9_]+)\s*\}\}/g, '" + (state.$1 || "") + "');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GUUG Labs - Letswhim Engine</title>
  <style>
    * { box-sizing: border-box; }
    ${(this.ast.styles || []).join('\n')}
  </style>
</head>
<body style="margin:0;">
  <div id="app"></div>
  <script>
    const state = new Proxy({ ${stateProps.join(', ')} }, {
      set(target, key, value) {
        target[key] = value;
        render();
        return true;
      }
    });
    window.state = state;

    ${rawScript}

    function render() {
      const content = ${templateString || '"<h1>Engine Online. Template Empty.</h1>"'};
      document.getElementById('app').innerHTML = content;
      console.log("Letswhim: Rendered successfully.");
    }
    
    // Auto start
    document.addEventListener('DOMContentLoaded', render);
  </script>
</body>
</html>`;
  }
}
module.exports = Generator;