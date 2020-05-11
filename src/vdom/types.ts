// -----------------------------------------------------------------------------
// VDOM Type
// -----------------------------------------------------------------------------
export type Key = string | number;
export type VNodeEl = HTMLElement | Text | Comment | null;

// when DOM has been created (so, only first time)
type CreateHook = (el: VNodeEl) => void;

interface Hooks {
  create?: CreateHook;
}

export const enum NodeType {
  Data,
  Multi,
  DOM,
  Text,
  Comment,
  Static,
}

export interface Handler {
  cb: (this: HTMLElement, ev: any) => any;
}
export interface VDOMNode<T> {
  type: NodeType.DOM;
  tag: string;
  children: VNode<T>[];
  key: Key;
  el?: HTMLElement;
  attrs?: { [name: string]: string | boolean | number | null };
  on?: { [event: string]: Handler };
  class?: { [name: string]: boolean };
}

export interface VStaticNode {
  type: NodeType.Static;
  id: number;
}

export interface VTextNode {
  type: NodeType.Text;
  text: any;
  el: Text | null;
}

export interface VCommentNode {
  type: NodeType.Comment;
  text: string;
  el: Comment | null;
}

export interface VDataNode<T> {
  type: NodeType.Data;
  data: T;
  child: VNode<T> | null;
  key: Key;
  hooks: Hooks;
}

export interface VMultiNode<T> {
  type: NodeType.Multi;
  children: VNode<T>[];
}

export type VNode<T> =
  | VDOMNode<T>
  | VTextNode
  | VStaticNode
  | VDataNode<T>
  | VMultiNode<T>
  | VCommentNode;
