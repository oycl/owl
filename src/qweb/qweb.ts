import { CompiledTemplate, compileTemplate, RenderContext, handleEvent } from "./compiler";
import { buildTree } from "../vdom/vdom";
import { NodeType, VNode, VRootNode, VMultiNode } from "../vdom/types";
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
    buildTree({ type: NodeType.Multi, children: vdomArray }, div);
    return div.innerHTML;
  },
  vMultiToString: function (multi: VMultiNode<any>): string {
    const div = document.createElement("div");
    buildTree(multi, div);
    return div.innerHTML;
  },
  callTemplate(tree: VTemplateRoot<any>, name: string, ctx: RenderContext) {
    const subtree: VTemplateRoot<any> = qweb.createRoot(name, tree.data);
    subtree.renderFn(subtree, ctx);
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

export interface VTemplateRoot<T> extends VRootNode<T> {
  renderFn(tree: VRootNode<T>, context: RenderContext): void;
}

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

  createRoot<T>(template: string, data: T): VTemplateRoot<T> {
    const { fn, staticNodes } = this.getTemplateFn(template);
    return {
      type: NodeType.Root,
      data,
      child: null,
      key: -1,
      hooks: {},
      staticNodes,
      renderFn: fn.bind(qwebContext),
      anchor: null,
      position: null,
    };
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
    const tree: VTemplateRoot<any> = qweb.createRoot(name, {});
    tree.renderFn(tree, context);
    const div = document.createElement("div");
    buildTree(tree, div);

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
