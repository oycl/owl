import {
  NodeType,
  VCommentNode,
  VDOMNode,
  VMultiNode,
  VNode,
  VStaticNode,
  VTextNode,
  VRootNode,
} from "../../src/vdom/types";

let nextId = 1;

export function vText(text: any): VTextNode {
  return {
    type: NodeType.Text,
    text,
    el: null,
  };
}

export function vComment(text: string): VCommentNode {
  return {
    type: NodeType.Comment,
    text,
    el: null,
  };
}

export function vStatic(root: VRootNode<any>, html: string): VStaticNode {
  const div = document.createElement("div");
  div.innerHTML = html;
  const el = div.firstElementChild! as HTMLElement;
  const id = root.staticNodes.push(el) - 1;
  return { type: NodeType.Static, id };
}

export function vDom(tag: string, children?: VNode<any>[]): VDOMNode<any>;
export function vDom(
  tag: string,
  data: Partial<VDOMNode<any>>,
  children?: VNode<any>[]
): VDOMNode<any>;
export function vDom(tag: string, arg1: any, arg2?: any): VDOMNode<any> {
  let children: VNode<any>[];
  let data: Partial<VDOMNode<any>>;
  if (Array.isArray(arg1)) {
    children = arg1;
    data = {};
  } else {
    children = arg2 || [];
    data = arg1 || {};
  }
  return {
    type: NodeType.DOM,
    tag,
    children: children,
    attrs: data.attrs || {},
    key: data.key || nextId++,
    on: data.on || {},
    class: data.class || {},
  };
}

export function vMulti(children: VNode<any>[]): VMultiNode<any> {
  return {
    type: NodeType.Multi,
    children,
  };
}

export function vRoot(child: VNode<any> | null): VRootNode<any> {
  return {
    type: NodeType.Root,
    child,
    data: null,
    key: nextId++,
    hooks: {},
    staticNodes: [],
  };
}
