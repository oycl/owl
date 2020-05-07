import { CompiledTemplate, compileTemplate, RenderContext } from "./compiler";
import { patch, NodeType, VNode } from "../vdom";
import { VTree } from "../core";

// -----------------------------------------------------------------------------
// Global template Map
// -----------------------------------------------------------------------------

let nextId = 1;

let templateMap: { [name: string]: string } = {};

export let compiledTemplates: { [name: string]: CompiledTemplate } = {};

export function addTemplate(name: string, template: string) {
  templateMap[name] = template;
}

export function xml(strings, ...args) {
  const name = `__template__${nextId++}`;
  const value = String.raw(strings, ...args);
  addTemplate(name, value);
  return name;
}

/**
 * Exported for testing purposes
 */
export function clearQWeb() {
  nextId = 1;
  templateMap = {};
  compiledTemplates = {};
}

// -----------------------------------------------------------------------------
// QWeb
// -----------------------------------------------------------------------------

export const utils: any = {
  zero: Symbol("zero"),
  VDomArray: class VDomArray extends Array {},
  vDomToString: function (vdomArray: VNode<any>[]): string {
    const div = document.createElement("div");
    patch(div, { type: NodeType.Multi, children: vdomArray });
    return div.innerHTML;
  },
  callTemplate(tree: VTree, name: string, ctx: RenderContext) {
    const subtree: VTree = {
      type: NodeType.Data,
      data: tree.data,
      child: null,
      key: 1,
      hooks: {},
    };
    let fn = getTemplateFn(name);
    fn.call(utils, subtree, ctx);
    return subtree;
  },
};

export function getTemplateFn(template: string): CompiledTemplate {
  let fn = compiledTemplates[template];
  if (!fn) {
    const rawTemplate = templateMap[template];
    if (rawTemplate === undefined) {
      throw new Error("qweb not implemented yet...");
    }

    fn = compileTemplate(template, rawTemplate);
    compiledTemplates[template] = fn;
  }
  return fn;
}
