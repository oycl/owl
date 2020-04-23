// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

import { NodeType } from "../vdom";

export class Component {
  static template: string;
}

// -----------------------------------------------------------------------------
// Mounting
// -----------------------------------------------------------------------------

type Fn = (env, props) => FnInstance;
type FnInstance = (props: any) => Promise<VNode>;

interface MountConfig {
  target: HTMLElement;
}

export function mount(fn: Fn, config: MountConfig): Promise<VNode>;
export function mount(Comp: typeof Component, config: MountConfig): Promise<VNode>;
export function mount(vnode: VNode, config: MountConfig): Promise<VNode>;
export async function mount(elem: any, config: MountConfig): Promise<VNode> {
  let node: VNode;
  if (typeof elem === "object") {
    node = elem;
  } else if (elem.prototype instanceof Component) {
    let template: string = (elem as typeof Component).template;
    const c = new (elem as typeof Component)();
    node = await qweb.render(template, c);
  } else {
    const instance = (elem as Fn)({}, {});
    node = await instance({});
  }
  const fiber = new MountingFiber(null, node, config.target);
  return scheduler.addFiber(fiber);
}

export function render(template: string, context: RenderContext = {}): Promise<VNode> {
  return qweb.render(template, context);
}

export function update(vnode: VNode, context: RenderContext): Promise<void> {
  vnode.context = context;
  vnode.builder.update(vnode, context);
  return Promise.resolve();
}

// -----------------------------------------------------------------------------
// Fiber
// -----------------------------------------------------------------------------

class Fiber {
  static nextId: number = 1;
  id = Fiber.nextId++;
  root: Fiber;
  error: Error | null = null;
  isCompleted: boolean = false;
  counter: number = 0;
  vnode: VNode;

  constructor(parent: Fiber | null, vnode: VNode) {
    this.root = parent || this;
    this.vnode = vnode;
  }

  cancel() {}

  complete() {}

  handleError(error: Error) {}
}

class MountingFiber extends Fiber {
  target: HTMLElement | DocumentFragment;

  constructor(parent: Fiber | null, vnode: VNode, target: HTMLElement | DocumentFragment) {
    super(parent, vnode);
    this.target = target;
  }

  complete() {
    mountVNode(this.vnode, this.target);
  }
}

// -----------------------------------------------------------------------------
// VDOM
// -----------------------------------------------------------------------------

function mountVNode(vnode: VNode, target: HTMLElement | DocumentFragment) {
  vnode.builder.initialize(vnode);
  target.appendChild(vnode.root!);
}

// -----------------------------------------------------------------------------
// Scheduler
// -----------------------------------------------------------------------------
interface Task {
  fiber: Fiber;
  callback: (err?: Error) => void;
}

const scheduler = {
  tasks: {} as { [id: number]: Task },
  isRunning: false,
  taskCount: 0,

  start() {
    this.isRunning = true;
    this.scheduleTasks();
  },

  stop() {
    this.isRunning = false;
  },

  addFiber(fiber: Fiber): Promise<VNode> {
    // if the fiber was remapped into a larger rendering fiber, it may not be a
    // root fiber.  But we only want to register root fibers
    fiber = fiber.root;
    return new Promise((resolve, reject) => {
      if (fiber.error) {
        return reject(fiber.error);
      }
      this.taskCount++;
      this.tasks[fiber.id] = {
        fiber,
        callback: () => {
          if (fiber.error) {
            return reject(fiber.error);
          }
          resolve(fiber.vnode);
        },
      };
      if (!this.isRunning) {
        this.start();
      }
    });
  },

  rejectFiber(fiber: Fiber, reason: string) {
    fiber = fiber.root;
    const task = this.tasks[fiber.id];
    if (task) {
      delete this.tasks[fiber.id];
      this.taskCount--;
      fiber.cancel();
      fiber.error = new Error(reason);
      task.callback();
    }
  },

  /**
   * Process all current tasks. This only applies to the fibers that are ready.
   * Other tasks are left unchanged.
   */
  flush() {
    for (let id in this.tasks) {
      let task = this.tasks[id];
      if (task.fiber.isCompleted) {
        task.callback();
        delete this.tasks[id];
        this.taskCount--;
      }
      if (task.fiber.counter === 0) {
        if (!task.fiber.error) {
          try {
            task.fiber.complete();
          } catch (e) {
            task.fiber.handleError(e);
          }
        }
        task.callback();
        delete this.tasks[id];
      }
    }
    if (this.taskCount === 0) {
      this.stop();
    }
  },

  scheduleTasks() {
    requestAnimationFrame(() => {
      this.flush();
      if (this.isRunning) {
        this.scheduleTasks();
      }
    });
  },
};

// -----------------------------------------------------------------------------
// QWeb Engine
// -----------------------------------------------------------------------------

interface RenderContext {
  [key: string]: any;
}

type RawTemplate = string;
type CompiledTemplate = (context: RenderContext) => VNode;

// todo: make this a class (??)
interface Builder {
  id: number;
  elems: HTMLElement[];
  fragments: DocumentFragment[];
  texts: Text[];
  initialize(this: Builder, node: VNode);
  update(node: VNode, context);
}

class VNode {
  context: RenderContext;
  builder: Builder;
  root: HTMLElement | DocumentFragment | Text | null = null;
  elems: HTMLElement[] = [];
  texts: Text[] = [];

  constructor(builderId: number, context: RenderContext) {
    this.builder = qweb.builders[builderId];
    this.context = context;
  }
}

