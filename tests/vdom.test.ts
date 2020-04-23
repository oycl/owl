import { patch, update, NodeType, VTextNode, VMainNode, VNode, VDOMNode } from "../src/vdom";

let nextId = 1;
function textNode(text: string): VTextNode {
  return {
    type: NodeType.Text,
    text,
    el: null,
  };
}

function domNode(tag: string, children: VNode[]): VDOMNode<any>;
function domNode(tag: string, key: string | number, children: VNode[]): VDOMNode<any>;
function domNode(tag: string, arg2, arg3?): VDOMNode<any> {
  const children = arg3 instanceof Array ? arg3 : arg2;
  const key = arg3 instanceof Array ? arg2 : nextId++;
  return {
    type: NodeType.DOM,
    tag: tag,
    el: null,
    children,
    key,
  };
}

function mainNode(children: VNode[]): VMainNode<any> {
  return {
    type: NodeType.Content,
    children,
    data: null,
    key: nextId++,
    hooks: {},
  };
}

let fixture: HTMLElement;

beforeEach(() => {
  fixture = document.createElement("div");
});

describe("patch function", () => {
  test("can make a simple text node", () => {
    const vnode = textNode("abc");
    expect(vnode.el).toBeNull();
    patch(fixture, vnode);
    expect(vnode.el).toEqual(document.createTextNode("abc"));
    expect(fixture.innerHTML).toBe("abc");
  });

  test("can patch into a fragment", () => {
    const vnode = textNode("abc");
    expect(vnode.el).toBeNull();
    const fragment = document.createDocumentFragment();
    patch(fragment, vnode);
    expect(vnode.el).toEqual(document.createTextNode("abc"));
    fixture.appendChild(fragment);
    expect(fixture.innerHTML).toBe("abc");
  });

  test("can make a simple dom node", () => {
    const vnode = domNode("div", []);
    expect(vnode.el).toBeNull();
    patch(fixture, vnode);
    expect(vnode.el).toEqual(document.createElement("div"));
    expect(fixture.innerHTML).toBe("<div></div>");
  });

  test("can make a dom node with text content", () => {
    const vnode = domNode("div", [textNode("abc")]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");
  });

  test("can build on an empty content node", () => {
    const vnode = mainNode([]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("");
  });

  test("can build on an non empty content node", () => {
    const vnode = mainNode([textNode("abc"), domNode("div", [])]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc<div></div>");
  });

  test("content node in a dom node in a content node", () => {
    const vnode = mainNode([textNode("abc"), mainNode([domNode("span", [textNode("text")])])]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc<span>text</span>");
  });
});

describe("update function", () => {
  test("can update some text content", async () => {
    const vnode = textNode("abc");
    patch(fixture, vnode);
    const text = fixture.childNodes[0];
    expect(text).toEqual(document.createTextNode("abc"));

    update(vnode, textNode("def"));
    expect(fixture.innerHTML).toBe("def");
    expect(fixture.childNodes[0]).toBe(text);
  });

  test("can update a text inside a div content, same key", async () => {
    const vnode = domNode("div", "k", [textNode("abc")]);
    patch(fixture, vnode);
    const text = fixture.childNodes[0].childNodes[0];
    expect(fixture.innerHTML).toBe("<div>abc</div>");
    expect(text).toEqual(document.createTextNode("abc"));

    update(vnode, domNode("div", "k", [textNode("def")]));
    expect(fixture.innerHTML).toBe("<div>def</div>");
    expect(fixture.childNodes[0].childNodes[0]).toBe(text);
  });

  test("can update a text inside a div content, different key", async () => {
    const vnode = domNode("div", "k1", [textNode("abc")]);
    patch(fixture, vnode);
    const text = fixture.childNodes[0].childNodes[0];
    expect(fixture.innerHTML).toBe("<div>abc</div>");
    expect(text).toEqual(document.createTextNode("abc"));

    update(vnode, domNode("div", "k2", [textNode("def")]));
    expect(fixture.innerHTML).toBe("<div>def</div>");
    expect(fixture.childNodes[0].childNodes[0]).not.toBe(text);
  });

  test("can transform a dom node into a different dom node type", async () => {
    let vnode: VNode = domNode("div", [textNode("abc")]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");

    update(vnode, domNode("span", [textNode("def")]));

    expect(fixture.innerHTML).toBe("<span>def</span>");
  });

  test("can transform a text node into a dom node", async () => {
    const vnode = textNode("abc");
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc");

    update(vnode, domNode("span", [textNode("def")]));
    expect(fixture.innerHTML).toBe("<span>def</span>");
  });

  test("can transform a content node into another content node", async () => {
    const oldvnode = mainNode([domNode("div", [textNode("abc")])]);
    const newvnode = mainNode([domNode("div", [textNode("def")])]);
    patch(fixture, oldvnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");

    update(oldvnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>def</div>");
  });

  test("can update two text nodes", async () => {
    const vnode = mainNode([textNode("abc"), textNode("def")]);
    const newvnode = mainNode([textNode("abc"), textNode("ghi")]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abcdef");

    const t1 = fixture.childNodes[0];
    const t2 = fixture.childNodes[1];
    expect(t2.textContent).toBe("def");
    update(vnode, newvnode);
    expect(fixture.innerHTML).toBe("abcghi");
    expect(fixture.childNodes[0]).toBe(t1);
    expect(fixture.childNodes[1]).toBe(t2);
    expect(t2.textContent).toBe("ghi");
  });

  test("can update two text nodes in a div, same key", async () => {
    const oldvnode = domNode("div", "k1", [textNode("abc"), textNode("def")]);
    const newvnode = domNode("div", "k1", [textNode("abc"), textNode("ghi")]);
    patch(fixture, oldvnode);
    expect(fixture.innerHTML).toBe("<div>abcdef</div>");

    const t1 = fixture.childNodes[0].childNodes[0];
    const t2 = fixture.childNodes[0].childNodes[1];
    expect(t2.textContent).toBe("def");
    update(oldvnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>abcghi</div>");
    expect(fixture.childNodes[0].childNodes[0]).toBe(t1);
    expect(fixture.childNodes[0].childNodes[1]).toBe(t2);
    expect(t2.textContent).toBe("ghi");
  });

  test("can update two text nodes in a div, different key", async () => {
    const vnode = domNode("div", "k1", [textNode("abc"), textNode("def")]);
    const newvnode = domNode("div", "k2", [textNode("abc"), textNode("ghi")]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div>abcdef</div>");

    const t1 = fixture.childNodes[0].childNodes[0];
    const t2 = fixture.childNodes[0].childNodes[1];
    expect(t2.textContent).toBe("def");
    update(vnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>abcghi</div>");
    expect(fixture.childNodes[0].childNodes[0]).not.toBe(t1);
    expect(fixture.childNodes[0].childNodes[1]).not.toBe(t2);
    expect(t2.textContent).toBe("def");
  });

  test("updating dom nodes with different keys", async () => {
    const vnode = domNode("div", []);
    patch(fixture, vnode);
    const div = fixture.childNodes[0] as HTMLDivElement;
    expect(div.tagName).toBe("DIV");
    update(vnode, domNode("div", []));
    expect(fixture.innerHTML).toBe("<div></div>");
    expect(fixture.childNodes[0]).not.toBe(div);
  });
});

describe("hooks", () => {
  test("create hook on a content node", () => {
    const vnode = mainNode([]);
    vnode.hooks.create = jest.fn();
    patch(fixture, vnode);
    expect(vnode.hooks.create).toHaveBeenCalledTimes(1);
  });

  test("create hook on a content node", () => {
    const vnode = mainNode([domNode("div", [])]);
    vnode.hooks.create = jest.fn();
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div></div>");
    const div = fixture.querySelector("div");
    expect(vnode.hooks.create).toHaveBeenCalledTimes(1);
    expect(vnode.hooks.create).toHaveBeenCalledWith(div);
  });

  test("create hook, content node with two dom children", () => {
    const vnode = mainNode([domNode("div", []), domNode("span", [])]);
    vnode.hooks.create = jest.fn();
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div></div><span></span>");
    const span = fixture.querySelector("span");
    expect(span).toBeDefined();
    expect(vnode.hooks.create).toHaveBeenCalledTimes(1);
    expect(vnode.hooks.create).toHaveBeenCalledWith(span);
  });

  test("create hook on a content node, 1 text node", () => {
    const vnode = mainNode([textNode("abc")]);
    vnode.hooks.create = jest.fn();
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc");
    const text = fixture.firstChild;
    expect(text).toBeDefined();
    expect(vnode.hooks.create).toHaveBeenCalledTimes(1);
    expect(vnode.hooks.create).toHaveBeenCalledWith(text);
  });
});
