class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;
    this.ast = { logic: [], styles: [], template: [] };
  }

  parse() {
    while (this.current < this.tokens.length) {
      const token = this.tokens[this.current];
      if (token.type === 'TAG_OPEN') {
        this.current++;
        if (token.value === 'logic') this.collectContent('logic');
        else if (token.value === 'style') this.collectContent('styles');
        else if (token.value === 'template') this.collectContent('template');
      } else {
        this.current++;
      }
    }
    return this.ast;
  }

  collectContent(astKey) {
    while (this.current < this.tokens.length) {
      const token = this.tokens[this.current];
      if (token.type === 'TAG_CLOSE') {
        this.current++;
        break;
      }
      // Ambil isinya (TEXT)
      if (token.type === 'TEXT') {
        this.ast[astKey].push(token.value);
      }
      this.current++;
    }
  }
}
module.exports = Parser;