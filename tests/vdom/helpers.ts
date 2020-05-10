import {
  NodeType,
  registerStaticNode,
  VCommentNode,
  VDataNode,
  VDOMNode,
  VMultiNode,
  VNode,
  VStaticNode,
  VTextNode,
} from "../../src/vdom/vdom";

let nextId = 1;

export function textNode(text: any): VTextNode {
  return {
    type: NodeType.Text,
    text,
    el: null,
  };
}

export function commentNode(text: string): VCommentNode {
  return {
    type: NodeType.Comment,
    text,
    el: null,
  };
}

export function staticNode(id: number, html: string): VStaticNode {
  const div = document.createElement("div");
  div.innerHTML = html;
  const el = div.firstElementChild! as HTMLElement;
  registerStaticNode(id, el);
  return { type: NodeType.Static, id };
}

export function domNode(tag: string, children?: VNode<any>[]): VDOMNode<any>;
export function domNode(
  tag: string,
  data: Partial<VDOMNode<any>>,
  children?: VNode<any>[]
): VDOMNode<any>;
export function domNode(tag: string, arg1: any, arg2?: any): VDOMNode<any> {
  let children: VNode<any>[];
  let data: Partial<VDOMNode<any>>;
  if (Array.isArray(arg1)) {
    children = arg1;
    data = {};
  } else {
    children = arg2 || [];
    data = arg1;
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

export function multiNode(children: VNode<any>[]): VMultiNode<any> {
  return {
    type: NodeType.Multi,
    children,
  };
}

export function dataNode(child: VNode<any>): VDataNode<any> {
  return {
    type: NodeType.Data,
    child,
    data: null,
    key: nextId++,
    hooks: {},
  };
}
