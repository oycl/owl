// -----------------------------------------------------------------------------
// VDOM Type
// -----------------------------------------------------------------------------

/**
 * Other ideas:
 *
 * - add a DOM_ONECHILD type => skip the patch process for each children
 */

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

// the position of a node, relative to an anchor HTMLElement
export const enum NodePosition {
  Append,
  After,
  Before,
}

export interface VRootNode<T = any> extends BaseNode {
  type: NodeType.Root;
  data: T;
  child: VNode<T> | null;
  hooks: Hooks;
  staticNodes: HTMLElement[];
  anchor: HTMLElement | DocumentFragment | null;
  position: NodePosition | null;
}

export interface VDOMNode<T = any> extends BaseNode {
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
  el?: HTMLElement;
}

export interface VTextNode extends BaseNode {
  type: NodeType.Text;
  text: any;
  el?: Text;
}

export interface VCommentNode extends BaseNode {
  type: NodeType.Comment;
  text: string;
  el?: Comment;
}

export interface VMultiNode<T = any> extends BaseNode {
  type: NodeType.Multi;
  children: VNode<T>[];
  staticNodes?: HTMLElement[]; // sometimes useful to propagate nodes from a body to a t-call
}

export type VNode<T = any> =
  | VDOMNode<T>
  | VTextNode
  | VCommentNode
  | VStaticNode
  | VRootNode<T>
  | VMultiNode<T>;
