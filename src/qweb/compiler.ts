import { AST, ASTNodeType, parse } from "./parser";
import { NodeType } from "../vdom";
import { VTree } from "../core";

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
  // console.warn(ast)
  const ctx: CodeContext = { currentParent: "tree", code: [], nextId: 1, indentLevel: 0 };
  const descr = template.replace(/`/g, "'").slice(0, 200);
  addLine(ctx, `// Template: ${descr}`);

  generateCode(ast, ctx);
  // console.warn(ctx.code.join('\n'))
  const fn = new Function("tree, context", ctx.code.join("\n")) as CompiledTemplate;
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
    case ASTNodeType.DOM: {
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
    case ASTNodeType.Text: {
      const vnode = `{type: ${NodeType.Text}, text: ${ast.text}, el: null}`;
      addVNode(vnode, ctx, false);
      break;
    }
    case ASTNodeType.Comment: {
      const vnode = `{type: ${NodeType.Comment}, text: ${ast.text}, el: null}`;
      addVNode(vnode, ctx, false);
      break;
    }
    case ASTNodeType.Multi: {
      const vnode = `{type: ${NodeType.Multi}, children:[]}`;
      const id = addVNode(vnode, ctx, ast.children.length > 0);
      withParent(id, ctx, () => {
        for (let child of ast.children) {
          generateCode(child, ctx);
        }
      });
      break;
    }
    case ASTNodeType.Component: {
      const vnode = `this.makeComponent(tree, "${ast.name}", context)`;
      addVNode(vnode, ctx, false);
      break;
    }
  }
}
