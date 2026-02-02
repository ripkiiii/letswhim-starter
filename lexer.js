class Lexer {
  constructor(input) {
    this.input = input || "";
  }

  tokenize() {
    const tokens = [];
    let cursor = 0;

    while (cursor < this.input.length) {
      // Regex yang lebih "sabar" sama spasi dan case-insensitive
      const tagMatch = this.input.substr(cursor).match(/^<\/?(logic|style|template)[\s>]/i);

      if (tagMatch) {
        const fullTagMatch = this.input.substr(cursor).match(/^<[^>]+>/);
        const fullTag = fullTagMatch[0];
        const tagName = tagMatch[1].toLowerCase();
        const isClose = fullTag.startsWith('</');

        tokens.push({
          type: isClose ? 'TAG_CLOSE' : 'TAG_OPEN',
          value: tagName
        });
        cursor += fullTag.length;
        continue;
      }

      // Ambil konten teks sampai ketemu tag struktur berikutnya
      let nextBracket = this.input.indexOf('<', cursor + 1);
      if (nextBracket === -1) nextBracket = this.input.length;

      const textContent = this.input.slice(cursor, nextBracket);
      if (textContent.length > 0) {
        tokens.push({ type: 'TEXT', value: textContent });
      }
      cursor = nextBracket;
    }
    return tokens;
  }
}
module.exports = Lexer;