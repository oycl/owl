import { Fiber } from "./fiber";
import { getTemplateFn, utils as qwebUtils } from "./qweb/qweb";
import { CompiledTemplate, RenderContext } from "./qweb/compiler";
import { scheduler } from "./scheduler";
import { patch, VDataNode, NodeType } from "./vdom";
import { escape } from "./utils";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FunctionComponent {
  template: string;
  name?: string;
  setup?: (props: any, env: any) => any | void | Promise<any | void>;
}

export interface ComponentData {
  fiber: Fiber;
  templateFn: CompiledTemplate;
  context: any;
}

export interface FnInstance {
  vtree: VTree;
  context: any;
}

export type VTree = VDataNode<ComponentData>;

// -----------------------------------------------------------------------------
// mount
// -----------------------------------------------------------------------------

export class Component<Props = any, Env = any> {
  static template: string;
  props: Props;
  env: Env;

  el: HTMLElement | Text | Comment | null = null;
  __owl__: VTree | null = null;

  constructor(props: Props, env: Env) {
    this.props = props;
    this.env = env;
  }
}

type MountTarget = HTMLElement | DocumentFragment;

interface MountOptions {
  props?: Object;
  env?: Object;
}

export function mount(
  target: MountTarget,
  fn: FunctionComponent,
  options?: MountOptions
): Promise<FnInstance>;
export function mount<C extends typeof Component>(
  target: MountTarget,
  Comp: C,
  options?: MountOptions
): Promise<InstanceType<C>>;
export function mount(
  target: MountTarget,
  comp: Component,
  options?: MountOptions
): Promise<Component>;
export function mount(
  target: MountTarget,
  fn: FnInstance,
  options?: MountOptions
): Promise<FnInstance>;
export async function mount(
  target: MountTarget,
  elem: any,
  options: MountOptions = {}
): Promise<any> {
  let tree: VTree;
  let result: any = null;
  if (!(target instanceof HTMLElement || target instanceof DocumentFragment)) {
    const name = elem instanceof Component ? elem.constructor.name : elem.name || "Undefined";
    let message = `Component '${name}' cannot be mounted: the target is not a valid DOM node.`;
    message += `\nMaybe the DOM is not ready yet? (in that case, you can use owl.utils.whenReady)`;
    throw new Error(message);
  }
  if (elem instanceof Component) {
    return scheduler.addFiber(elem.__owl__!.data.fiber).then(() => {
      target.appendChild(elem.el!);
      return elem;
    });
  }
  if (elem.prototype instanceof Component || elem === Component) {
    tree = makeClassComponent(elem, options);
  } else if (elem.vtree) {
    tree = elem.vtree;
  } else {
    tree = makeFnComponent(elem, options);
    result = {
      vtree: tree,
      context: tree.data.context,
    };
  }
  return scheduler.addFiber(tree.data.fiber).then(() => {
    const fragment = document.createDocumentFragment();
    patch(fragment, tree);
    target.appendChild(fragment);
    return result || tree.data.context;
  });
}

function makeFnComponent(fn: FunctionComponent, options: MountOptions): VTree {
  let template: string = fn.template;
  if (!template) {
    const name = fn.name || "Anonymous Function Component";
    throw new Error(`Component "${name}" does not have a template defined!`);
  }
  const fiber = new Fiber(null);
  fiber.counter++;
  const props = options.props || {};
  const env = options.env || {};
  const context = fn.setup ? fn.setup(props, env) : {};
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

function makeClassComponent(C: typeof Component, options: MountOptions): VTree {
  let template: string = C.template;
  if (!template) {
    throw new Error(`Component "${C.name}" does not have a template defined!`);
  }
  const props = options.props || {};
  const env = options.env || {};
  const c = new C(props, env);
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
  c.__owl__ = tree;
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
    return makeFnComponent(definition, {});
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
