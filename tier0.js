const fs = require('fs')

const id = a => a

class Parser {
  constructor(input) {
    // Position of the parser
    this.pos = 0
    // The string to parse
    this.input = input
  }

  now() {
    return this.pos
  }

  goBack(pos) {
    this.pos = pos
  }

  cur() {
    return this.input.substr(this.pos)
  }

  skipws() {
    let c = this.cur()[0]
    while (c == ' ' || c == '\t' || c == '\r' || c == '\n') {
      this.pos++
      c = this.cur()[0]
    }
  }

  adv(expr, fn = id) {
    let res = expr.exec(this.cur())
    if (res !== null) {
      this.pos += res[0].length
      this.skipws()
      return fn(res[0])
    } else return null
  }

  num() {
    return this.adv(/^\d+(\.\d+)?/, Number)
  }

  ident() {
    return this.adv(/^[\.a-zA-Z\-+\/*_=<>!][^\s^\n^\r^\(^\)^\"^:^']*/)
  }

  lp() {
    return this.adv(/^\(/)
  }

  rp() {
    return this.adv(/^\)/)
  }

  str() {
    return this.adv(/^"[^"]*"/)
  }

  quote() {
    return this.adv(/^'/)
  }

  tick() {
    return this.adv(/^`/)
  }

  comma() {
    return this.adv(/^,/)
  }

  keyword() {
    if (this.adv(/^:/))
      return this.ident()
    else return null
  }

  cmt() {
    this.skipws()
    while (this.adv(/^;[^\n]*\n/));
    while (this.adv(/^#\|/)) {
      while (this.adv(/^\|#/) == null)
        this.pos++
    }
  }

  atom() {
    let v
    let b = this.now()
    this.cmt()
    if (v = this.ident())
      return {type: 'ident', v}
    else if (v = this.num())
      return {type: 'num', v}
    else if (v = this.str())
      return {type: 'str', v}
    else if (v = this.keyword())
      return {type: 'keyword', v}
    else if (v = this.tick()) {
      if (v = this.atom())
        return {type: 'quasi', v}
      this.goBack(b)
      return null
    } else if (v = this.comma()) {
      if (v = this.atom())
        return {type: 'comma', v}
      this.goBack(b)
      return null
    } else if (v = this.quote()) {
      if (v = this.atom())
        return {type: 'quote', v}
      this.goBack(b)
      return null
    } else if (v = this.lp()) {
      let l = []
      while (v = this.atom()) {
        // console.log("list ->", v)
        l.push(v)
      }
      if (v = this.rp()) {
        return {type: 'list', v: l}
      } else {
        this.goBack(b)
        return null
      }
    } else {
      return null
    }
  }

  parse() {
    this.skipws()
    let l = []
    let v
    while (v = this.atom())
      l.push(v)
    return l
  }
}

function dump(node, depth = 0) {
  let i = '  '.repeat(depth)
  switch (node.type) {
    case 'list':
      console.log(i + '(')
      node.v.forEach(x => dump(x, depth + 1))
      console.log(i + ')')
      break
    case 'quote':
      console.log(i + "'")
      dump(node.v, depth + 1)
      break
    case 'quasi':
      console.log(i + '`')
      dump(node.v, depth + 1)
      break
    case 'comma':
      console.log(i + ',')
      dump(node.v, depth + 1)
      break
    default:
      console.log(i + node.type + " " + node.v)
  }
}

const ieq = (a, l) =>
  l.length > 0 && l[0].type == 'ident' && l[0].v == a

function esc(name) {
  const replace_with = {
    '*': '_star_',
    '-': '_',
    '/': '_slash_',
    '!': '_excl_',
    '+': '_plus_'
  }

  // Slow, should be optimized
  return Object.keys(replace_with).reduce((a, k) => a.split(k).join(replace_with[k]), name)
}

function quote(node, depth = 0, ret = false, q = quote) {
  let i = '  '.repeat(depth)
  let code = ''
  let rs = ret ? 'return ' : ''
  //console.log(node)
  switch (node.type) {
    case 'list':
      code += i + rs + `[ ${node.v.map(a => q(a, 0, false)).join(', ')} ]`
      break
    case 'num':
    case 'str':
      code += i + rs + node.v
      break
    case 'ident':
    case 'keyword':
      code += i + rs + `"${node.v}"`
      break
    case 'quote':
      code += q(node.v, depth, ret);
      break
  }
  return code
}

function quasi(node, depth = 0, ret = false, q = quasi) {
  let i = '  '.repeat(depth)
  let code = ''
  let rs = ret ? 'return ' : ''
  //console.log('<><><><> QUASI <><><><>')
  //dump(node, 2)
  switch (node.type) {
    case 'list':
      code += i + rs + `[ ${node.v.map(a => q(a, 0, false)).join(', ')} ]`
      break
    case 'comma':
      code += genjs(node.v, i, ret)
      break
    case 'num':
    case 'str':
      code += i + rs + node.v
      break
    case 'ident':
    case 'keyword':
      code += i + rs + `"${node.v}"`
      break
    case 'quote':
      code += q(node.v, depth, ret);
      break
  }
  return code
}

function genjs(node, depth = 0, ret = false, ctx = {}, jsmctx = {}) {
  // console.log(ret)
  let i = '  '.repeat(depth)
  let code = ''
  let rs = ret ? 'return ' : ''
  switch (node.type) {
    case 'list':
      let ismacro = false
      for (let m of Object.keys(jsmctx)) {
        //console.log(m)
        if (ieq(m, node.v)) {
          let macro = jsmctx[m]
          let rx = rs
          let [_m, ...args] = node.v
          for (let chunk of macro) {
            if (rx)
              code += i + rs
            switch (chunk.type) {
              case 'lit':
                code += chunk.v.slice(1, chunk.v.length - 1)
                break
              case 'arg':
                if (chunk.v >= args.length)
                  throw `argument out of range (this should never be thrown)`
                let arg = args[chunk.v]
                code += genjs(arg, 0, false, ctx, jsmctx)
                break
              default:
                throw `only lit and arg allowed in js macro, this should never be thrown`
            }
            rx = false
          }
          ismacro = true
        }
      }

      if (ismacro) break

      let infixOps = ['+', '-', '*', '/', '<', '>', '>=', '<=', '==', '!=']

      if (ieq('defun', node.v)) {
        // 'defun' func-name args body
        if (node.v.length < 4) {
          throw "`defun` expects at least 3 arguments"
        }

        let [defun, named, args, ...rest] = node.v

        if (named.type != 'ident')
          throw `function name (first argument to defun) should be an indentifier, is ${named.type}`
        if (args.type != 'list' || !args.v.reduce((a, c) => a && c.type == 'ident', true))
          throw `function args (second argument to defun) should be a list, is ${args.type}`

        code += i + `function ${esc(named.v)}(${args.v.map(a => a.v).join(', ')}) {\n`;
        code += rest.map((a, i) => genjs(a, depth + 1, i == rest.length-1)).join('\n') + i + '\n}'
      } else if (ieq('lambda', node.v)) {
        if (node.v.length < 2)
          throw `lambda requires at least one argument`
        let [lambda, args, ...body] = node.v
        if (args.type != 'list' || !args.v.reduce((a, c) => a && c.type =='ident', true))
          throw `function args (second argument to lambda) should be a list, is ${args.type}`

        code += i + rs + `function (${args.v.map(a => a.v).join(', ')}) {\n`
        code += body.map((a, i) => genjs(a, depth + 1, i == body.length-1)).join('\n') + i + '\n}'
      } else if (ieq('defjsmacro', node.v)) {
        if (node.v.length < 3)
          throw `defjsmacro expects at least two arguments`
        let [defjsmacro, named, args, ...body] = node.v

        if (named.type != 'ident')
          throw `js macro name must be an ident, is ${named.type}`
        if (args.type != 'list' || !args.v.reduce((a, c) => a && c.type =='ident', true))
          throw `function args (second argument to lambda) should be a list, is ${args.type}`

        let macro = []
        for (let b of body) {
          switch (b.type) {
            case 'str':
              macro.push({type: 'lit', v: b.v})
              break
            case 'ident':
              let n = b.v
              let idx = args.v.map(a => a.v).indexOf(n)
              if (idx === -1)
                throw `ident in js macro must exist in the argument list, ${n} does not`
              macro.push({type: 'arg', v: idx})
              break
            default:
              throw `js macro body may only contain strings and identifiers, not ${b.type}`
          }
          // console.log(macro)
          jsmctx[named.v] = macro
        }
      } else if (infixOps.reduce((a, c) => a || ieq(c, node.v), false)) {
        // Infix operator in JS
        if (node.v.length < 3)
          throw `${node.v[0].v} expects at least 2 arguments`

        code += i + rs + node.v.slice(1).map(a => genjs(a, 0, false)).join(` ${node.v[0].v} `)
      } else if (ieq('defparameter', node.v)) {
        if (node.v.length != 3)
          throw `defparameter expects exactly 2 arguments`
        let [defparam, name, val] = node.v;
        if (name.type != 'ident')
          throw `defparameter parameter name should be an identifier, is ${name.type}`
        code += i + rs + (ctx[name.v] === undefined ? 'var ' : '') +`${esc(name.v)} = ${genjs(val, 0, false)}`
        ctx[name.v] = 'defparameter'
      } else if (ieq('defvar', node.v)) {
        if (node.v.length != 3)
          throw `defvar expects exactly 2 arguments`
        let [defparam, name, val] = node.v;
        if (name.type != 'ident')
          throw `defvar parameter name should be an identifier, is ${name.type}`
        code += (ctx[name.v] === undefined ? i + rs + `var ${esc(name.v)} = ${genjs(val, 0, false)}` : '')
        ctx[name.v] = 'defvar'
      } else if (ieq('defconstant', node.v)) {
        if (node.v.length != 3)
          throw `defconstant expects exactly 2 arguments`
        let [defconst, name, val] = node.v;
        if (name.type != 'ident')
          throw `defconstant parameter name should be an identifier, is ${name.type}`
        code += i + rs + `const ${esc(name.v)} = ${genjs(val, 0, false)}`
        ctx[name.v] = 'defconstant'
      } else if (ieq('progn', node.v)) {
        let [progn, ...rest] = node.v
        code += rest.map((a, indx) => genjs(a, depth, ret && (indx == rest.length - 1))).join('\n')
      } else if (ieq('setf', node.v)) {
        let [set, k, v] = node.v;
        if (node.v.length != 3)
          throw `setf expects exactly 2 arguments`
        code += i + rs + genjs(k, 0, false) + ' = ' + genjs(v, 0, false)
      } else if (ieq('import', node.v)) {
        let [_import, ...items] = node.v
        if (node.v.length < 2)
          throw `import expects at least one argument`

        for (let named of items) {
          // console.log("in for", named)
          if (named.type == 'list') {
            // console.log(named.v.length)
            // console.log(named)
            if (named.v.length != 2)
              throw `import list should contain two elements`
            if (named.v[0].type != 'ident')
              throw `import as should be ident`
            if (named.v[1].type != 'str')
              throw `import module should be string`
            let [n, mod] = named.v
            code += i + rs + `const ${n.v} = require(${mod.v})\n`
          } else {
            dump(named)
            throw `import should look like (import (Something "something"))`
          }
        }
      } else if (ieq('new', node.v)) {
        if (node.v.length < 2)
          throw `new expects at least one argument`
        let [_new, obj, ...args] = node.v
        code += i + rs + `new ${genjs(obj, 0, false)}(${args.map(a => genjs(a)).join(', ')})`
      } else if (ieq('if', node.v)) {
        if (node.v.length != 4 && node.v.length != 3)
          throw `if expects 2 or 3 arguments`
        let [_if, cond, yes, no] = node.v
        code += i + `if (${genjs(cond, 0, false)}) {\n${genjs(yes, depth + 1, ret)}\n`
        code += i + '}'
        if (no !== undefined) {
          code += ` else {\n${genjs(no, depth + 1, ret)}\n`
          code += i + '}'
        }
      } else {
        let [name, ...args] = node.v
        code += i + rs + `${genjs(name, 0, false)}(${args.map(a => genjs(a, 0, false)).join(', ')})`
      }
      break
    case 'num':
      code += i + rs + String(node.v)
      break
    case 'str':
      code += i + rs + node.v
      break
    case 'keyword':
      code += i + rs + `"${node.v}"`
      break
    case 'ident':
      code += i + rs + esc(node.v)
      break
    case 'quote':
      code += quote(node.v, depth, ret)
      break
    case 'quasi':
      code += quasi(node.v, depth, ret)
      break
  }
  return code
}

if (process.argv.length < 3)
  throw "Give me a file please"

let f = process.argv[2]

let code = fs.readFileSync(f, "utf-8")
let macros = fs.readFileSync("macros.lisp", "utf-8")
let p = new Parser(code)
let mp = new Parser(macros)
let ast = p.parse()
let mast = mp.parse()
// Context used by defparameter/defvar etc
let ctx = {}
let jsmctx = {}
let js = ""
mast.forEach(a => js += genjs(a, 0, false, ctx, jsmctx))
ast.forEach(a => js += genjs(a, 0, false, ctx, jsmctx) + '\n')
console.log(js)
// (prnum (.parse (new Parser "avbc")))
