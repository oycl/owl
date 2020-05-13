import { compileTemplate, handleEvent } from "./compiler";
import { buildTree } from "../vdom/vdom";
import { NodeType, VNode, VMultiNode, VRootNode } from "../vdom/types";
import { htmlToVDOM } from "../vdom/html_to_vdom";
import { escape } from "../utils";
import { TemplateInfo, RenderContext, QWebTemplate } from "./types";

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
  vDomToString: function (vdomArray: VNode[]): string {
    const div = document.createElement("div");
    buildTree({ type: NodeType.Multi, children: vdomArray }, div);
    return div.innerHTML;
  },
  vMultiToString: function (multi: VMultiNode): string {
    const div = document.createElement("div");
    buildTree(multi, div);
    return div.innerHTML;
  },
  callTemplate(tree: VRootNode, name: string, ctx: RenderContext, metadata?: any) {
    const template = qweb.getTemplate(name);
    const subtree = template.createRoot();
    template.render(subtree, ctx, metadata);
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
  compiledTemplates: {} as { [name: string]: TemplateInfo },

  addTemplate(name: string, template: string): void {
    this.templateMap[name] = template;
  },

  getTemplate(template: string): QWebTemplate {
    let templateInfo = qweb.compiledTemplates[template];
    if (!templateInfo) {
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

      templateInfo = compileTemplate(qweb, template, rawTemplate);
      qweb.compiledTemplates[template] = templateInfo;
    }
    return {
      createRoot() {
        return {
          type: NodeType.Root,
          child: null,
          key: -1,
          hooks: {},
          staticNodes: templateInfo.staticNodes,
          anchor: null,
          position: null,
        };
      },
      render: templateInfo.fn.bind(qwebContext),
    };
  },

  /**
   * Render a template to a html string.
   *
   * Note that this is more limited than the `render` method: it is not suitable
   * to render a full component tree, since this is an asynchronous operation.
   * This method can only render templates without components.
   */
  renderToString(name: string, context: RenderContext = {}): string {
    const template = qweb.getTemplate(name);
    const tree = template.createRoot();
    template.render(tree, context, null);
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
