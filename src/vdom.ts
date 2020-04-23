/**
 * Owl 2 VDOM
 */

// -----------------------------------------------------------------------------
// VDOM Type
// -----------------------------------------------------------------------------
type Key = string | number;

// when DOM has been created (so, only first time)
type CreateHook = (HTMLElement) => void;

interface Hooks {
  create?: CreateHook;
}

export const enum NodeType {
  DOM,
  Text,
  Content,
}
export interface VDOMNode<T> {
  type: NodeType.DOM;
  tag: string;
  el: HTMLElement | null;
  children: VNode<T>[];
  key: Key;
}

export interface VTextNode {
  type: NodeType.Text;
  text: string;
  el: Text | null;
}

export interface VMainNode<T> {
  type: NodeType.Content;
  data: T;
  children: VNode<T>[];
  key: Key;
  hooks: Hooks;
}

export type VNode<T = any> = VDOMNode<T> | VTextNode | VMainNode<T>;

// -----------------------------------------------------------------------------
// patch and update
// -----------------------------------------------------------------------------

export function patch(el: HTMLElement | DocumentFragment, vnode: VNode) {
  switch (vnode.type) {
    case NodeType.Text:
      const textEl = document.createTextNode(vnode.text);
      vnode.el = textEl;
      el.appendChild(textEl);
      break;
    case NodeType.DOM:
      let htmlEl = makeDOMVNode(vnode);
      el.appendChild(htmlEl);
      break;
    case NodeType.Content:
      for (let child of vnode.children) {
        patch(el, child);
      }
      if (vnode.hooks.create) {
        vnode.hooks.create(el.lastChild);
      }
      break;
  }
}

function makeDOMVNode<T>(vnode: VDOMNode<T>): HTMLElement {
  const el = document.createElement(vnode.tag);
  vnode.el = el;
  for (let child of vnode.children) {
    patch(el, child);
  }
  return el;
}

/**
 * This function assumes that oldvnode has been patched first (and so, has valid
 * html or text elements)
 *
 * It mutates newVNode, to contains all actual
 * dom elements
 */
export function update<T>(vnode: VNode<T>, target: VNode<T>) {
  switch (vnode.type) {
    case NodeType.Text:
      switch (target.type) {
        case NodeType.Text:
          vnode.el!.textContent = target.text;
          return;
        case NodeType.DOM:
          vnode.el!.replaceWith(makeDOMVNode(target));
          return;
        case NodeType.Content:
          throw new Error("not yet implemented");
      }
    case NodeType.DOM:
      switch (target.type) {
        case NodeType.DOM:
          if (vnode.key === target.key && vnode.tag === target.tag) {
            updateChildren(vnode.children, target);
          } else {
            vnode.el!.replaceWith(makeDOMVNode(target));
          }
          return;
        case NodeType.Text:
        case NodeType.Content:
          throw new Error("not yet implemented");
      }
    case NodeType.Content:
      switch (target.type) {
        case NodeType.Content:
          updateChildren(vnode.children, target);
          return;
      }
      throw new Error("not yet implemented");
  }
}

function updateChildren<T>(oldChildren: VNode<T>[], newParent: VDOMNode<T> | VMainNode<T>) {
  const newChildren = newParent.children;
  const l = newChildren.length;
  for (let i = 0; i < l; i++) {
    update(oldChildren[i], newChildren[i]);
  }
}
