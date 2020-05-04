import { Component } from "./component";
import { Fiber } from "./fiber";
import { getTemplateFn, utils as qwebUtils } from "./qweb/qweb";
import { CompiledTemplate, RenderContext } from "./qweb/compiler";
import { scheduler } from "./scheduler";
import { patch, VDataNode, NodeType } from "./vdom";
import { escape } from "./utils";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface FunctionComponent {
  template: string;
  setup?: (props: any) => any | void | Promise<any | void>;
}

export interface ComponentData {
  fiber: Fiber;
  templateFn: CompiledTemplate;
  context: any;
}

export type VTree = VDataNode<ComponentData>;

// -----------------------------------------------------------------------------
// mount
// -----------------------------------------------------------------------------

type MountTarget = HTMLElement;

export function mount<Ctx>(target: MountTarget, fn: FunctionComponent): Promise<Ctx>;
export function mount<C extends typeof Component>(
  target: MountTarget,
  Comp: C
): Promise<InstanceType<C>>;
export async function mount(target: MountTarget, elem: any): Promise<any> {
  let tree: VTree;

  if (elem.prototype instanceof Component) {
    tree = makeClassComponent(elem);
  } else {
    tree = makeFnComponent(elem);
  }
  return scheduler.addFiber(tree.data.fiber).then(() => {
    const fragment = document.createDocumentFragment();
    patch(fragment, tree);
    target.appendChild(fragment);
    return tree.data.context;
  });
}

function makeFnComponent(fn: FunctionComponent): VTree {
  const fiber = new Fiber(null);
  fiber.counter++;
  const context = fn.setup ? fn.setup({}) : {};
  const data: ComponentData = {
    fiber,
    context,
    templateFn: getTemplateFn(fn.template),
  };
  const tree: VTree = {
    type: NodeType.Data,
    data,
    child: null,
    key: 1,
    hooks: {},
  };
  new Promise(async (resolve) => {
    tree.data.templateFn.call(qwebUtils, tree, context);
    fiber.counter--;
    resolve();
  });
  return tree;
}
function makeClassComponent(C: typeof Component): VTree {
  let template: string = C.template;
  const c = new C();
  const fiber = new Fiber(null);
  fiber.counter++;
  const data: ComponentData = {
    fiber,
    context: c,
    templateFn: getTemplateFn(template),
  };
  const tree: VTree = {
    type: NodeType.Data,
    data,
    child: null,
    key: 1,
    hooks: {},
  };
  tree.hooks.create = (el) => (c.el = el);
  new Promise((resolve) => {
    tree.data.templateFn.call(qwebUtils, tree, c);
    fiber.counter--;
    resolve();
  });
  return tree;
}

qwebUtils.makeComponent = function (parent: VTree, name: string, context: RenderContext): VTree {
  const definition = context[name];
  if (definition instanceof Component) {
    throw new Error("not done yet");
  } else {
    return makeFnComponent(definition);
  }
};

/**
 * Render a template to a html string.
 *
 * Note that this is more limited than the `render` method: it is not suitable
 * to render a full component tree, since this is an asynchronous operation.
 * This method can only render templates without components.
 */
export function renderToString(name: string, context: RenderContext = {}): string {
  const fn = getTemplateFn(name);
  const tree: VTree = {
    type: NodeType.Data,
    data: {} as any,
    child: null,
    key: 1,
    hooks: {},
  };
  fn.call(qwebUtils, tree, context);
  const div = document.createElement("div");
  patch(div, tree);

  function escapeTextNodes(node) {
    if (node.nodeType === 3) {
      node.textContent = escape(node.textContent);
    }
    for (let n of node.childNodes) {
      escapeTextNodes(n);
    }
  }
  escapeTextNodes(div);
  return div.innerHTML;
}
