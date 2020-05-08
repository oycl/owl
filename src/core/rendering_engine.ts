import { Fiber } from "./fiber";
import { qweb } from "../qweb/qweb";
import { CompiledTemplate, RenderContext } from "../qweb/compiler";
import { scheduler } from "./scheduler";
import { patch, VDataNode, NodeType, update } from "../vdom/vdom";
import { Component } from "./component";

const { utils: qwebUtils, getTemplateFn } = qweb;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FunctionComponent {
  template: string;
  name?: string;
  setup?: (props: any, env: any) => any | void | Promise<any | void>;
}

export type ClassComponent = typeof Component;

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

type MountTarget = HTMLElement | DocumentFragment;

export interface MountOptions {
  props?: Object;
  env?: Object;
}

interface OwlEngine {
  currentVTree: VTree | null;
  // prettier-ignore
  mount<C extends ClassComponent>(target: MountTarget,Comp: C,options?: MountOptions): Promise<InstanceType<C>>;
  mount(target: MountTarget, fn: FunctionComponent, options?: MountOptions): Promise<FnInstance>;
  mount(target: MountTarget, comp: Component, options?: MountOptions): Promise<Component>;
  mount(target: MountTarget, fn: FnInstance, options?: MountOptions): Promise<FnInstance>;

  render(tree: VTree): Promise<void>;
}

// -----------------------------------------------------------------------------
// Main owl engine
// -----------------------------------------------------------------------------
export const engine: OwlEngine = {
  currentVTree: null,
  mount,
  render,
};

// -----------------------------------------------------------------------------
// Mount
// -----------------------------------------------------------------------------
async function mount(target: MountTarget, elem: any, options: MountOptions = {}): Promise<any> {
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
  const fiber = new Fiber(null);
  fiber.counter++;
  const data: ComponentData = {
    fiber,
    context: null,
    templateFn: getTemplateFn(template),
  };
  const tree: VTree = {
    type: NodeType.Data,
    data,
    child: null,
    key: 1,
    hooks: {},
  };
  const props = options.props || {};
  const env = options.env || {};
  engine.currentVTree = tree;
  const c = new C(props, env);
  c.__owl__ = tree;
  tree.data.context = c;
  tree.hooks.create = (el) => (c.el = el);
  new Promise((resolve) => {
    tree.data.templateFn.call(qwebUtils, tree, c);
    fiber.counter--;
    resolve();
  });
  return tree;
}

qwebUtils.makeComponent = function (parent: VTree, name: string, context: RenderContext): VTree {
  // todo: find a better way!!!! parent.data.context. ....
  const definition = context[name] || parent.data.context.constructor.components[name];
  if (definition.prototype instanceof Component) {
    return makeClassComponent(definition, {});
  } else {
    return makeFnComponent(definition, {});
  }
};

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------

function render(tree: VTree): Promise<void> {
  const fiber = new Fiber(null);
  const newTree: VTree = Object.create(tree);
  newTree.child = null;
  newTree.data.fiber = fiber;
  fiber.counter = 1;
  new Promise((resolve) => {
    tree.data.templateFn.call(qwebUtils, newTree, newTree.data.context);
    fiber.counter--;
    resolve();
  });
  return scheduler.addFiber(fiber).then(() => {
    update(tree, newTree);
  });
}
