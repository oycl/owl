import { ComponentData, VTree } from "./core";
import { NodeType, VDOMNode, VMultiNode, VTextNode } from "./vdom";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RenderContext {
  [key: string]: any;
}

export type CompiledTemplate = (this: any, tree: VTree, context: RenderContext) => void;

function toXML(xml: string): Document {
  const parser = new DOMParser();

  const doc = parser.parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    let msg = "Invalid XML in template.";
    const parsererrorText = doc.getElementsByTagName("parsererror")[0].textContent;
    if (parsererrorText) {
      msg += "\nThe parser has produced the following error message:\n" + parsererrorText;
      const re = /\d+/g;
      const firstMatch = re.exec(parsererrorText);
      if (firstMatch) {
        const lineNumber = Number(firstMatch[0]);
        const line = xml.split("\n")[lineNumber - 1];
        const secondMatch = re.exec(parsererrorText);
        if (line && secondMatch) {
          const columnIndex = Number(secondMatch[0]) - 1;
          if (line[columnIndex]) {
            msg +=
              `\nThe error might be located at xml line ${lineNumber} column ${columnIndex}\n` +
              `${line}\n${"-".repeat(columnIndex - 1)}^`;
          }
        }
      }
    }
    throw new Error(msg);
  }
  let tbranch = doc.querySelectorAll("[t-elif], [t-else]");
  for (let i = 0, ilen = tbranch.length; i < ilen; i++) {
    let node = tbranch[i];
    let prevElem = node.previousElementSibling!;
    let pattr = function (name) {
      return prevElem.getAttribute(name);
    };
    let nattr = function (name) {
      return +!!node.getAttribute(name);
    };
    if (prevElem && (pattr("t-if") || pattr("t-elif"))) {
      if (pattr("t-foreach")) {
        throw new Error(
          "t-if cannot stay at the same level as t-foreach when using t-elif or t-else"
        );
      }
      if (
        ["t-if", "t-elif", "t-else"].map(nattr).reduce(function (a, b) {
          return a + b;
        }) > 1
      ) {
        throw new Error("Only one conditional branching directive is allowed per node");
      }
      // All text (with only spaces) and comment nodes (nodeType 8) between
      // branch nodes are removed
      let textNode;
      while ((textNode = node.previousSibling) !== prevElem) {
        if (textNode.nodeValue.trim().length && textNode.nodeType !== 8) {
          throw new Error("text is not allowed between branching directives");
        }
        textNode.remove();
      }
    } else {
      throw new Error(
        "t-elif and t-else directives must be preceded by a t-if or t-elif directive"
      );
    }
  }

  return doc;
}

const enum ASTNodeType {
  DOM,
  Text
}

interface ASTDOMNode {
  type: ASTNodeType.DOM;
  tag: string;
  children: AST[];
  key: string | number;
}

interface ASTTextNode {
  type: ASTNodeType.Text;
  text: string;
}

type AST = ASTDOMNode | ASTTextNode;

function toAST(doc: Document): AST {
  return {
    type: ASTNodeType.DOM,
    tag: 'div',
    children: [{type: ASTNodeType.Text, text: "simple vnode"}],
    key: 1
  }
}

interface CodeContext {
  currentParent: string;
  code: string[];
  nextId: number;
}

function toCode(ast: AST): string[] {
  const context: CodeContext = { currentParent: 'tree', code: [], nextId: 1};
  _toCode(ast, context);
  return context.code;
}

function _toCode(ast: AST, context: CodeContext) {
  switch (ast.type) {
    case (ASTNodeType.DOM): {
      const id = context.nextId++;
      context.code.push(`const vn${id} = {type: ${NodeType.DOM}, tag: "${ast.tag}", el: null, children: [], key: ${ast.key}};`);
      if (context.currentParent === 'tree') {
        context.code.push(`tree.child = vn${id};`);
      } else {
        context.code.push(`${context.currentParent}.children.push(vn${id});`);
      }
      const subContext = Object.create(context);
      subContext.currentParent = 'vn' + id;
      for (let child of ast.children) {
        _toCode(child, subContext);
      }
      break;
    }
    case (ASTNodeType.Text): {
      const id = context.nextId++;
      context.code.push(`const vn${id} = {type: ${NodeType.Text}, text: "${ast.text}", el: null};`);
      if (context.currentParent === 'tree') {
        context.code.push(`tree.child = vn${id};`);
      } else {
        context.code.push(`${context.currentParent}.children.push(vn${id});`);
      }
      break;

    }
  }
}

