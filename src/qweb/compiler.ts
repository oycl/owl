import { AST, parse, ASTDOMNode, ASTSetNode, ASTEscNode } from "./parser";
import { NodeType } from "../vdom";
import { VTree } from "../core";
import { compileExpr } from "./expression_parser";

export interface RenderContext {
  [key: string]: any;
}

export type CompiledTemplate = (this: any, tree: VTree, context: RenderContext) => void;

interface QWebVar {
  expr: string;
  hasBody: boolean;
  hasValue: boolean;
}

interface CodeContext {
  currentParent: string;
  code: string[];
  nextId: number;
  indentLevel: number;
  shouldProtectContext: boolean;
  variables: { [name: string]: QWebVar };
}

export function compileTemplate(name: string, template: string): CompiledTemplate {
  const ast = parse(template);
  // console.warn(JSON.stringify(ast, null, 3))
  const ctx: CodeContext = {
    currentParent: "tree",
    code: [],
    nextId: 1,
    indentLevel: 0,
    shouldProtectContext: false,
    variables: {},
  };
  const descr = template.trim().slice(0, 100).replace(/`/g, "'").replace(/\n/g, "");
  addLine(ctx, `// Template: \`${descr}\``);

  generateCode(ast, ctx);
  if (ctx.shouldProtectContext) {
    ctx.code.splice(1, 0, `    ctx = Object.create(ctx);`);
  }
  // console.warn(ctx.code.join('\n'))
  const fn = new Function("tree, ctx", ctx.code.join("\n")) as CompiledTemplate;
  return fn;
}

function generateCode(ast: AST | AST[], ctx: CodeContext) {
  if (ast instanceof Array) {
    for (let elem of ast) {
      generateCode(elem, ctx);
    }
    return;
  }
  switch (ast.type) {
    case "DOM": {
      compileDOMNode(ctx, ast);
      break;
    }
    case "TEXT": {
      const vnode = `{type: ${NodeType.Text}, text: ${ast.text}, el: null}`;
      addVNode(ctx, vnode, false);
      break;
    }
    case "T-SET": {
      compileSetNode(ctx, ast);
      break;
    }
    case "T-ESC": {
      compileEscNode(ctx, ast);
      break;
    }
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
      const vnode = `{type: ${NodeType.Comment}, text: ${ast.text}, el: null}`;
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

function addIf(ctx: CodeContext, condition: string) {
  addLine(ctx, `if (${condition}) {`);
  ctx.indentLevel++;
}

function closeIf(ctx: CodeContext) {
  ctx.indentLevel--;
  addLine(ctx, `}`);
}

function uniqueId(ctx: CodeContext, prefix: string = "_"): string {
  return prefix + String(ctx.nextId++);
}

function addVNode(ctx: CodeContext, str: string, keepRef: boolean = true): string {
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

function withParent(ctx: CodeContext, parent: string, cb: Function) {
  const current = ctx.currentParent;
  ctx.currentParent = parent;
  cb();
  ctx.currentParent = current;
}

function addLine(ctx: CodeContext, code: string) {
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

function compileDOMNode(ctx: CodeContext, ast: ASTDOMNode) {
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
  const vnode = `{type: ${NodeType.DOM}, tag: "${
    ast.tag
  }", el: null, children: [], attrs: ${objToAttr(attrs)}, key: ${ast.key}}`;
  const id = addVNode(ctx, vnode, ast.children.length > 0);
  withParent(ctx, id, () => {
    generateCode(ast.children, ctx);
  });
}

// -----------------------------------------------------------------------------
// Compile T-SET node
// -----------------------------------------------------------------------------

function compileSetNode(ctx: CodeContext, ast: ASTSetNode) {
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

function compileEscNode(ctx: CodeContext, ast: ASTEscNode) {
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
