import { NodeType, VNodeEl, VNode, VDOMNode, VMultiNode } from "./types";

// -----------------------------------------------------------------------------
// patch and update
// -----------------------------------------------------------------------------

let staticNodes: HTMLElement[] | null = null;

export function patch<T>(el: HTMLElement | DocumentFragment, vnode: VNode<T>): VNodeEl {
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
    case NodeType.Root: {
      const child = vnode.child;
      if (child) {
        const current = staticNodes;
        staticNodes = vnode.staticNodes;
        const nodeEl = patch(el, child);
        staticNodes = current;
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
      const current = staticNodes;
      if (vnode.staticNodes) {
        staticNodes = vnode.staticNodes;
      }
      for (let child of vnode.children) {
        nodeEl = patch(el, child);
      }
      staticNodes = current;

      return nodeEl;
    }
    case NodeType.Static: {
      const staticEl = staticNodes![vnode.id].cloneNode(true) as HTMLElement;
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
          const staticNode = staticNodes![target.id].cloneNode(true) as HTMLElement;
          vnode.el!.replaceWith(staticNode);
          return;
        case NodeType.DOM:
          vnode.el!.replaceWith(makeDOMVNode(target));
          return;
        case NodeType.Root:
        case NodeType.Multi:
        case NodeType.Comment:
          throw new Error("not yet implemented");
      }
    case NodeType.DOM:
      switch (target.type) {
        case NodeType.DOM:
          if (vnode.key === target.key && vnode.tag === target.tag) {
            updateChildren(vnode, target);
          } else {
            vnode.el!.replaceWith(makeDOMVNode(target));
          }
          return;
        case NodeType.Static:
          const staticNode = staticNodes![target.id].cloneNode(true) as HTMLElement;
          vnode.el!.replaceWith(staticNode);
          return;
        case NodeType.Text:
        case NodeType.Root:
        case NodeType.Comment:
        case NodeType.Multi:
          throw new Error("not yet implemented");
      }
    case NodeType.Root:
      switch (target.type) {
        case NodeType.Root:
          update(vnode.child!, target.child!);
          return;
        case NodeType.Text:
        case NodeType.Static:
        case NodeType.DOM:
        case NodeType.Root:
        case NodeType.Comment:
        case NodeType.Multi:
          throw new Error("not yet implemented");
      }
    case NodeType.Multi:
      switch (target.type) {
        case NodeType.Multi:
          updateChildren(vnode, target);
          return;
        case NodeType.Text:
        case NodeType.DOM:
        case NodeType.Comment:
        case NodeType.Root:
          throw new Error("not yet implemented");
      }
  }
}

function isSame(vn1: VNode<any>, vn2: VNode<any>): boolean {
  return vn1.type === vn2.type && vn1.key === vn2.key;
  //   if (vn1.type !== vn2.type) {
  //     return false;
  //   }
  //   switch (vn1.type) {
  //     case NodeType.DOM:
  //       return vn1.key === (vn2 as VDOMNode<any>).key && vn1.tag === (vn2 as VDOMNode<any>).tag;

  //   }
  //   if (vn1.type === NodeType.DOM && vn2.type === NodeType.DOM) {

  //   }
}

function updateChildren<T>(
  vnode: VDOMNode<T> | VMultiNode<T>,
  newParent: VDOMNode<T> | VMultiNode<T>
) {
  const oldChildren = vnode.children;
  const parentElm = (vnode as any).el;
  const newChildren = newParent.children;
  let oldStartIdx = 0;
  let newStartIdx = 0;
  let oldEndIdx = oldChildren.length - 1;
  let newEndIdx = newChildren.length - 1;
  let oldStartVnode = oldChildren[0];
  let newStartVnode = newChildren[0];
  // console.warn(oldChildren, newChildren)

  // main update loop
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    // console.warn(JSON.stringify(oldStartVnode));
    // console.warn( JSON.stringify(newStartVnode))

    if (isSame(oldStartVnode, newStartVnode)) {
      update(oldStartVnode, newStartVnode);
      oldStartVnode = oldChildren[++oldStartIdx];
      newStartVnode = newChildren[++newStartIdx];
    } else {
      throw new Error("boom" + oldStartVnode);
    }
    // console.warn(oldStartIdx, oldEndIdx, newStartIdx, newEndIdx)
  }

  // the diff is done now. But there may be still nodes to add or remove
  if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
    if (oldStartIdx > oldEndIdx) {
      for (; newStartIdx <= newEndIdx; ++newStartIdx) {
        patch(parentElm, newChildren[newStartIdx]);
      }
      // before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
      // addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else {
      // removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }
  // const l = newChildren.length;
  // for (let i = 0; i < l; i++) {
  //   update(oldChildren[i], newChildren[i]);
  // }
}
