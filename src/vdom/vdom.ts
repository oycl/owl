import { NodePosition, NodeType, VDOMNode, VMultiNode, VNode, VTextNode, VRootNode } from "./types";

// -----------------------------------------------------------------------------
// patch and update
// -----------------------------------------------------------------------------

function addNode(node: Node, anchor: HTMLElement, position: NodePosition) {
  switch (position) {
    case NodePosition.Append:
      anchor.appendChild(node);
      break;
    case NodePosition.Before:
      node.insertBefore(anchor.parentElement!, anchor);
      break;
  }
}

export function buildTree(
  vnode: VNode,
  anchor: HTMLElement,
  position: NodePosition = NodePosition.Append,
  staticNodes: HTMLElement[] = []
) {
  switch (vnode.type) {
    case NodeType.Text:
      let text = vnode.text; // === undefined ? "" : vnode.text;
      if (text === undefined || text === null) {
        text = "";
      }
      const textEl = document.createTextNode(text);
      vnode.el = textEl;
      addNode(textEl, anchor, position);
      break;
    case NodeType.Comment:
      const comment = document.createComment(vnode.text);
      vnode.el = comment;
      addNode(comment, anchor, position);
      break;
    case NodeType.DOM:
      const el = document.createElement(vnode.tag);
      vnode.el = el;
      for (let child of vnode.children) {
        buildTree(child, el, NodePosition.Append, staticNodes);
      }
      const attrs = vnode.attrs;
      for (let name in attrs) {
        let value = attrs[name];
        if (value === true) {
          el.setAttribute(name, "");
        } else if (value !== false) {
          el.setAttribute(name, String(value));
        }
      }
      for (let c in vnode.class) {
        if (vnode.class[c]) {
          el.classList.add(c);
        }
      }
      if (vnode.on) {
        for (let ev in vnode.on) {
          const handler = vnode.on[ev];
          el.addEventListener(ev as any, handler.cb);
        }
      }
      addNode(el, anchor, position);
      break;
    case NodeType.Root: {
      const child = vnode.child;
      vnode.anchor = anchor;
      vnode.position = position;
      if (child) {
        buildTree(child, anchor, position, vnode.staticNodes);
        const createHook = vnode.hooks.create;
        if (createHook) {
          const el = getEl(child);
          if (el) {
            createHook(el);
          }
        }
      }
      break;
    }
    case NodeType.Multi: {
      let multiStaticNodes = vnode.staticNodes || staticNodes;
      for (let child of vnode.children) {
        buildTree(child, anchor, position, multiStaticNodes);
      }
      break;
    }
    case NodeType.Static: {
      const staticEl = staticNodes![vnode.id].cloneNode(true) as HTMLElement;
      vnode.el = staticEl;
      addNode(staticEl, anchor, position);
      break;
    }
  }
}

function getEl(vnode: VNode): HTMLElement | Text | Comment | null {
  switch (vnode.type) {
    case NodeType.Multi:
      if (vnode.children.length === 1) {
        return getEl(vnode.children[0]);
      }
      return null;
    case NodeType.Root:
      return getEl(vnode.child!);
    case NodeType.Static:
      return vnode.el || null;
    case NodeType.Text:
    case NodeType.Comment:
      return vnode.el || null;
    case NodeType.DOM:
      return vnode.el || null;
  }
}

/**
 * This function assumes that oldvnode has been patched first (and so, has valid
 * html or text elements)
 *
 * Note that it assumes that vnode and target are the same (same key/type/...)
 * It mutates vnode in place
 */
export function patch(vnode: VNode, target: VNode, staticNodes: HTMLElement[] = []) {
  switch (vnode.type) {
    case NodeType.Text:
      vnode.el!.textContent = (target as VTextNode).text;
      break;
    case NodeType.DOM:
      updateChildren(vnode, target as VDOMNode, staticNodes);
      vnode.children = (target as VDOMNode).children;
      return;
    case NodeType.Static:
      // yeah! no need to do anything
      break;
    case NodeType.Root:
      if (isSame(vnode.child!, (target as VRootNode).child!)) {
        patch(vnode.child!, (target as VRootNode).child!, staticNodes);
      } else {
        removeTree(vnode.child!);
        vnode.child = (target as VRootNode).child;
        buildTree(
          (target as VRootNode).child!,
          (vnode.anchor as any) as HTMLElement,
          vnode.position!,
          staticNodes
        );
      }
      break;
    case NodeType.Multi:
      updateChildren(vnode, target as VMultiNode, staticNodes);
      break;
  }
}

function removeTree(vnode: VNode) {
  switch (vnode.type) {
    case NodeType.Multi:
      for (let child of vnode.children) {
        removeTree(child);
      }
      break;
    case NodeType.Root:
      removeTree(vnode.child!);
      break;
    case NodeType.Static:
    case NodeType.Text:
    case NodeType.DOM:
    case NodeType.Comment:
      vnode.el!.remove();
      break;
  }
}

function isSame(vn1: VNode, vn2: VNode): boolean {
  return vn1.type === vn2.type && vn1.key === vn2.key;
}

function updateChildren(
  vnode: VDOMNode | VMultiNode,
  newParent: VDOMNode | VMultiNode,
  staticNodes: HTMLElement[]
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
      patch(oldStartVnode, newStartVnode);
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
        buildTree(newChildren[newStartIdx], parentElm, NodePosition.Append, staticNodes);
      }
      // before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
      // addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else {
      // removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }
}
