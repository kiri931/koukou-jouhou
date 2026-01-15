// -- Lexer / Tokenizer --
class Token {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
}

class Lexer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.current = input[0];
  }

  nextChar() {
    this.pos++;
    this.current = this.pos < this.input.length ? this.input[this.pos] : null;
  }

  skipWhitespace() {
    while (this.current && /\s/.test(this.current)) {
      this.nextChar();
    }
  }

  getToken() {
    this.skipWhitespace();
    if (!this.current) return new Token("EOF", null);

    // 数字
    if (/[0-9]/.test(this.current)) {
      let num = "";
      while (this.current && /[0-9]/.test(this.current)) {
        num += this.current;
        this.nextChar();
      }
      return new Token("NUMBER", parseInt(num, 10));
    }

    // 識別子 or keyword
    if (/[a-zA-Z_]/.test(this.current)) {
      let id = "";
      while (this.current && /[a-zA-Z_0-9]/.test(this.current)) {
        id += this.current;
        this.nextChar();
      }
      if (id === "int") return new Token("KW_INT", id);
      if (id === "if")  return new Token("KW_IF", id);
      if (id === "else") return new Token("KW_ELSE", id);
      if (id === "print") return new Token("KW_PRINT", id);
      return new Token("IDENT", id);
    }

    // operators / punctuation
    const ch = this.current;
    this.nextChar();
    switch (ch) {
      case '+': return new Token("PLUS", ch);
      case '-': return new Token("MINUS", ch);
      case '*': return new Token("MUL", ch);
      case '/': return new Token("DIV", ch);
      case '(': return new Token("LPAREN", ch);
      case ')': return new Token("RPAREN", ch);
      case '{': return new Token("LBRACE", ch);
      case '}': return new Token("RBRACE", ch);
      case ';': return new Token("SEMICOLON", ch);
      case '=':
        if (this.current === '=') {
          this.nextChar();
          return new Token("EQ", "==");
        }
        return new Token("ASSIGN", "=");
      case '<':
        return new Token("LT", "<");
      case '>':
        return new Token("GT", ">");
    }

    throw new Error("未知の文字: " + ch);
  }
}

// -- Parser & AST nodes --
class AST_Program {
  constructor(stmts) { this.stmts = stmts; }
}

class AST_VarDecl {
  constructor(name) { this.name = name; }
}

class AST_Assign {
  constructor(name, expr) { this.name = name; this.expr = expr; }
}

class AST_Print {
  constructor(expr) { this.expr = expr; }
}

class AST_If {
  constructor(cond, thenStmts, elseStmts) {
    this.cond = cond; this.thenStmts = thenStmts; this.elseStmts = elseStmts;
  }
}

class AST_BinOp {
  constructor(op, left, right) { this.op = op; this.left = left; this.right = right; }
}

class AST_Num {
  constructor(value) { this.value = value; }
}

class AST_Var {
  constructor(name) { this.name = name; }
}

class Parser {
  constructor(lexer) {
    this.lexer = lexer;
    this.cur = this.lexer.getToken();
  }

  eat(type) {
    if (this.cur.type === type) {
      this.cur = this.lexer.getToken();
    } else {
      throw new Error("Token type mismatch: expected " + type + ", got " + this.cur.type);
    }
  }

  parse() {
    const stmts = [];
    while (this.cur.type !== "EOF") {
      stmts.push(this.parseStmt());
    }
    return new AST_Program(stmts);
  }

  parseStmt() {
    if (this.cur.type === "KW_INT") {
      this.eat("KW_INT");
      const name = this.cur.value;
      this.eat("IDENT");
      this.eat("SEMICOLON");
      return new AST_VarDecl(name);
    }
    if (this.cur.type === "IDENT") {
      const name = this.cur.value;
      this.eat("IDENT");
      this.eat("ASSIGN");
      const expr = this.parseExpr();
      this.eat("SEMICOLON");
      return new AST_Assign(name, expr);
    }
    if (this.cur.type === "KW_PRINT") {
      this.eat("KW_PRINT");
      const expr = this.parseExpr();
      this.eat("SEMICOLON");
      return new AST_Print(expr);
    }
    if (this.cur.type === "KW_IF") {
      this.eat("KW_IF");
      this.eat("LPAREN");
      const cond = this.parseExpr();
      this.eat("RPAREN");
      this.eat("LBRACE");
      const thenStmts = [];
      while (this.cur.type !== "RBRACE") {
        thenStmts.push(this.parseStmt());
      }
      this.eat("RBRACE");
      let elseStmts = null;
      if (this.cur.type === "KW_ELSE") {
        this.eat("KW_ELSE");
        this.eat("LBRACE");
        elseStmts = [];
        while (this.cur.type !== "RBRACE") {
          elseStmts.push(this.parseStmt());
        }
        this.eat("RBRACE");
      }
      return new AST_If(cond, thenStmts, elseStmts);
    }
    if (
    this.cur.type === "NUMBER" ||
    this.cur.type === "IDENT" ||
    this.cur.type === "LPAREN"
  ) {
    const expr = this.parseExpr();
    this.eat("SEMICOLON");
    return new AST_ExprStmt(expr);
  }

  throw new Error("文の解析に失敗: " + this.cur.type);
  }

