import { CompiledTemplate, compileTemplate, RenderContext, handleEvent } from "./compiler";
import { patch } from "../vdom/vdom";
import { NodeType, VNode, VDataNode } from "../vdom/types";
import { htmlToVDOM } from "../vdom/html_to_vdom";
import { escape } from "../utils";

// -----------------------------------------------------------------------------
// QWeb Context
// -----------------------------------------------------------------------------

/**
 * Everything defined in this object can be accessed from *inside* the compiled
 * template code, by using the `this` keyword. For ex:
 *  `this.callTemplate(tree, 'subtemplate', ctx);`
 */
const qwebContext: any = {
  zero: Symbol("zero"),
  VDomArray: class VDomArray extends Array {},
  vDomToString: function (vdomArray: VNode<any>[]): string {
    const div = document.createElement("div");
    patch(div, { type: NodeType.Multi, children: vdomArray });
    return div.innerHTML;
  },
  callTemplate(tree: VDataNode<any>, name: string, ctx: RenderContext) {
    const subtree: VDataNode<any> = {
      type: NodeType.Data,
      data: tree.data,
      child: null,
      key: 1,
      hooks: {},
    };
    let fn = qweb.getTemplateFn(name);
    fn.call(qwebContext, subtree, ctx);
    return subtree;
  },
  htmlToVDOM,
  handleEvent,
  toClassObj(expr: any) {
    if (typeof expr === "string") {
      expr = expr.trim();
      if (!expr) {
        return {};
      }
      let words = expr.split(/\s+/);
      let result: { [key: string]: boolean } = {};
      for (let i = 0; i < words.length; i++) {
        result[words[i]] = true;
      }
      return result;
    }
    return expr;
  },
};

// -----------------------------------------------------------------------------
// QWeb
// -----------------------------------------------------------------------------
export type QWeb = typeof qweb;

export const qweb = {
  nextId: 1,
  utils: qwebContext,
  templateMap: {} as { [name: string]: string },
  compiledTemplates: {} as { [name: string]: CompiledTemplate },

  addTemplate(name: string, template: string): void {
    this.templateMap[name] = template;
  },

  getTemplateFn(template: string): CompiledTemplate {
    let fn = qweb.compiledTemplates[template];
    if (!fn) {
      const rawTemplate = qweb.templateMap[template];
      if (rawTemplate === undefined) {
        let descr = template.slice(0, 100);
        if (template.length > 100) {
          descr = descr + "...";
        }
        throw new Error(
          `Cannot find template with name "${descr}". Maybe you should register it with "xml" helper.`
        );
      }

      fn = compileTemplate(qweb, template, rawTemplate);
      qweb.compiledTemplates[template] = fn;
    }
    return fn;
  },

  /**
   * Render a template to a html string.
   *
   * Note that this is more limited than the `render` method: it is not suitable
   * to render a full component tree, since this is an asynchronous operation.
   * This method can only render templates without components.
   */
  renderToString(name: string, context: RenderContext = {}): string {
    const fn = qweb.getTemplateFn(name);
    const tree: VDataNode<any> = {
      type: NodeType.Data,
      data: {},
      child: null,
      key: 1,
      hooks: {},
    };
    fn.call(qwebContext, tree, context);
    const div = document.createElement("div");
    patch(div, tree);

    escapeTextNodes(div);
    return div.innerHTML;
  },
};

function escapeTextNodes(node: Node) {
  if (node.nodeType === 3) {
    node.textContent = escape(node.textContent!);
  }
  for (let n of node.childNodes) {
    escapeTextNodes(n);
  }
}
