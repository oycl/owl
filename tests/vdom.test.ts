import {
  NodeType,
  patch,
  update,
  VDataNode,
  VDOMNode,
  VMultiNode,
  VNode,
  VTextNode,
  VCommentNode,
  htmlToVDOM,
} from "../src/vdom";

let nextId = 1;
function textNode(text: any): VTextNode {
  return {
    type: NodeType.Text,
    text,
    el: null,
  };
}

function commentNode(text: string): VCommentNode {
  return {
    type: NodeType.Comment,
    text,
    el: null,
  };
}

type Attrs = { [name: string]: string };

function domNode(tag: string, children: VNode<any>[]): VDOMNode<any>;
function domNode(tag: string, attrs: Attrs, children: VNode<any>[]): VDOMNode<any>;
function domNode(tag: string, key: string | number, children: VNode<any>[]): VDOMNode<any>;
function domNode(
  tag: string,
  attrs: Attrs,
  key: string | number,
  children: VNode<any>[]
): VDOMNode<any>;
function domNode(tag: string, arg2: any, arg3?: any, arg4?: any): VDOMNode<any> {
  let children: VNode<any>[];
  let attrs: Attrs;
  let key: string | number;

  if (arg2 instanceof Array) {
    children = arg2;
    attrs = {};
    key = nextId++;
  } else if (typeof arg2 === "object") {
    attrs = arg2;
    if (arg3 instanceof Array) {
      children = arg3;
      key = nextId++;
    } else {
      key = arg3;
      children = arg4;
    }
  } else {
    key = arg2;
    children = arg3;
    attrs = {};
  }
  return {
    type: NodeType.DOM,
    tag: tag,
    el: null,
    children,
    attrs,
    key,
  };
}

function multiNode(children: VNode<any>[]): VMultiNode<any> {
  return {
    type: NodeType.Multi,
    children,
  };
}

