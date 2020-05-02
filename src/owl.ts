import { Component } from "./component";
import { Fiber } from "./fiber";
import { RenderContext, renderTemplate } from "./qweb";
import { scheduler } from "./scheduler";
import { patch, update as updateVNode, VDataNodeMulti, VDataNode } from "./vdom";

export const enum RootType {
  Basic,
  Function,
  Component,
}

interface Data {
  fiber: Fiber;

  // todo: replace this by render function???
  template: string;
}

interface BasicRootData extends Data {
  type: RootType.Basic;
}

interface FunctionRootData extends Data {
  type: RootType.Function;
  fn: FnInstance;
}

interface ComponentRootData extends Data {
  type: RootType.Component;
  comp: Component;
}

export type RootData = BasicRootData | FunctionRootData | ComponentRootData;

export type VTree = VDataNode<RootData> | VDataNodeMulti<RootData>;

let currentType: RootType = RootType.Basic;
let currentFn: FnInstance;
let currentComp: Component;

// -----------------------------------------------------------------------------
// mount
// -----------------------------------------------------------------------------
type Fn = (env, props) => FnInstance;
type FnInstance = (props: any) => VTree;

interface MountConfig {
  target: HTMLElement;
}

export function mount(fn: Fn, config: MountConfig): Promise<VTree>;
export function mount(vnode: VTree, config: MountConfig): Promise<VTree>;
export function mount(Comp: typeof Component, config: MountConfig): Promise<VTree>;
export function mount(elem: any, config: MountConfig): Promise<VTree> {
  let vnode: VTree;

  if (typeof elem === "object") {
    vnode = elem;
  } else if (elem.prototype instanceof Component) {
    let template: string = elem.template;
    const c = new elem();
    currentType = RootType.Component;
    currentComp = c;
    vnode = render(template, c);
    vnode.hooks.create = (el) => (c.el = el);
  } else {
    const fnInstance = elem({}, {});
    currentFn = fnInstance;
    currentType = RootType.Function;
    vnode = fnInstance({});
  }
  const fiber = vnode.data.fiber;
  return scheduler.addFiber(fiber).then(() => {
    const fragment = document.createDocumentFragment();
    patch(fragment, vnode);
    config.target.appendChild(fragment);
    return vnode;
  });
}

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------

export function render(template: string, context: RenderContext = {}): VTree {
  const fiber = new Fiber(null);
  let data: RootData;
  switch (currentType) {
    case RootType.Basic:
      data = { fiber, template, type: RootType.Basic };
      break;
    case RootType.Function:
      data = { fiber, template, type: RootType.Function, fn: currentFn };
      break;
    case RootType.Component:
      data = { fiber, template, type: RootType.Component, comp: currentComp };
      break;
  }
  return renderTemplate(data, context);
}

// -----------------------------------------------------------------------------
// update
// -----------------------------------------------------------------------------

export function update(vnode: VTree, context: RenderContext = {}): Promise<void> {
  const data = vnode.data;
  const fiber = new Fiber(null);
  data.fiber = fiber;

  const newTree = renderTemplate(data, context);
  return scheduler.addFiber(fiber).then(() => {
    updateVNode(vnode, newTree);
  });
}
