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

// -----------------------------------------------------------------------------
// patch and update
// -----------------------------------------------------------------------------

const staticNodes: { [id: number]: HTMLElement } = {};

export function registerStaticNode(id: number, el: HTMLElement) {
  staticNodes[id] = el;
}

export function patch<T>(el: HTMLElement | DocumentFragment, vnode: VNode<T>): VNodeEl {
  // console.warn(JSON.stringify(vnode))
  switch (vnode.type) {
    case NodeType.Text:
      let text = vnode.text; // === undefined ? "" : vnode.text;
      if (text === undefined || text === null) {
        text = "";
      }
      const textEl = document.createTextNode(text);
      vnode.el = textEl;
      el.appendChild(textEl);
      return textEl;
    case NodeType.Comment:
      const comment = document.createComment(vnode.text);
      vnode.el = comment;
      el.appendChild(comment);
      return comment;
    case NodeType.DOM:
      let htmlEl = makeDOMVNode(vnode);
      const attrs = vnode.attrs;
      for (let name in attrs) {
        let value = attrs[name];
        if (value === true) {
          htmlEl.setAttribute(name, "");
        } else if (value !== false) {
          htmlEl.setAttribute(name, String(value));
        }
      }
      for (let c in vnode.class) {
        if (vnode.class[c]) {
          htmlEl.classList.add(c);
        }
      }
      if (vnode.on) {
        for (let ev in vnode.on) {
          const handler = vnode.on[ev];
          htmlEl.addEventListener(ev as any, handler.cb);
        }
      }
      el.appendChild(htmlEl);
      return htmlEl;
    case NodeType.Data: {
      const child = vnode.child;
      if (child) {
        const nodeEl = patch(el, child);
        const createHook = vnode.hooks.create;
        if (createHook) {
          createHook(nodeEl);
        }
        return nodeEl;
      }
      return null;
    }
    case NodeType.Multi: {
      let nodeEl: VNodeEl = null;
      for (let child of vnode.children) {
        nodeEl = patch(el, child);
      }
      return nodeEl;
    }
    case NodeType.Static: {
      const staticEl = staticNodes[vnode.id].cloneNode(true) as HTMLElement;
      el.appendChild(staticEl);
      return staticEl;
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
        case NodeType.Static:
          const staticNode = staticNodes[target.id].cloneNode(true) as HTMLElement;
          vnode.el!.replaceWith(staticNode);
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
        case NodeType.Static:
          const staticNode = staticNodes[target.id].cloneNode(true) as HTMLElement;
          vnode.el!.replaceWith(staticNode);
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
        case NodeType.Static:
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