function dataNode(child: VNode<any>): VDataNode<any> {
  return {
    type: NodeType.Data,
    child,
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

  test("can patch a simple dom node", () => {
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

  test("can patch an empty multi node", () => {
    const vnode = multiNode([]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("");
  });

  test("can patch a data node with text node", () => {
    const vnode = dataNode(textNode("abc"));
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc");
  });

  test("falsy text values", () => {
    const vnode = multiNode([
      domNode("p", [textNode(false)]),
      domNode("p", [textNode(undefined)]),
      domNode("p", [textNode(null)]),
      domNode("p", [textNode(0)]),
      domNode("p", [textNode("")]),
    ]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<p>false</p><p></p><p></p><p>0</p><p></p>");
  });

  test("can patch a data node with dom node", () => {
    const vnode = dataNode(domNode("div", [textNode("abc")]));
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");
  });

  test("can patch a non empty multi node", () => {
    const vnode = multiNode([textNode("abc"), domNode("div", [])]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc<div></div>");
  });

  test("multi node in a multi node", () => {
    const vnode = multiNode([textNode("abc"), multiNode([domNode("span", [textNode("text")])])]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc<span>text</span>");
  });

  test("comment node", () => {
    const vnode = commentNode("comment");
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<!--comment-->");
  });

  describe("attributes", () => {
    test("can make a dom node with an attribute", () => {
      const vnode = domNode("div", { a: "b" }, []);
      patch(fixture, vnode);
      expect(fixture.innerHTML).toBe(`<div a="b"></div>`);
    });

    test("an empty attribute is not actually added", () => {
      const vnode = domNode("div", { a: "b", c: "" }, []);
      patch(fixture, vnode);
      expect(fixture.innerHTML).toBe(`<div a="b"></div>`);
    });
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
    let vnode = domNode("div", [textNode("abc")]);
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

  test("can transform a data node into another data node", async () => {
    const oldvnode = dataNode(domNode("div", [textNode("abc")]));
    const newvnode = dataNode(domNode("div", [textNode("def")]));
    patch(fixture, oldvnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");

    update(oldvnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>def</div>");
  });

  test("can transform a multi node into another multi node", async () => {
    const oldvnode = multiNode([domNode("div", [textNode("abc")])]);
    const newvnode = multiNode([domNode("div", [textNode("def")])]);
    patch(fixture, oldvnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");

    update(oldvnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>def</div>");
  });

  test("can update two text nodes", async () => {
    const vnode = multiNode([textNode("abc"), textNode("def")]);
    const newvnode = multiNode([textNode("abc"), textNode("ghi")]);
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

  test("from <div>1</div> to <div>2</div>", async () => {
    const vnode1 = domNode("div", "k1", [textNode("1")]);
    const vnode2 = domNode("div", "k1", [textNode("2")]);
    patch(fixture, vnode1);
    expect(fixture.innerHTML).toBe("<div>1</div>");

    update(vnode1, vnode2);
    expect(fixture.innerHTML).toBe("<div>2</div>");
  });

  test("from <div>1<p></p></div> to <div>2<p></p></div>", async () => {
    const vnode1 = domNode("div", "k1", [textNode("1"), domNode("p", "k2", [])]);
    const vnode2 = domNode("div", "k1", [textNode("2"), domNode("p", "k2", [])]);
    patch(fixture, vnode1);
    expect(fixture.innerHTML).toBe("<div>1<p></p></div>");

    update(vnode1, vnode2);
    expect(fixture.innerHTML).toBe("<div>2<p></p></div>");
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

describe("event handling", () => {
  test("can bind an event handler", () => {
    const vnode = domNode("button", [textNode("abc")]);
    let clicked = false;
    vnode.on = { click: { cb: () => (clicked = true) } };

    patch(fixture, vnode);
    fixture.querySelector("button")!.click();
    expect(clicked).toBe(true);
  });
});

describe("hooks", () => {
  test("create hook on a  data node, 1 text node", () => {
    const vnode = dataNode(textNode("abc"));
    vnode.hooks.create = jest.fn();
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc");
    const text = fixture.firstChild;
    expect(text).toBeDefined();
    expect(vnode.hooks.create).toHaveBeenCalledTimes(1);
    expect(vnode.hooks.create).toHaveBeenCalledWith(text);
  });

  test("create hook on a data node, with domnode", () => {
    const vnode = dataNode(domNode("div", [textNode("abc")]));
    vnode.hooks.create = jest.fn();
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");
    const div = fixture.querySelector("div");
    expect(vnode.hooks.create).toHaveBeenCalledTimes(1);
    expect(vnode.hooks.create).toHaveBeenCalledWith(div);
  });

  test("create hook on a datanode with inside multi node", () => {
    const vnode = dataNode(multiNode([domNode("div", [])]));
    vnode.hooks.create = jest.fn();
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div></div>");
    const div = fixture.querySelector("div");
    expect(vnode.hooks.create).toHaveBeenCalledTimes(1);
    expect(vnode.hooks.create).toHaveBeenCalledWith(div);
  });

  test("create hook, data node with multi node with two dom children", () => {
    const vnode = dataNode(multiNode([domNode("div", []), domNode("span", [])]));
    vnode.hooks.create = jest.fn();
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div></div><span></span>");
    const span = fixture.querySelector("span");
    expect(span).toBeDefined();
    expect(vnode.hooks.create).toHaveBeenCalledTimes(1);
    expect(vnode.hooks.create).toHaveBeenCalledWith(span);
  });
});

//------------------------------------------------------------------------------
// Html to vdom
//------------------------------------------------------------------------------
describe("html to vdom", function () {
  // let elm, vnode0;
  // beforeEach(function () {
  //   elm = document.createElement("div");
  //   vnode0 = elm;
  // });

  test("empty strings return empty list", function () {
    expect(htmlToVDOM("")).toEqual([]);
  });

  test("just text", function () {
    const nodeList = htmlToVDOM("simple text");
    expect(nodeList).toEqual([{ type: NodeType.Text, text: "simple text", el: null }]);
  });

  test("empty tag", function () {
    const nodeList = htmlToVDOM("<span></span>");
    expect(nodeList).toHaveLength(1);

    patch(fixture, nodeList[0]);
    expect(fixture.innerHTML).toEqual("<span></span>");
  });

  test("tag with text", function () {
    const nodeList = htmlToVDOM("<span>abc</span>");
    expect(nodeList).toHaveLength(1);
    patch(fixture, nodeList[0]);
    expect(fixture.innerHTML).toEqual("<span>abc</span>");
  });

  test("tag with attribute", function () {
    const nodeList = htmlToVDOM(`<span a="1" b="2">abc</span>`);
    expect(nodeList).toHaveLength(1);
    patch(fixture, nodeList[0]);
    expect(fixture.innerHTML).toEqual(`<span a="1" b="2">abc</span>`);
  });

  test("misc", function () {
    const nodeList = htmlToVDOM(`<span a="1" b="2">abc<div>1</div></span>`);
    expect(nodeList).toHaveLength(1);
    patch(fixture, nodeList[0]);
    expect(fixture.innerHTML).toEqual(`<span a="1" b="2">abc<div>1</div></span>`);
  });
});
