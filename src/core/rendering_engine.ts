import { Fiber } from "./fiber";
import { qweb } from "../qweb/qweb";
import { RenderContext, QWebTemplate } from "../qweb/types";
import { scheduler } from "./scheduler";
import { buildTree, patch } from "../vdom/vdom";
import { Component } from "./component";
import { VRootNode } from "../vdom/types";

const { utils: qwebUtils } = qweb;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FunctionComponent {
  template: string;
  components?: { [key: string]: OwlComponent };
  name?: string;
  setup?: (props: any, env: any) => any | void | Promise<any | void>;
}

export type ClassComponent = typeof Component;

export type OwlComponent = FunctionComponent | ClassComponent;

export interface ComponentData {
  fiber: Fiber;
  components: { [key: string]: OwlComponent };
  context: any;
  isMounted: boolean;
  vnode: VRootNode;
  qweb: QWebTemplate;
}

// -----------------------------------------------------------------------------
// Main owl engine
// -----------------------------------------------------------------------------
export const engine = {
  current: null as null | ComponentData,
  mount,
  render,
};

// -----------------------------------------------------------------------------
// Mount
// -----------------------------------------------------------------------------
export type MountTarget = HTMLElement | DocumentFragment;

export interface MountOptions {
  props?: Object;
  env?: Object;
}

type MountComponent = ClassComponent | Component | FunctionComponent | ComponentData;

async function mount(
  target: MountTarget,
  elem: MountComponent,
  options: MountOptions = {}
): Promise<ComponentData> {
  if (!(target instanceof HTMLElement || target instanceof DocumentFragment)) {
    const name =
      elem instanceof Component ? elem.constructor.name : (elem as any).name || "Undefined";
    let message = `Component '${name}' cannot be mounted: the target is not a valid DOM node.`;
    message += `\nMaybe the DOM is not ready yet? (in that case, you can use owl.utils.whenReady)`;
    throw new Error(message);
  }
  if (elem instanceof Component) {
    const comp = elem.__owl__!;
    return scheduler.addFiber(comp.fiber).then(() => {
      target.appendChild(elem.el!);
      return comp;
    });
  }
  let component: ComponentData;
  // let result: any = null;
  if ((elem as any).prototype instanceof Component || elem === Component) {
    component = makeClassComponent(elem as any, options);
  } else if ((elem as any).vnode) {
    component = elem as any;
  } else {
    component = makeFnComponent(elem as any, options);
  }
  return scheduler.addFiber(component.fiber).then(() => {
    const fragment = document.createDocumentFragment();
    buildTree(component.vnode, (fragment as any) as HTMLElement);
    target.appendChild(fragment);
    if (document.body.contains(target)) {
      mountTree(component);
    }
    return component;
  });
}

function mountTree(component: ComponentData) {
  component.isMounted = true;
}

function makeFnComponent(fn: FunctionComponent, options: MountOptions): ComponentData {
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
  const qtemplate = qweb.getTemplate(template);
  const vnode = qtemplate.createRoot();
  const data: ComponentData = {
    fiber,
    context,
    components: fn.components || {},
    isMounted: false,
    vnode,
    qweb: qtemplate,
  };
  // const tree: VTree = qweb.createRoot(fn.template, data);

  new Promise(async (resolve) => {
    qtemplate.render(vnode, context, data);
    fiber.counter--;
    resolve();
  });
  return data;
}

function makeClassComponent(C: typeof Component, options: MountOptions): ComponentData {
  let template: string = C.template;
  if (!template) {
    throw new Error(`Component "${C.name}" does not have a template defined!`);
  }
  const fiber = new Fiber(null);
  fiber.counter++;
  const qtemplate = qweb.getTemplate(template);
  const vnode = qtemplate.createRoot();
  const data: ComponentData = {
    fiber,
    context: null,
    components: C.components || {},
    isMounted: false,
    vnode: vnode,
    qweb: qtemplate,
  };
  const props = options.props || {};
  const env = options.env || {};
  engine.current = data;
  const c = new C(props, env);
  c.__owl__ = data;
  data.context = c;
  vnode.hooks.create = (el) => (c.el = el);
  new Promise((resolve) => {
    qtemplate.render(vnode, c, data);
    fiber.counter--;
    resolve();
  });
  return data;
}

qwebUtils.makeComponent = function (
  parent: ComponentData,
  name: string,
  context: RenderContext
): VRootNode {
  const definition = context[name] || parent.components[name];
  const isClass = definition.prototype instanceof Component;
  let component = isClass ? makeClassComponent(definition, {}) : makeFnComponent(definition, {});
  return component.vnode;
};

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------

function render(component: ComponentData): Promise<void> {
  const fiber = new Fiber(null);
  const newRoot = component.qweb.createRoot();
  component.fiber = fiber;
  fiber.counter = 1;
  new Promise((resolve) => {
    component.qweb.render(newRoot, component.context, component);
    fiber.counter--;
    resolve();
  });
  return scheduler.addFiber(fiber).then(() => {
    patch(component.vnode, newRoot);
  });
}
