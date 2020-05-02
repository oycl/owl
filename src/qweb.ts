import { RootData, VTree } from "./owl";
import { NodeType, VDOMNode, VTextNode } from "./vdom";

export interface RenderContext {
  [key: string]: any;
}

type CompiledTemplate = (this: Utils, data: RootData, context: RenderContext) => VTree;

const templates: { [name: string]: CompiledTemplate } = {};

export function renderTemplate(data: RootData, context: RenderContext): VTree {
  let fn = templates[data.template];
  if (!fn) {
    throw new Error("qweb not implemented yet...");
  }
  return fn.call(utils, data, context);
}

const utils = {
  // componentNode
};

// function componentNode(key: Key, name: string, tree: VTree, context: RenderContext): VDataNode<RootData> {
//   const C = context[name] as typeof Component;
//   const comp = new C();
//   tree.data.fiber.counter++;

//   return {
//     type: NodeType.Data,
//     key,

//   }
// }

type Utils = typeof utils;

// -----------------------------------------------------------------------------
// demo templates
// -----------------------------------------------------------------------------
templates["<div>simple vnode</div>"] = function (data: RootData, context: RenderContext): VTree {
  const vn1: VDOMNode<RootData> = {
    type: NodeType.DOM,
    tag: "div",
    el: null,
    children: [],
    key: 2,
  };
  const vn2: VTextNode = { type: NodeType.Text, text: "simple vnode", el: null };
  vn1.children.push(vn2);
  return { type: NodeType.Data, child: vn1, data, key: 1, hooks: {} };
};

templates["simple text node"] = function (data: RootData, context: RenderContext): VTree {
  const tree: VTree = { type: NodeType.DataMulti, children: [], data, key: 4, hooks: {} };
  const vn1: VTextNode = { type: NodeType.Text, text: "simple text node", el: null };
  tree.children.push(vn1);
  return tree;
};

templates["<div>a</div><div>b</div>"] = function (data: RootData, context: RenderContext): VTree {
  const tree: VTree = { type: NodeType.DataMulti, children: [], data, key: 6, hooks: {} };
  const vn1: VDOMNode<RootData> = {
    type: NodeType.DOM,
    tag: "div",
    el: null,
    children: [],
    key: 7,
  };
  tree.children.push(vn1);
  const vn2: VTextNode = { type: NodeType.Text, text: "a", el: null };
  vn1.children.push(vn2);
  const vn3: VDOMNode<RootData> = {
    type: NodeType.DOM,
    tag: "div",
    el: null,
    children: [],
    key: 9,
  };
  tree.children.push(vn3);
  const vn4: VTextNode = { type: NodeType.Text, text: "b", el: null };
  vn3.children.push(vn4);
  return tree;
};

templates[`<div>Hello <t t-esc="name"/></div>`] = function (
  data: RootData,
  context: RenderContext
): VTree {
  const tree: VTree = { type: NodeType.DataMulti, children: [], data, key: 11, hooks: {} };
  const vn1: VDOMNode<RootData> = {
    type: NodeType.DOM,
    tag: "div",
    el: null,
    children: [],
    key: 12,
  };
  tree.children.push(vn1);
  const vn2: VTextNode = { type: NodeType.Text, text: "Hello ", el: null };
  vn1.children.push(vn2);
  const vn3: VTextNode = { type: NodeType.Text, text: context.name, el: null };
  vn1.children.push(vn3);
  return tree;
};

templates[`<span><Test/></span>`] = function (data: RootData, context: RenderContext): VTree {
  const tree: VTree = { type: NodeType.DataMulti, children: [], data, key: 14, hooks: {} };
  const vn1: VDOMNode<RootData> = {
    type: NodeType.DOM,
    tag: "span",
    el: null,
    children: [],
    key: 15,
  };
  tree.children.push(vn1);
  // const vn2 = componentNode('Test', tree, context);
  // tree.children.push(vn2);
  // const vn2: VTextNode = { type: NodeType.Text, text: "Hello ", el: null };
  // vn1.children.push(vn2);
  // const vn3: VTextNode = { type: NodeType.Text, text: context.name, el: null };
  // vn1.children.push(vn3);
  return tree;
};
