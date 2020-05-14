// -----------------------------------------------------------------------------
// VDOM Type
// -----------------------------------------------------------------------------

import { VDomArray } from "./vdom";

/**
 * Other ideas:
 *
 * - add a DOM_ONECHILD type => skip the patch process for each children
 * - maybe a DOM_STATIC_CHILDREN
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

type Handler = (ev: Event) => void;

// the position of a node, relative to an anchor HTMLElement
export const enum NodePosition {
  Append,
  After,
  Before,
}

export interface VRootNode extends BaseNode {
  type: NodeType.Root;
  child: VNode | null;
  hooks: Hooks;
  staticNodes: HTMLElement[];
  anchor: HTMLElement | DocumentFragment | null;
  position: NodePosition | null;
}

export interface VDOMNode extends BaseNode {
  type: NodeType.DOM;
  tag: string;
  children: VNode[];
  el?: HTMLElement;
  attrs?: { [name: string]: string | boolean | number | null };
  on?: { [event: string]: Handler };
  listener?: Handler;
  class?: { [name: string]: boolean };
}

export interface VStaticNode extends BaseNode {
  type: NodeType.Static;
  id: number;
  el?: HTMLElement;
}

export interface VTextNode extends BaseNode {
  type: NodeType.Text;
  // sometimes the content of the body a qweb var is stored in a text node =>
  // we need to call vdomToString in that case
  text: any | VDomArray;
  el?: Text;
}

export interface VCommentNode extends BaseNode {
  type: NodeType.Comment;
  text: string;
  el?: Comment;
}

export interface VMultiNode extends BaseNode {
  type: NodeType.Multi;
  children: VNode[];
  staticNodes?: HTMLElement[]; // sometimes useful to propagate nodes from a body to a t-call
}

export type VNode = VDOMNode | VTextNode | VCommentNode | VStaticNode | VRootNode | VMultiNode;
