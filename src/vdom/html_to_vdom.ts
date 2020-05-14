import { VNode, NodeType } from "./types";
import { VDomArray } from "./vdom";

// -----------------------------------------------------------------------------
// html to vdom
// -----------------------------------------------------------------------------

const parser = new DOMParser();

/**
 * We can put the vdom expression in a cache because it is only html content,
 * there are no t-component or any kind of dynamic element inside. Therefore,
 * the way this will be used by owl is to simply patch it. This will add a el
 * node on those vnodes, but it is fine because it will be ignored anyway on
 * subsequent patches, due to the fact that we have a different patch/update
 * methods.
 */
const cache: { [html: string]: VNode[] } = {};

export function htmlToVDOM(html: string | VDomArray): VNode[] {
  if (html instanceof VDomArray) {
    return html;
  }
  if (!cache[html]) {
    const doc = parser.parseFromString(html, "text/html");
    const result: VNode[] = [];
    for (let child of doc.body.childNodes) {
      result.push(htmlToVNode(child));
    }
    cache[html] = result;
  }
  return cache[html];
}

function htmlToVNode(node: ChildNode): VNode {
  if (!(node instanceof Element)) {
    return { type: NodeType.Text, text: node.textContent! };
  }
  const attrs: { [attr: string]: string } = {};
  for (let attr of node.attributes) {
    attrs[attr.name] = attr.textContent || "";
  }
  const children: VNode[] = [];
  for (let c of node.childNodes) {
    children.push(htmlToVNode(c));
  }
  return {
    type: NodeType.DOM,
    tag: node.tagName,
    children,
    key: -1,
    attrs,
  };
}
