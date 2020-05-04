/**
 * Owl 2 VDOM
 */

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
  DOM,
  Text,
  Comment,
  Data,
  Multi,
}

export interface VDOMNode<T> {
  type: NodeType.DOM;
  tag: string;
  el: HTMLElement | null;
  children: VNode<T>[];
  attrs: { [name: string]: string };
  key: Key;
}

export interface VTextNode {
  type: NodeType.Text;
  text: string;
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

export type VNode<T> = VDOMNode<T> | VTextNode | VDataNode<T> | VMultiNode<T> | VCommentNode;

// -----------------------------------------------------------------------------
// patch and update
// -----------------------------------------------------------------------------

export function patch<T>(el: HTMLElement | DocumentFragment, vnode: VNode<T>): VNodeEl {
  switch (vnode.type) {
    case NodeType.Text:
      const textEl = document.createTextNode(vnode.text);
      vnode.el = textEl;
      el.appendChild(textEl);
      return textEl;
    case NodeType.Comment:
      const comment = document.createComment(vnode.text);
      vnode.el = comment;
      console.log(vnode);
      el.appendChild(comment);
      return comment;
    case NodeType.DOM:
      let htmlEl = makeDOMVNode(vnode);
      const attrs = vnode.attrs;
      for (let name in attrs) {
        htmlEl.setAttribute(name, attrs[name]);
      }
      el.appendChild(htmlEl);
      return htmlEl;
    case NodeType.Data: {
      const nodeEl = patch(el, vnode.child!);
      const createHook = vnode.hooks.create;
      if (createHook) {
        createHook(nodeEl);
      }
      return nodeEl;
    }
    case NodeType.Multi: {
      let nodeEl: VNodeEl = null;
      for (let child of vnode.children) {
        nodeEl = patch(el, child);
      }
      return nodeEl;
    }
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
        case NodeType.Data:
        case NodeType.Multi:
        case NodeType.Comment:
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
        case NodeType.Data:
        case NodeType.Comment:
        case NodeType.Multi:
          throw new Error("not yet implemented");
      }
    case NodeType.Data:
      switch (target.type) {
        case NodeType.Data:
          update(vnode.child!, target.child!);
          return;
        case NodeType.Text:
        case NodeType.DOM:
        case NodeType.Data:
        case NodeType.Comment:
        case NodeType.Multi:
          throw new Error("not yet implemented");
      }
    case NodeType.Multi:
      switch (target.type) {
        case NodeType.Multi:
          updateChildren(vnode.children, target);
          return;
        case NodeType.Text:
        case NodeType.DOM:
        case NodeType.Comment:
        case NodeType.Data:
          throw new Error("not yet implemented");
      }
  }
}

function updateChildren<T>(oldChildren: VNode<T>[], newParent: VDOMNode<T> | VMultiNode<T>) {
  const newChildren = newParent.children;
  const l = newChildren.length;
  for (let i = 0; i < l; i++) {
    update(oldChildren[i], newChildren[i]);
  }
}
