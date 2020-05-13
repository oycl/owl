import { buildTree, patch } from "../../src/vdom/vdom";
import { vDom, vText, vMulti, vRoot } from "./helpers";
import { VDOMNode } from "../../src/vdom/types";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = document.createElement("div");
});

describe("update function", () => {
  test("can update some text content", async () => {
    const vnode = vText("abc");
    buildTree(vnode, fixture);
    const text = fixture.childNodes[0];
    expect(text).toEqual(document.createTextNode("abc"));

    patch(vnode, vText("def"));
    expect(fixture.innerHTML).toBe("def");
    expect(fixture.childNodes[0]).toBe(text);
  });

  test("can update a text inside a div content, same key", async () => {
    const vnode = vDom("div", { key: "k" }, [vText("abc")]);
    buildTree(vnode, fixture);
    const text = fixture.childNodes[0].childNodes[0];
    expect(fixture.innerHTML).toBe("<div>abc</div>");
    expect(text).toEqual(document.createTextNode("abc"));

    patch(vnode, vDom("div", { key: "k" }, [vText("def")]));
    expect(fixture.innerHTML).toBe("<div>def</div>");
    expect(fixture.childNodes[0].childNodes[0]).toBe(text);
  });

  test("can update a text inside a div content, different key", async () => {
    const vnode = vRoot(vDom("div", { key: "k1" }, [vText("abc")]));
    buildTree(vnode, fixture);
    const text = fixture.childNodes[0].childNodes[0];
    expect(fixture.innerHTML).toBe("<div>abc</div>");
    expect(text).toEqual(document.createTextNode("abc"));

    patch(vnode, vRoot(vDom("div", { key: "k2" }, [vText("def")])));
    expect(fixture.innerHTML).toBe("<div>def</div>");
    expect(fixture.childNodes[0].childNodes[0]).not.toBe(text);
  });

  test("can transform a dom node into a different dom node type", async () => {
    let vnode = vRoot(vDom("div", [vText("abc")]));
    buildTree(vnode, fixture);
    expect(fixture.innerHTML).toBe("<div>abc</div>");

    patch(vnode, vRoot(vDom("span", [vText("def")])));

    expect(fixture.innerHTML).toBe("<span>def</span>");
  });

  test("can transform a text node into a dom node", async () => {
    const vnode = vRoot(vText("abc"));
    buildTree(vnode, fixture);
    expect(fixture.innerHTML).toBe("abc");

    patch(vnode, vRoot(vDom("span", [vText("def")])));
    expect(fixture.innerHTML).toBe("<span>def</span>");
  });

  test("can transform a data node into another data node", async () => {
    const oldvnode = vRoot(vDom("div", [vText("abc")]));
    const newvnode = vRoot(vDom("div", [vText("def")]));
    buildTree(oldvnode, fixture);
    expect(fixture.innerHTML).toBe("<div>abc</div>");

    patch(oldvnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>def</div>");
  });

  test("can transform a multi node into another multi node", async () => {
    const oldvnode = vMulti(1, [vDom("div", { key: 2 }, [vText("abc")])]);
    const newvnode = vMulti(1, [vDom("div", { key: 2 }, [vText("def")])]);
    buildTree(oldvnode, fixture);
    expect(fixture.innerHTML).toBe("<div>abc</div>");

    patch(oldvnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>def</div>");
  });

  test("can update two text nodes", async () => {
    const vnode = vMulti([vText("abc"), vText("def")]);
    const newvnode = vMulti([vText("abc"), vText("ghi")]);
    buildTree(vnode, fixture);
    expect(fixture.innerHTML).toBe("abcdef");

    const t1 = fixture.childNodes[0];
    const t2 = fixture.childNodes[1];
    expect(t2.textContent).toBe("def");
    patch(vnode, newvnode);
    expect(fixture.innerHTML).toBe("abcghi");
    expect(fixture.childNodes[0]).toBe(t1);
    expect(fixture.childNodes[1]).toBe(t2);
    expect(t2.textContent).toBe("ghi");
  });

  test("can update two text nodes in a div, same key", async () => {
    const oldvnode = vDom("div", { key: "k1" }, [vText("abc"), vText("def")]);
    const newvnode = vDom("div", { key: "k1" }, [vText("abc"), vText("ghi")]);
    buildTree(oldvnode, fixture);
    expect(fixture.innerHTML).toBe("<div>abcdef</div>");

    const t1 = fixture.childNodes[0].childNodes[0];
    const t2 = fixture.childNodes[0].childNodes[1];
    expect(t2.textContent).toBe("def");
    patch(oldvnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>abcghi</div>");
    expect(fixture.childNodes[0].childNodes[0]).toBe(t1);
    expect(fixture.childNodes[0].childNodes[1]).toBe(t2);
    expect(t2.textContent).toBe("ghi");
  });

  test("can update two text nodes in a div, different key", async () => {
    const vnode = vRoot(vDom("div", { key: "k1" }, [vText("abc"), vText("def")]));
    const newvnode = vRoot(vDom("div", { key: "k2" }, [vText("abc"), vText("ghi")]));
    buildTree(vnode, fixture);
    expect(fixture.innerHTML).toBe("<div>abcdef</div>");

    const t1 = fixture.childNodes[0].childNodes[0];
    const t2 = fixture.childNodes[0].childNodes[1];
    expect(t2.textContent).toBe("def");
    patch(vnode, newvnode);
    expect(fixture.innerHTML).toBe("<div>abcghi</div>");
    expect(fixture.childNodes[0].childNodes[0]).not.toBe(t1);
    expect(fixture.childNodes[0].childNodes[1]).not.toBe(t2);
    expect(t2.textContent).toBe("def");
  });

  test("from <div>1</div> to <div>2</div>", async () => {
    const vnode1 = vDom("div", { key: "k1" }, [vText("1")]);
    const vnode2 = vDom("div", { key: "k1" }, [vText("2")]);
    buildTree(vnode1, fixture);
    expect(fixture.innerHTML).toBe("<div>1</div>");

    patch(vnode1, vnode2);
    expect(fixture.innerHTML).toBe("<div>2</div>");
  });

  test("from <div>1<p></p></div> to <div>2<p></p></div>", async () => {
    const vnode1 = vDom("div", { key: "k1" }, [vText("1"), vDom("p", { key: "k2" }, [])]);
    const vnode2 = vDom("div", { key: "k1" }, [vText("2"), vDom("p", { key: "k2" }, [])]);
    buildTree(vnode1, fixture);
    expect(fixture.innerHTML).toBe("<div>1<p></p></div>");

    patch(vnode1, vnode2);
    expect(fixture.innerHTML).toBe("<div>2<p></p></div>");
  });

  test("updating dom nodes with different keys", async () => {
    const vnode = vRoot(vDom("div", []));
    buildTree(vnode, fixture);
    const div = fixture.childNodes[0] as HTMLDivElement;
    expect(div.tagName).toBe("DIV");
    patch(vnode, vRoot(vDom("div", [])));
    expect(fixture.innerHTML).toBe("<div></div>");
    expect(fixture.childNodes[0]).not.toBe(div);
  });
});

describe("updating children in a dom node, with keys", () => {
  function spanNum(n: number): VDOMNode<any> {
    return vDom("span", { key: String(n) }, [vText(String(n))]);
  }

  describe("addition of elements", () => {
    test("appends elements", function () {
      const vnode1 = vDom("p", { key: 1 }, [spanNum(1)]);
      const vnode2 = vDom("p", { key: 1 }, [1, 2, 3].map(spanNum));

      buildTree(vnode1, fixture);
      expect(fixture.innerHTML).toBe("<p><span>1</span></p>");
      const span1 = fixture.querySelector("span")!;
      expect(span1.outerHTML).toBe("<span>1</span>");

      patch(vnode1, vnode2);
      expect(fixture.innerHTML).toBe("<p><span>1</span><span>2</span><span>3</span></p>");
      const spans = fixture.querySelectorAll("span")!;
      expect(spans[0]).toBe(span1);
      expect(spans[3]).not.toBe(span1);
      expect(vnode1.children.map((c: any) => c.children[0].text)).toEqual(["1", "2", "3"]);
    });

    test("prepends elements", function () {
      const vnode1 = vDom("p", { key: 1 }, [4, 5].map(spanNum));
      const vnode2 = vDom("p", { key: 1 }, [1, 2, 3, 4, 5].map(spanNum));

      buildTree(vnode1, fixture);
      expect(fixture.innerHTML).toBe("<p><span>4</span><span>5</span></p>");
      const span1 = fixture.querySelector("span")!;
      expect(span1.outerHTML).toBe("<span>4</span>");

      patch(vnode1, vnode2);
      expect(fixture.innerHTML).toBe(
        "<p><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></p>"
      );
      const spans = fixture.querySelectorAll("span")!;
      expect(spans[0]).not.toBe(span1);
      expect(spans[3]).toBe(span1);
    });
  });
});

describe("event handling", () => {
  test("can bind an event handler", () => {
    const vnode = vDom("button", [vText("abc")]);
    let clicked = false;
    vnode.on = { click: { cb: () => (clicked = true) } };

    buildTree(vnode, fixture);
    fixture.querySelector("button")!.click();
    expect(clicked).toBe(true);
  });
});
