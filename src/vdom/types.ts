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
  Root,
  Multi,
  DOM,
  Text,
  Comment,
  Static,
}

interface BaseNode {
  key?: Key;
}

export interface Handler {
  cb: (this: HTMLElement, ev: any) => any;
}

export interface VRootNode<T> extends BaseNode {
  type: NodeType.Root;
  data: T;
  child: VNode<T> | null;
  hooks: Hooks;
  staticNodes: HTMLElement[];
}

export interface VDOMNode<T> extends BaseNode {
  type: NodeType.DOM;
  tag: string;
  children: VNode<T>[];
  el?: HTMLElement;
  attrs?: { [name: string]: string | boolean | number | null };
  on?: { [event: string]: Handler };
  class?: { [name: string]: boolean };
}

export interface VStaticNode extends BaseNode {
  type: NodeType.Static;
  id: number;
}

export interface VTextNode extends BaseNode {
  type: NodeType.Text;
  text: any;
  el: Text | null;
}

export interface VCommentNode extends BaseNode {
  type: NodeType.Comment;
  text: string;
  el: Comment | null;
}

export interface VMultiNode<T> extends BaseNode {
  type: NodeType.Multi;
  children: VNode<T>[];
  staticNodes?: HTMLElement[]; // sometimes useful to propagate nodes from a body to a t-call
}

export type VNode<T> =
  | VDOMNode<T>
  | VTextNode
  | VStaticNode
  | VRootNode<T>
  | VMultiNode<T>
  | VCommentNode;
