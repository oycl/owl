import { NodeType, registerStaticNode, VDataNode } from "../vdom/vdom";
import { compileExpr } from "./expression_parser";
import {
  AST,
  ASTCallNode,
  ASTDOMNode,
  ASTEscNode,
  ASTRawNode,
  ASTSetNode,
  ASTStaticNode,
  parse,
} from "./parser";
import { QWeb } from "./qweb";
export interface RenderContext {
  [key: string]: any;
}

export type CompiledTemplate = (this: any, tree: VDataNode<any>, context: RenderContext) => void;

interface QWebVar {
  expr: string;
  hasBody: boolean;
  hasValue: boolean;
}

interface CompilerContext {
  qweb: QWeb;
  currentParent: string;
  code: string[];
  nextId: number;
  indentLevel: number;
  shouldProtectContext: boolean;
  shouldDefineRootContext: boolean;
  variables: { [name: string]: QWebVar };
}

export function compileTemplate(qweb: QWeb, name: string, template: string): CompiledTemplate {
  const ast = parse(template);
  // console.warn(JSON.stringify(ast, null, 3))
  const ctx: CompilerContext = {
    qweb,
    currentParent: "tree",
    code: [],
    nextId: 1,
    indentLevel: 0,
    shouldProtectContext: false,
    shouldDefineRootContext: false,
    variables: {},
  };
  const descr = name.trim().slice(0, 100).replace(/`/g, "'").replace(/\n/g, "");
  addLine(ctx, `// Template: \`${descr}\``);

  generateCode(ast, ctx);
  if (ctx.shouldProtectContext) {
    ctx.code.splice(1, 0, `    ctx = Object.create(ctx);`);
  }
  if (ctx.shouldDefineRootContext) {
    ctx.code.splice(1, 0, `    const rootCtx = ctx;`);
  }
  // console.warn(ctx.code.join("\n"));
  const fn = new Function("tree, ctx", ctx.code.join("\n")) as CompiledTemplate;
  return fn;
}

function generateCode(ast: AST | AST[], ctx: CompilerContext) {
  if (ast instanceof Array) {
    for (let elem of ast) {
      generateCode(elem, ctx);
    }
    return;
  }
  switch (ast.type) {
    case "DOM":
      compileDOMNode(ctx, ast);
      break;
    case "TEXT": {
      const vnode = `{type: ${NodeType.Text}, text: \`${ast.text}\`, el: null}`;
      addVNode(ctx, vnode, false);
      break;
    }
    case "STATIC":
      compileStaticNode(ctx, ast);
      break;
    case "T-SET":
      compileSetNode(ctx, ast);
      break;
    case "T-ESC":
      compileEscNode(ctx, ast);
      break;
    case "T-RAW":
      compileRawNode(ctx, ast);
      break;
    case "T-IF": {
      addIf(ctx, compileExpr(ast.condition, {}));
      generateCode(ast.child, ctx);
      ctx.indentLevel--;
      if (ast.next) {
        generateCode(ast.next, ctx);
      } else {
        addLine(ctx, "}");
      }
      break;
    }

    case "T-ELIF": {
      addLine(ctx, `} else if (${compileExpr(ast.condition, {})}) {`);
      ctx.indentLevel++;
      generateCode(ast.child, ctx);
      ctx.indentLevel--;
      if (ast.next) {
        generateCode(ast.next, ctx);
      } else {
        addLine(ctx, "}");
      }
      break;
    }

    case "T-ELSE": {
      addLine(ctx, `} else {`);
      ctx.indentLevel++;
      generateCode(ast.child, ctx);
      closeIf(ctx);
      break;
    }

    case "COMMENT": {
      const vnode = `{type: ${NodeType.Comment}, text: \`${ast.text}\`, el: null}`;
      addVNode(ctx, vnode, false);
      break;
    }
    case "MULTI": {
      const vnode = `{type: ${NodeType.Multi}, children:[]}`;
      const id = addVNode(ctx, vnode, ast.children.length > 0);
      withParent(ctx, id, () => {
        generateCode(ast.children, ctx);
      });
      break;
    }
    case "T-CALL":
      compileCallNode(ctx, ast);
      break;
    case "T-FOREACH":
      {
        const colLength = uniqueId(ctx, "length");
        const colId = uniqueId(ctx);
        addLine(ctx, `let ${colId} = ${compileExpr(ast.collection, {})};`);
        addLine(ctx, `let ${colLength} = ${colId}.length;`);
        addLine(ctx, `ctx = Object.create(ctx);`);
        addLine(ctx, `for (let i = 0; i < ${colLength}; i++) {`);
        ctx.indentLevel++;
        addLine(ctx, `ctx.${ast.varName}_first = i === 0;`);
        addLine(ctx, `ctx.${ast.varName}_last = i === ${colLength} - 1;`);
        addLine(ctx, `ctx.${ast.varName} = ${colId}[i];`);
        addLine(ctx, `ctx.${ast.varName}_index = i;`);
        addLine(ctx, `ctx.${ast.varName}_value = ${colId}[i];`);
        generateCode(ast.children, ctx);
        ctx.indentLevel--;
        addLine(ctx, "}");
        addLine(ctx, `ctx = ctx.__proto__;`);
      }
      break;
    case "COMPONENT": {
      const vnode = `this.makeComponent(tree, "${ast.name}", ctx)`;
      addVNode(ctx, vnode, false);
      break;
    }
  }
}

// -----------------------------------------------------------------------------
// Code generation helpers
// -----------------------------------------------------------------------------

function addIf(ctx: CompilerContext, condition: string) {
  addLine(ctx, `if (${condition}) {`);
  ctx.indentLevel++;
}

function closeIf(ctx: CompilerContext) {
  ctx.indentLevel--;
  addLine(ctx, `}`);
}

function uniqueId(ctx: CompilerContext, prefix: string = "_"): string {
  return prefix + String(ctx.nextId++);
}

function addVNode(ctx: CompilerContext, str: string, keepRef: boolean = true): string {
  const id = uniqueId(ctx, "vn");
  if (ctx.currentParent === "tree") {
    if (keepRef) {
      addLine(ctx, `const ${id} = tree.child = ${str};`);
    } else {
      addLine(ctx, `tree.child = ${str};`);
    }
  } else {
    let expr = ctx.currentParent;
    if (ctx.currentParent.startsWith("vn")) {
      expr = expr + ".children";
    }
    if (keepRef) {
      addLine(ctx, `const ${id} = ${str};`);
      addLine(ctx, `${expr}.push(${id});`);
    } else {
      addLine(ctx, `${expr}.push(${str});`);
    }
  }
  return id;
}

function withParent(ctx: CompilerContext, parent: string, cb: Function) {
  const current = ctx.currentParent;
  ctx.currentParent = parent;
  cb();
  ctx.currentParent = current;
}

function addLine(ctx: CompilerContext, code: string) {
  ctx.code.push(new Array(ctx.indentLevel + 2).join("    ") + code);
}

// -----------------------------------------------------------------------------
// Compile DOM node
// -----------------------------------------------------------------------------
const letterRegexp = /^[a-zA-Z]+$/;

function objToAttr(obj: { [key: string]: string }): string {
  const attrs = Object.keys(obj).map((k) => {
    const attName = k.match(letterRegexp) ? k : '"' + k + '"';
    return `${attName}:${obj[k]}`;
  });
  return "{" + attrs.join(",") + "}";
}

function addToAttrs(attrs: { [key: string]: string }, key: string, value: string) {
  attrs[key] = key in attrs ? attrs[key] + ' + " " + ' + value : value;
}

export function handleEvent(ev: Event, ctx: any, fn: any) {
  fn.call(ctx, ev);
}

function compileDOMNode(ctx: CompilerContext, ast: ASTDOMNode) {
  // attributes
  const attrs = {};
  for (let attr in ast.attrs) {
    let value = ast.attrs[attr];
    if (attr.startsWith("t-att-")) {
      const id = uniqueId(ctx);
      addLine(ctx, `let ${id} = ${compileExpr(value, {})}`);
      addToAttrs(attrs, attr.slice(6), id);
    } else {
      addToAttrs(attrs, attr, `"${value}"`);
    }
  }
  const attrObjStr = objToAttr(attrs);
  const attrCode = attrObjStr === "{}" ? "" : `, attrs: ${attrObjStr}`;

  // classes
  let classObj = "";
  if (ast.attClass) {
    classObj = `, class: this.toClassObj(${compileExpr(ast.attClass, {})})`;
  }
  // handlers
  let handlers = "";
  if (Object.keys(ast.on).length) {
    let h: string[] = [];
    ctx.shouldDefineRootContext = true;
    for (let ev in ast.on) {
      const expr = compileExpr(ast.on[ev].expr, {});
      const cb = `ev => this.handleEvent(ev, rootCtx, ${expr})`;
      h.push(`${ev}: {cb: ${cb}}`);
    }
    handlers = `, on: {` + h.join(", ") + "}";
  }

  // final code
  const vnode = `{type: ${NodeType.DOM}, tag: "${ast.tag}", children: []${attrCode}, key: ${ast.key}${handlers}${classObj}}`;
  const id = addVNode(ctx, vnode, ast.children.length > 0);
  withParent(ctx, id, () => {
    generateCode(ast.children, ctx);
  });
}

// -----------------------------------------------------------------------------
// Compile T-SET node
// -----------------------------------------------------------------------------

function compileSetNode(ctx: CompilerContext, ast: ASTSetNode) {
  ctx.shouldProtectContext = true;
  if (ast.value !== null) {
    addLine(ctx, `ctx.${ast.name} = ${compileExpr(ast.value, {})};`);
  }
  if (ast.body.length && ast.value === null) {
    let id = uniqueId(ctx);
    addLine(ctx, `let ${id} = new this.VDomArray();`);
    withParent(ctx, id, () => {
      generateCode(ast.body, ctx);
    });
    addLine(ctx, `ctx.${ast.name} = ${id};`);
  }
  if (ast.body.length && ast.value !== null) {
    addIf(ctx, `!ctx.${ast.name}`);
    let id = uniqueId(ctx);
    addLine(ctx, `let ${id} = new this.VDomArray();`);
    withParent(ctx, id, () => {
      generateCode(ast.body, ctx);
    });
    addLine(ctx, `ctx.${ast.name} = ${id}`);
    closeIf(ctx);
  }

  const qwebVar = ctx.variables[ast.name];
  if (qwebVar) {
    qwebVar.hasBody = qwebVar.hasBody || !!ast.body.length;
    qwebVar.hasValue = qwebVar.hasBody || ast.value !== null;
  } else {
    ctx.variables[ast.name] = {
      expr: `ctx.${ast.name}`,
      hasBody: !!ast.body.length,
      hasValue: ast.value !== null,
    };
  }
}

// -----------------------------------------------------------------------------
// Compile T-ESC node
// -----------------------------------------------------------------------------

function compileEscNode(ctx: CompilerContext, ast: ASTEscNode) {
  if (ast.expr === "0") {
    addVNode(
      ctx,
      `{type: ${NodeType.Text}, text: this.vDomToString(ctx[this.zero]), el: null}`,
      false
    );

    return;
  }
  const expr = compileExpr(ast.expr, {});
  if (ast.body.length) {
    const id = uniqueId(ctx);
    addLine(ctx, `let ${id} = ${expr}`);
    addIf(ctx, `${id} !== undefined`);
    addVNode(ctx, `{type: ${NodeType.Text}, text: ${id}, el: null}`, false);
    ctx.indentLevel--;
    addLine(ctx, `} else {`);
    ctx.indentLevel++;
    generateCode(ast.body, ctx);
    closeIf(ctx);
  } else {
    if (ast.expr in ctx.variables) {
      // this is a variable that was already defined, with a body
      const id = uniqueId(ctx);
      const qwebVar = ctx.variables[ast.expr];
      if (!qwebVar.hasBody && !qwebVar.hasValue) {
        return;
      }
      if (qwebVar.hasBody && qwebVar.hasValue) {
        addLine(
          ctx,
          `let ${id} = ${qwebVar.expr} instanceof this.VDomArray ? this.vDomToString(${qwebVar.expr}) : ${qwebVar.expr};`
        );
        const vnode = `{type: ${NodeType.Text}, text: ${id}, el: null}`;
        addVNode(ctx, vnode, false);
      } else if (qwebVar.hasValue && !qwebVar.hasBody) {
        const vnode = `{type: ${NodeType.Text}, text: ${expr}, el: null}`;
        addVNode(ctx, vnode, false);
      } else {
        addLine(ctx, `let ${id} = this.vDomToString(${qwebVar.expr});`);
        const vnode = `{type: ${NodeType.Text}, text: ${id}, el: null}`;
        addVNode(ctx, vnode, false);
      }
    } else {
      const vnode = `{type: ${NodeType.Text}, text: ${expr}, el: null}`;
      addVNode(ctx, vnode, false);
    }
  }
}

// -----------------------------------------------------------------------------
// Compile T-RAW node
// -----------------------------------------------------------------------------

function compileRawNode(ctx: CompilerContext, ast: ASTRawNode) {
  if (ast.expr === "0") {
    addVNode(ctx, `{type: ${NodeType.Multi}, children: ctx[this.zero]}`, false);

    return;
  }
  const expr = compileExpr(ast.expr, {});
  if (ast.body.length) {
    const id = uniqueId(ctx);
    addLine(ctx, `let ${id} = ${expr}`);
    addIf(ctx, `${id} !== undefined`);
    const vnode = `...this.htmlToVDOM(${expr})`;
    addVNode(ctx, vnode, false);
    ctx.indentLevel--;
    addLine(ctx, `} else {`);
    ctx.indentLevel++;
    generateCode(ast.body, ctx);
    closeIf(ctx);
    return;
  }
  if (ast.expr in ctx.variables) {
    // // this is a variable that was already defined, with a body
    const qwebVar = ctx.variables[ast.expr];
    if (qwebVar.hasBody && qwebVar.hasValue) {
      const id = uniqueId(ctx);
      addLine(
        ctx,
        `let ${id} = ${qwebVar.expr} instanceof this.VDomArray ? ${qwebVar.expr} : this.htmlToVDOM(${qwebVar.expr});`
      );
      const vnode = `{type: ${NodeType.Multi}, children: ${id}}`;
      addVNode(ctx, vnode, false);
    } else {
      const vnode = `{type: ${NodeType.Multi}, children: ${qwebVar.expr}}`;
      addVNode(ctx, vnode, false);
    }
  } else {
    if (ctx.currentParent === "tree") {
      addLine(ctx, `tree.child = {type: ${NodeType.Multi}, children: this.htmlToVDOM(${expr})};`);
    } else {
      const vnode = `...this.htmlToVDOM(${expr})`;
      addVNode(ctx, vnode, false);
    }
  }
  // }
}

// -----------------------------------------------------------------------------
// Compile T-CALL node
// -----------------------------------------------------------------------------

function compileCallNode(ctx: CompilerContext, ast: ASTCallNode) {
  if (ast.children.length) {
    addLine(ctx, `ctx = Object.create(ctx);`);
    const id = uniqueId(ctx, "vn");
    addLine(ctx, `const ${id} = {type: ${NodeType.Multi}, children: []};`);
    withParent(ctx, id, () => {
      generateCode(ast.children, ctx);
    });
    addLine(ctx, `ctx[this.zero] = ${id}.children;`);
  }
  const vnode = `this.callTemplate(tree, "${ast.template}", ctx)`;

  addVNode(ctx, vnode, false);
  if (ast.children.length) {
    addLine(ctx, `ctx = ctx.__proto__;`);
  }
}

// -----------------------------------------------------------------------------
// Compile static nodes
// -----------------------------------------------------------------------------

function compileStaticNode(ctx: CompilerContext, ast: ASTStaticNode) {
  const id = ctx.qweb.nextId++;
  const el = makeEl(ast.child) as HTMLElement;
  registerStaticNode(id, el);
  const vnode = `{type: ${NodeType.Static}, id: ${id}}`;
  addVNode(ctx, vnode, false);
}

function makeEl(ast: AST): HTMLElement | Text | Comment {
  switch (ast.type) {
    case "DOM": {
      const el = document.createElement(ast.tag);
      const attrs = ast.attrs;
      for (let attr in attrs) {
        el.setAttribute(attr, attrs[attr]);
      }
      for (let child of ast.children) {
        el.appendChild(makeEl(child));
      }
      return el;
    }
    case "TEXT": {
      return document.createTextNode(ast.text);
    }
    case "COMMENT": {
      return document.createComment(ast.text);
    }
  }
  throw new Error("Something is wrong...");
}