  parseExpr() {
    return this.parseAddSub();
  }

  parseAddSub() {
    let node = this.parseMulDiv();
    while (this.cur.type === "PLUS" || this.cur.type === "MINUS" ||
           this.cur.type === "LT" || this.cur.type === "GT" ||
           this.cur.type === "EQ") {
      const op = this.cur.value;
      const t = this.cur.type;
      this.eat(t);
      const right = this.parseMulDiv();
      node = new AST_BinOp(op, node, right);
    }
    return node;
  }

  parseMulDiv() {
    let node = this.parsePrimary();
    while (this.cur.type === "MUL" || this.cur.type === "DIV") {
      const op = this.cur.value;
      const t = this.cur.type;
      this.eat(t);
      const right = this.parsePrimary();
      node = new AST_BinOp(op, node, right);
    }
    return node;
  }

  parsePrimary() {
    if (this.cur.type === "NUMBER") {
      const v = this.cur.value;
      this.eat("NUMBER");
      return new AST_Num(v);
    }
    if (this.cur.type === "IDENT") {
      const name = this.cur.value;
      this.eat("IDENT");
      return new AST_Var(name);
    }
    if (this.cur.type === "LPAREN") {
      this.eat("LPAREN");
      const node = this.parseExpr();
      this.eat("RPAREN");
      return node;
    }
    throw new Error("式の解析に失敗: " + this.cur.type);
  }
}

// -- Interpreter / Evaluator --
class Interpreter {
  static run(src) {
    const lexer = new Lexer(src);
    const parser = new Parser(lexer);
    const prog = parser.parse();
    const env = {};  // 変数環境
    return Interpreter.execBlock(prog.stmts, env);
  }

  static execBlock(stmts, env) {
    let last = undefined;
    for (const s of stmts) {
      last = Interpreter.execStmt(s, env);
    }
    return last;
  }

  static execStmt(stmt, env) {
    if (stmt instanceof AST_VarDecl) {
      env[stmt.name] = 0;
      return;
    }
    if (stmt instanceof AST_Assign) {
      const val = Interpreter.evalExpr(stmt.expr, env);
      env[stmt.name] = val;
      return;
    }
    if (stmt instanceof AST_Print) {
      const v = Interpreter.evalExpr(stmt.expr, env);
      console.log(v);
      return v;
    }
    if (stmt instanceof AST_If) {
      const cond = Interpreter.evalExpr(stmt.cond, env);
      if (cond) {
        return Interpreter.execBlock(stmt.thenStmts, env);
      } else if (stmt.elseStmts) {
        return Interpreter.execBlock(stmt.elseStmts, env);
      }
      return;
    }
    throw new Error("未知の文: " + stmt);
  }

  static evalExpr(expr, env) {
    if (expr instanceof AST_Num) return expr.value;
    if (expr instanceof AST_Var) {
      if (!(expr.name in env)) throw new Error("未定義変数: " + expr.name);
      return env[expr.name];
    }
    if (expr instanceof AST_BinOp) {
      const L = Interpreter.evalExpr(expr.left, env);
      const R = Interpreter.evalExpr(expr.right, env);
      switch (expr.op) {
        case '+': return L + R;
        case '-': return L - R;
        case '*': return L * R;
        case '/': return Math.floor(L / R);
        case '<': return L < R ? 1 : 0;
        case '>': return L > R ? 1 : 0;
        case '==': return L === R ? 1 : 0;
      }
    }
    throw new Error("未知の式: " + expr);
  }
}