// -----------------------------------------------------------------------------
// Global template Map
// -----------------------------------------------------------------------------

let nextId = 1;
const templateMap: { [name: string]: string } = {};

export function addTemplate(name: string, template: string) {
  templateMap[name] = template;
}

export function xml(strings, ...args) {
  const name = `__template__${nextId++}`;
  const value = String.raw(strings, ...args);
  addTemplate(name, value);
  return name;
}

// -----------------------------------------------------------------------------
// QWeb
// -----------------------------------------------------------------------------

// interface CompilationContext {

// }

export class QWeb {
  static utils: any = {};

  templates: { [name: string]: CompiledTemplate } = {};

  constructor() {
    for (let k in _templates) {
      this.templates[k] = _templates[k].bind(QWeb.utils);
    }
  }

  getTemplate(template: string): CompiledTemplate {
    let fn = this.templates[template];
    if (!fn) {
      const rawTemplate = templateMap[template];
      if (!rawTemplate) {
        throw new Error("qweb not implemented yet...");
      }
      fn = this.compileTemplate(template, rawTemplate);
    }
    return fn;
  }

  compileTemplate(name: string, template: string): CompiledTemplate {
    const doc = toXML(`<t>${template}</t>`);
    const ast = toAST(doc);
    const code = toCode(ast);
    const fn = new Function("tree, context", code.join("\n")) as CompiledTemplate;

    this.templates[name] = fn;
    return fn;
  }
}

// -----------------------------------------------------------------------------
// demo templates
// -----------------------------------------------------------------------------

const _templates: { [name: string]: CompiledTemplate } = {};

_templates["<div>simple vnode</div>"] = function (tree: VTree, context: RenderContext) {
  const vn1: VDOMNode<ComponentData> = {
    type: NodeType.DOM,
    tag: "div",
    el: null,
    children: [],
    key: 2,
  };
  tree.child = vn1;
  const vn2: VTextNode = { type: NodeType.Text, text: "simple vnode", el: null };
  vn1.children.push(vn2);
};

_templates["simple text node"] = function (tree: VTree, context: RenderContext) {
  const vn1: VTextNode = { type: NodeType.Text, text: "simple text node", el: null };
  tree.child = vn1;
};

_templates["<div>a</div><div>b</div>"] = function (tree: VTree, context: RenderContext) {
  const vn1: VMultiNode<ComponentData> = { type: NodeType.Multi, children: [] };
  tree.child = vn1;
  const vn2: VDOMNode<ComponentData> = {
    type: NodeType.DOM,
    tag: "div",
    el: null,
    children: [],
    key: 7,
  };
  vn1.children.push(vn2);
  const vn3: VTextNode = { type: NodeType.Text, text: "a", el: null };
  vn2.children.push(vn3);
  const vn4: VDOMNode<ComponentData> = {
    type: NodeType.DOM,
    tag: "div",
    el: null,
    children: [],
    key: 9,
  };
  vn1.children.push(vn4);
  const vn5: VTextNode = { type: NodeType.Text, text: "b", el: null };
  vn4.children.push(vn5);
};

_templates[`<div>Hello <t t-esc="name"/></div>`] = function (tree: VTree, context: RenderContext) {
  const vn1: VDOMNode<ComponentData> = {
    type: NodeType.DOM,
    tag: "div",
    el: null,
    children: [],
    key: 12,
  };
  tree.child = vn1;
  const vn2: VTextNode = { type: NodeType.Text, text: "Hello ", el: null };
  vn1.children.push(vn2);
  const vn3: VTextNode = { type: NodeType.Text, text: context.name, el: null };
  vn1.children.push(vn3);
};

_templates[`<span><Child/></span>`] = function (tree: VTree, context: RenderContext) {
  const vn1: VDOMNode<ComponentData> = {
    type: NodeType.DOM,
    tag: "span",
    el: null,
    children: [],
    key: 15,
  };
  tree.child = vn1;
  const vn2: VTree = this.makeComponent(tree, "Child", context);
  vn1.children.push(vn2);
};