interface QWeb {
  rawTemplates: { [name: string]: RawTemplate };
  templates: { [name: string]: CompiledTemplate };
  builders: { [id: number]: Builder };

  render(template: string, context?: RenderContext): Promise<VNode>;
  compile(template: string): CompiledTemplate;
}

const qweb: QWeb = {
  rawTemplates: {},
  templates: {},
  builders: {},

  async render(template: string, context: RenderContext = {}): Promise<VNode> {
    let fn = qweb.templates[template];
    if (!fn) {
      fn = qweb.compile(template);
    }
    return fn(context);
  },

  compile(template: string): CompiledTemplate {
    const ct = compiledTemplates[template];
    if (!ct) {
      throw new Error("BOOM" + template);
    }
    for (let b of ct.builders) {
      qweb.builders[b.id] = b;
    }
    qweb.templates[template] = ct.fn;
    return ct.fn;
  },
};

// -----------------------------------------------------------------------------
// Tree Diff Engine
// ----------------------------------------------------------------------------

// function patch(node: VNode, target: HTMLElement) {
//   node.builder.initialize(node);
//   target.appendChild(node.root!);
// }

// -----------------------------------------------------------------------------
// TEMP STUFF
// -----------------------------------------------------------------------------
interface CT {
  builders: Builder[];
  fn: CompiledTemplate;
}
const compiledTemplates: { [str: string]: CT } = {};

// <div>simple vnode</div>
compiledTemplates["<div>simple vnode</div>"] = {
  builders: [
    {
      id: 1,
      elems: [makeEl("<div>simple vnode</div>")],
      fragments: [],
      texts: [],
      initialize(node: VNode) {
        node.root = this.elems[0].cloneNode(true) as HTMLElement;
      },
      update() {},
    },
  ],
  fn: (context: RenderContext) => {
    return new VNode(1, context);
  },
};

// <div>functional component</div>
compiledTemplates["<div>functional component</div>"] = {
  builders: [
    {
      id: 2,
      elems: [makeEl("<div>functional component</div>")],
      fragments: [],
      texts: [],
      initialize(node: VNode) {
        node.root = this.elems[0].cloneNode(true) as HTMLElement;
      },
      update() {},
    },
  ],
  fn: (context: RenderContext) => {
    return new VNode(2, context);
  },
};

// <div>class component</div>
compiledTemplates["<div>class component</div>"] = {
  builders: [
    {
      id: 3,
      elems: [makeEl("<div>class component</div>")],
      fragments: [],
      texts: [],
      initialize(node: VNode) {
        node.root = this.elems[0].cloneNode(true) as HTMLElement;
      },
      update() {},
    },
  ],
  fn: (context: RenderContext) => {
    return new VNode(3, context);
  },
};

// <div>Hello <t t-esc="name"/></div>
compiledTemplates['<div>Hello <t t-esc="name"/></div>'] = {
  builders: [
    {
      id: 4,
      elems: [makeEl("<div>Hello </div>")],
      fragments: [],
      texts: [],
      initialize(node: VNode) {
        const context = node.context;
        const el1 = this.elems[0].cloneNode(true) as HTMLElement;
        const textNode1 = document.createTextNode(context.name);
        el1.appendChild(textNode1);
        node.texts.push(textNode1);
        node.root = el1;
      },
      update(node: VNode, context: RenderContext) {
        node.texts[0].textContent = context.name;
      },
    },
  ],
  fn: (context: RenderContext) => {
    const vn0 = { type: NodeType.Content, children: [] };
    const vn1 = { type: NodeType.DOM, tag: "div", el: null, children: [] };
    vn0.children.push(vn1);
    const vn2 = { type: NodeType.Text, text: "Hello ", el: null };
    vn1.children.push(vn2);
    const vn3 = { type: NodeType.Text, text: context.name, el: null };
    vn1.children.push(vn3);
    return vn0;
    return new VNode(4, context);
  },
};

// simple text node
compiledTemplates["simple text node"] = {
  builders: [
    {
      id: 5,
      elems: [],
      fragments: [],
      texts: [document.createTextNode("simple text node")],
      initialize(node: VNode) {
        node.root = this.texts[0].cloneNode(true) as Text;
      },
      update() {},
    },
  ],
  fn: (context: RenderContext) => {
    return new VNode(5, context);
  },
};

// multi root template
const f = document.createDocumentFragment();
f.appendChild(makeEl("<div>a</div>"));
f.appendChild(makeEl("<div>b</div>"));

compiledTemplates["<div>a</div><div>b</div>"] = {
  builders: [
    {
      id: 6,
      elems: [],
      fragments: [f],
      texts: [],
      initialize(node: VNode) {
        node.root = this.fragments[0].cloneNode(true) as DocumentFragment;
      },
      update() {},
    },
  ],
  fn: (context: RenderContext) => {
    return new VNode(6, context);
  },
};

// <span><Child /></span>
compiledTemplates["<span><Child /></span>"] = {
  builders: [
    {
      id: 7,
      elems: [makeEl("<span></span>")],
      fragments: [],
      texts: [],
      initialize(node: VNode) {
        node.root = this.elems[0].cloneNode(true) as HTMLElement;
      },
      update() {},
    },
  ],
  fn: (context: RenderContext) => {
    return new VNode(7, context);
  },
};

function makeEl(str: string): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = str;
  return div.children[0] as HTMLElement;
}
