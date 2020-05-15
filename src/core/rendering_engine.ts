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

export interface FComponent<T = any, Env = any> {
  template: string;
  components?: { [key: string]: FComponent<any> | CComponent };
  name?: string;
  setup?: (props: any, env: Env) => T | void;
}

export type CComponent = typeof Component;

export type CInstance = Component;

export type FInstance<T = {}, Env = any> = T & {
  __owl__: OwlElement<T>;
  props: any;
  env: Env;
};

export interface OwlElement<T = any> {
  fiber: Fiber;
  components: { [key: string]: FComponent<T> | CComponent };
  isMounted: boolean;
  instance: FInstance<T> | CInstance | null;
  vnode: VRootNode;
  qweb: QWebTemplate;
}

// -----------------------------------------------------------------------------
// Main owl engine
// -----------------------------------------------------------------------------
export const core = {
  current: null as null | OwlElement,
};

// -----------------------------------------------------------------------------
// Mount
// -----------------------------------------------------------------------------
export type MountTarget = HTMLElement | DocumentFragment;

export interface MountConfig {
  props?: Object;
  env?: Object;
}

export function mount<C extends CComponent>(
  Comp: C,
  target: MountTarget,
  config?: MountConfig
): Promise<InstanceType<C>>;
export function mount(
  comp: CInstance,
  target: MountTarget,
  config?: MountConfig
): Promise<CInstance>;
export function mount<T>(
  Comp: FComponent<T>,
  target: MountTarget,
  config?: MountConfig
): Promise<FInstance<T extends {} ? T : {}>>;
export function mount(
  comp: FInstance,
  target: MountTarget,
  config?: MountConfig
): Promise<FInstance>;
export async function mount(
  info: any,
  target: MountTarget,
  config: MountConfig = {}
): Promise<CInstance | FInstance> {
  if (!(target instanceof HTMLElement || target instanceof DocumentFragment)) {
    const name =
      info instanceof Component ? info.constructor.name : (info as any).name || "No Name";
    let message = `Component '${name}' cannot be mounted: the target is not a valid DOM node.`;
    message += `\nMaybe the DOM is not ready yet? (in that case, you can use owl.utils.whenReady)`;
    throw new Error(message);
  }
  if (info instanceof Component) {
    const elem = info.__owl__!;
    return scheduler.addFiber(elem.fiber).then(() => {
      target.appendChild(info.el!);
      return info;
    });
  }
  let element: OwlElement;
  let props = config.props || {};
  let env = config.env || {};
  if (info.prototype instanceof Component || info === Component) {
    // this is a CComponent (Class Component)
    element = makeCComponent(info, props, env);
  } else if ("__owl__" in info) {
    // this is a CInstance or a FInstance
    element = info.__owl__;
  } else {
    // this is a FComponent
    element = makeFComponent(info, props, env);
  }
  return scheduler.addFiber(element.fiber).then(() => {
    const fragment = document.createDocumentFragment();
    buildTree(element.vnode, (fragment as any) as HTMLElement);
    target.appendChild(fragment);
    if (document.body.contains(target)) {
      mountTree(element);
    }
    return element.instance!;
  });
}

function mountTree(element: OwlElement) {
  element.isMounted = true;
}

function makeFComponent(fn: FComponent, props: any, env: any): OwlElement {
  let template: string = fn.template;
  if (!template) {
    const name = fn.name || "Anonymous Function Component";
    throw new Error(`Component "${name}" does not have a template defined!`);
  }
  const fiber = new Fiber(null);
  fiber.counter++;
  const qtemplate = qweb.getTemplate(template);
  const vnode = qtemplate.createRoot();
  const elem: OwlElement = {
    fiber,
    instance: null,
    isMounted: false,
    vnode,
    components: fn.components || {},
    qweb: qtemplate,
  };
  core.current = elem;
  let instance = Object.create(fn.setup ? fn.setup(props, env) || {} : {});
  instance.props = props;
  instance.__owl__ = elem;
  instance.env = env;

  elem.instance = instance;

  // next code duplicated with makeCComponent
  new Promise(async (resolve) => {
    qtemplate.render(vnode, instance, elem);
    fiber.counter--;
    resolve();
  });
  return elem;
}

function makeCComponent<C extends typeof Component>(C: C, props: any, env: any): OwlElement {
  let template: string = C.template;
  if (!template) {
    throw new Error(`Component "${C.name}" does not have a template defined!`);
  }
  const fiber = new Fiber(null);
  fiber.counter++;
  const qtemplate = qweb.getTemplate(template);
  const vnode = qtemplate.createRoot();
  const elem: OwlElement = {
    fiber,
    instance: null,
    isMounted: false,
    vnode: vnode,
    components: C.components,
    qweb: qtemplate,
  };
  core.current = elem;
  const component = new C(props, env) as InstanceType<C>;
  component.__owl__ = elem;
  elem.instance = component;
  vnode.hooks.create = (el) => (component.el = el);

  // next code duplicated with makeFComponent
  new Promise((resolve) => {
    qtemplate.render(vnode, component, elem);
    fiber.counter--;
    resolve();
  });
  return elem;
}

qwebUtils.makeComponent = function (
  parent: OwlElement,
  name: string,
  context: RenderContext
): VRootNode {
  const definition = context[name] || parent.components[name];
  const isClass = definition.prototype instanceof Component;
  let component = isClass ? makeCComponent(definition, {}, {}) : makeFComponent(definition, {}, {});
  return component.vnode;
};

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------

export function render(elem: OwlElement): Promise<void> {
  const fiber = new Fiber(null);
  const newRoot = elem.qweb.createRoot();
  elem.fiber = fiber;
  fiber.counter = 1;
  new Promise((resolve) => {
    elem.qweb.render(newRoot, elem.instance!, elem);
    fiber.counter--;
    resolve();
  });
  return scheduler.addFiber(fiber).then(() => {
    patch(elem.vnode, newRoot);
  });
}
