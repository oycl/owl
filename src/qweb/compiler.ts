import { AST, parse } from "./parser";
import { NodeType } from "../vdom";
import { VTree } from "../core";
import { compileExpr } from "./expression_parser";

export interface RenderContext {
  [key: string]: any;
}

export type CompiledTemplate = (this: any, tree: VTree, context: RenderContext) => void;

interface CodeContext {
  currentParent: string;
  code: string[];
  nextId: number;
  indentLevel: number;
}

export function compileTemplate(name: string, template: string): CompiledTemplate {
  const ast = parse(template);
  // console.warn(JSON.stringify(ast, null, 3))
  const ctx: CodeContext = { currentParent: "tree", code: [], nextId: 1, indentLevel: 0 };
  const descr = template.trim().slice(0, 100).replace(/`/g, "'").replace(/\n/g, "");
  addLine(ctx, `// Template: \`${descr}\``);

  generateCode(ast, ctx);
  // console.warn(ctx.code.join('\n'))
  const fn = new Function("tree, ctx", ctx.code.join("\n")) as CompiledTemplate;
  return fn;
}

function addVNode(str: string, ctx: CodeContext, keepRef: boolean = true): string {
  const id = ctx.nextId++;
  if (ctx.currentParent === "tree") {
    if (keepRef) {
      addLine(ctx, `const vn${id} = tree.child = ${str};`);
    } else {
      addLine(ctx, `tree.child = ${str};`);
    }
  } else if (keepRef) {
    addLine(ctx, `const vn${id} = ${str};`);
    addLine(ctx, `${ctx.currentParent}.children.push(vn${id});`);
  } else {
    addLine(ctx, `${ctx.currentParent}.children.push(${str});`);
  }
  return `vn${id}`;
}

function withParent(parent: string, ctx: CodeContext, cb: Function) {
  const current = ctx.currentParent;
  ctx.currentParent = parent;
  cb();
  ctx.currentParent = current;
}

function addLine(ctx: CodeContext, code: string) {
  ctx.code.push(new Array(ctx.indentLevel + 2).join("    ") + code);
}

function generateCode(ast: AST, ctx: CodeContext) {
  switch (ast.type) {
    case "DOM": {
      const vnode = `{type: ${NodeType.DOM}, tag: "${
        ast.tag
      }", el: null, children: [], attrs: ${JSON.stringify(ast.attrs)}, key: ${ast.key}}`;
      const id = addVNode(vnode, ctx, ast.children.length > 0);
      withParent(id, ctx, () => {
        for (let child of ast.children) {
          generateCode(child, ctx);
        }
      });
      break;
    }
    case "TEXT": {
      const vnode = `{type: ${NodeType.Text}, text: ${ast.text}, el: null}`;
      addVNode(vnode, ctx, false);
      break;
    }
    case "T-ESC": {
      const expr = compileExpr(ast.expr, {});
      if (ast.body.length) {
        const id = ctx.nextId++;
        addLine(ctx, `let expr${id} = ${expr}`);
        addLine(ctx, `if (expr${id} !== undefined) {`);
        ctx.indentLevel++;
        addVNode(`{type: ${NodeType.Text}, text: expr${id}, el: null}`, ctx, false);
        ctx.indentLevel--;
        addLine(ctx, `} else {`);
        ctx.indentLevel++;
        for (let child of ast.body) {
          generateCode(child, ctx);
        }
        ctx.indentLevel--;
        addLine(ctx, `}`);
      } else {
        const vnode = `{type: ${NodeType.Text}, text: ${expr}, el: null}`;
        addVNode(vnode, ctx, false);
      }
      break;
    }
    case "T-IF": {
      addLine(ctx, `if (${compileExpr(ast.condition, {})}) {`);
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
      ctx.indentLevel--;
      addLine(ctx, "}");
      break;
    }

    case "COMMENT": {
      const vnode = `{type: ${NodeType.Comment}, text: ${ast.text}, el: null}`;
      addVNode(vnode, ctx, false);
      break;
    }
    case "MULTI": {
      const vnode = `{type: ${NodeType.Multi}, children:[]}`;
      const id = addVNode(vnode, ctx, ast.children.length > 0);
      withParent(id, ctx, () => {
        for (let child of ast.children) {
          generateCode(child, ctx);
        }
      });
      break;
    }
    case "COMPONENT": {
      const vnode = `this.makeComponent(tree, "${ast.name}", ctx)`;
      addVNode(vnode, ctx, false);
      break;
    }
  }
}
