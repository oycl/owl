import { ComponentData, VTree } from "./core";
import { NodeType, VDOMNode, VMultiNode, VTextNode } from "./vdom";
// import { Component } from "./component";

export interface RenderContext {
  [key: string]: any;
}

type CompiledTemplate = (this: any, tree: VTree, context: RenderContext) => void;

const templates: { [name: string]: CompiledTemplate } = {};

export function renderTemplate(tree: VTree, context: RenderContext): VTree {
  let fn = templates[tree.data.template];
  if (!fn) {
    throw new Error("qweb not implemented yet...");
  }
  return fn.call(utils, tree, context);
}

export const utils: any = {};

// -----------------------------------------------------------------------------
// demo templates
// -----------------------------------------------------------------------------
templates["<div>simple vnode</div>"] = function (tree: VTree, context: RenderContext) {
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

templates["simple text node"] = function (tree: VTree, context: RenderContext) {
  const vn1: VTextNode = { type: NodeType.Text, text: "simple text node", el: null };
  tree.child = vn1;
};

templates["<div>a</div><div>b</div>"] = function (tree: VTree, context: RenderContext) {
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

templates[`<div>Hello <t t-esc="name"/></div>`] = function (tree: VTree, context: RenderContext) {
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

templates[`<span><Child/></span>`] = function (tree: VTree, context: RenderContext) {
  const vn1: VDOMNode<ComponentData> = {
    type: NodeType.DOM,
    tag: "span",
    el: null,
    children: [],
    key: 15,
  };
  tree.child = vn1;
  const vn2: VTree = utils.makeComponent(tree, "Child", context);
  vn1.children.push(vn2);
};
