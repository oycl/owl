import {
  NodeType,
  VCommentNode,
  VDOMNode,
  VMultiNode,
  VNode,
  VStaticNode,
  VTextNode,
  VRootNode,
  Key,
} from "../../src/vdom/types";

let nextId = 1;

export function vText(text: any): VTextNode {
  return {
    type: NodeType.Text,
    text,
  };
}

export function vComment(text: string): VCommentNode {
  return {
    type: NodeType.Comment,
    text,
  };
}

export function vStatic(root: VRootNode, html: string): VStaticNode {
  const div = document.createElement("div");
  div.innerHTML = html;
  const el = div.firstElementChild! as HTMLElement;
  const id = root.staticNodes.push(el) - 1;
  return { type: NodeType.Static, id };
}

export function vDom(tag: string, children?: VNode[]): VDOMNode;
export function vDom(tag: string, data: Partial<VDOMNode>, children?: VNode[]): VDOMNode;
export function vDom(tag: string, arg1: any, arg2?: any): VDOMNode {
  let children: VNode[];
  let data: Partial<VDOMNode>;
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

export function vMulti(children: VNode[]): VMultiNode;
export function vMulti(key: Key, children: VNode[]): VMultiNode;
export function vMulti(arg1: any, arg2: any = []): VMultiNode {
  if (Array.isArray(arg1)) {
    return {
      type: NodeType.Multi,
      children: arg1,
    };
  }
  return { type: NodeType.Multi, key: arg1, children: arg2 };
}

export function vRoot(child: VNode | null): VRootNode {
  return {
    type: NodeType.Root,
    child,
    key: nextId++,
    hooks: {},
    staticNodes: [],
    anchor: null,
    position: null,
  };
}
