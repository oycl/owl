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
}

export function compileTemplate(name: string, template: string): CompiledTemplate {
  const ast = parse(template);
  // console.warn(ast)
  const context: CodeContext = { currentParent: "tree", code: [], nextId: 1 };
  generateCode(ast, context);
  // console.warn(context.code.join('\n'))
  const fn = new Function("tree, context", context.code.join("\n")) as CompiledTemplate;
  return fn;
}

function addVNode(str: string, context: CodeContext): string {
  const id = context.nextId++;
  context.code.push(`const vn${id} = ${str};`);
  if (context.currentParent === "tree") {
    context.code.push(`tree.child = vn${id};`);
  } else {
    context.code.push(`${context.currentParent}.children.push(vn${id});`);
  }
  return `vn${id}`;
}

function withParent(parent: string, context: CodeContext, cb: Function) {
  const current = context.currentParent;
  context.currentParent = parent;
  cb();
  context.currentParent = current;
}

function generateCode(ast: AST, context: CodeContext) {
  switch (ast.type) {
    case ASTNodeType.DOM: {
      const vnode = `{type: ${NodeType.DOM}, tag: "${ast.tag}", el: null, children: [], key: ${ast.key}}`;
      const id = addVNode(vnode, context);
      withParent(id, context, () => {
        for (let child of ast.children) {
          generateCode(child, context);
        }
      });
      break;
    }
    case ASTNodeType.Text: {
      const vnode = `{type: ${NodeType.Text}, text: ${ast.text}, el: null}`;
      addVNode(vnode, context);
      break;
    }
    case ASTNodeType.Multi: {
      const vnode = `{type: ${NodeType.Multi}, children:[]}`;
      const id = addVNode(vnode, context);
      withParent(id, context, () => {
        for (let child of ast.children) {
          generateCode(child, context);
        }
      });
      break;
    }
    case ASTNodeType.Component: {
      const vnode = `this.makeComponent(tree, "${ast.name}", context)`;
      addVNode(vnode, context);
      break;
    }
  }
}
