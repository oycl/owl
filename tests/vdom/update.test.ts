import { patch, update } from "../../src/vdom/vdom";
import { vDom, vText, vMulti, vRoot } from "./helpers";
import { VDOMNode } from "../../src/vdom/types";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = document.createElement("div");
});

describe("update function", () => {
  test("can update some text content", async () => {
    const vnode = vText("abc");
    patch(fixture, vnode);
    const text = fixture.childNodes[0];
    expect(text).toEqual(document.createTextNode("abc"));

    update(vnode, vText("def"));
    expect(fixture.innerHTML).toBe("def");
    expect(fixture.childNodes[0]).toBe(text);
  });

  test("can update a text inside a div content, same key", async () => {
    const vnode = vDom("div", { key: "k" }, [vText("abc")]);
    patch(fixture, vnode);
    const text = fixture.childNodes[0].childNodes[0];
    expect(fixture.innerHTML).toBe("<div>abc</div>");
    expect(text).toEqual(document.createTextNode("abc"));

    update(vnode, vDom("div", { key: "k" }, [vText("def")]));
    expect(fixture.innerHTML).toBe("<div>def</div>");
    expect(fixture.childNodes[0].childNodes[0]).toBe(text);
  });

  test("can update a text inside a div content, different key", async () => {
    const vnode = vDom("div", { key: "k1" }, [vText("abc")]);
    patch(fixture, vnode);
    const text = fixture.childNodes[0].childNodes[0];
    expect(fixture.innerHTML).toBe("<div>abc</div>");
    expect(text).toEqual(document.createTextNode("abc"));

    update(vnode, vDom("div", { key: "k2" }, [vText("def")]));
    expect(fixture.innerHTML).toBe("<div>def</div>");
    expect(fixture.childNodes[0].childNodes[0]).not.toBe(text);
  });

  test("can transform a dom node into a different dom node type", async () => {
    let vnode = vDom("div", [vText("abc")]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");

    update(vnode, vDom("span", [vText("def")]));

    expect(fixture.innerHTML).toBe("<span>def</span>");
  });

  test("can transform a text node into a dom node", async () => {
    const vnode = vText("abc");
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc");

    update(vnode, vDom("span", [vText("def")]));
    expect(fixture.innerHTML).toBe("<span>def</span>");
  });

  test("can transform a data node into another data node", async () => {
    const oldvnode = vRoot(vDom("div", [vText("abc")]));
    const newvnode = vRoot(vDom("div", [vText("def")]));
    patch(fixture, oldvnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");

    update(oldvnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>def</div>");
  });

  test("can transform a multi node into another multi node", async () => {
    const oldvnode = vMulti([vDom("div", [vText("abc")])]);
    const newvnode = vMulti([vDom("div", [vText("def")])]);
    patch(fixture, oldvnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");

    update(oldvnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>def</div>");
  });

  test("can update two text nodes", async () => {
    const vnode = vMulti([vText("abc"), vText("def")]);
    const newvnode = vMulti([vText("abc"), vText("ghi")]);
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
    const oldvnode = vDom("div", { key: "k1" }, [vText("abc"), vText("def")]);
    const newvnode = vDom("div", { key: "k1" }, [vText("abc"), vText("ghi")]);
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
    const vnode = vDom("div", { key: "k1" }, [vText("abc"), vText("def")]);
    const newvnode = vDom("div", { key: "k2" }, [vText("abc"), vText("ghi")]);
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
    const vnode1 = vDom("div", { key: "k1" }, [vText("1")]);
    const vnode2 = vDom("div", { key: "k1" }, [vText("2")]);
    patch(fixture, vnode1);
    expect(fixture.innerHTML).toBe("<div>1</div>");

    update(vnode1, vnode2);
    expect(fixture.innerHTML).toBe("<div>2</div>");
  });

  test("from <div>1<p></p></div> to <div>2<p></p></div>", async () => {
    const vnode1 = vDom("div", { key: "k1" }, [vText("1"), vDom("p", { key: "k2" }, [])]);
    const vnode2 = vDom("div", { key: "k1" }, [vText("2"), vDom("p", { key: "k2" }, [])]);
    patch(fixture, vnode1);
    expect(fixture.innerHTML).toBe("<div>1<p></p></div>");

    update(vnode1, vnode2);
    expect(fixture.innerHTML).toBe("<div>2<p></p></div>");
  });

  test("updating dom nodes with different keys", async () => {
    const vnode = vDom("div", []);
    patch(fixture, vnode);
    const div = fixture.childNodes[0] as HTMLDivElement;
    expect(div.tagName).toBe("DIV");
    update(vnode, vDom("div", []));
    expect(fixture.innerHTML).toBe("<div></div>");
    expect(fixture.childNodes[0]).not.toBe(div);
  });
});

describe("updating children in a dom node, with keys", () => {
  function spanNum(n: number): VDOMNode<any> {
    return vDom("span", { key: String(n) }, [vText(String(n))]);
  }

  describe("addition of elements", () => {
    test.only("appends elements", function () {
      const vnode1 = vDom("p", { key: 1 }, [spanNum(1)]);
      const vnode2 = vDom("p", { key: 1 }, [1, 2, 3].map(spanNum));

      patch(fixture, vnode1);
      expect(fixture.innerHTML).toBe("<p><span>1</span></p>");
      const p = fixture.firstElementChild!;

      update(vnode1, vnode2);
      expect(fixture.innerHTML).toBe("<p><span>1</span><span>2</span><span>3</span></p>");
      expect(fixture.firstElementChild!).toBe(p);
      // const vnode1 = h("span", [1].map(spanNum));
      // const vnode2 = h("span", [1, 2, 3].map(spanNum));
      // elm = patch(vnode0, vnode1).elm;
      // expect(elm.children.length).toBe(1);
      // elm = patch(vnode1, vnode2).elm;
      // expect(elm.children.length).toBe(3);
      // expect(elm.children[1].innerHTML).toBe("2");
      // expect(elm.children[2].innerHTML).toBe("3");
    });
  });
});

describe("event handling", () => {
  test("can bind an event handler", () => {
    const vnode = vDom("button", [vText("abc")]);
    let clicked = false;
    vnode.on = { click: { cb: () => (clicked = true) } };

    patch(fixture, vnode);
    fixture.querySelector("button")!.click();
    expect(clicked).toBe(true);
  });
});
