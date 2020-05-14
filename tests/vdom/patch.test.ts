import { buildTree, patch, VDomArray } from "../../src/vdom/vdom";
import { vDom, vText, vMulti, vRoot } from "./helpers";
import { VDOMNode } from "../../src/vdom/types";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = document.createElement("div");
});

describe("patch function", () => {
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

  test("can patch a text node with a VDomArray of vnodes", () => {
    const arr = new VDomArray();
    arr.push(vDom("div", [vText("hey")]));
    const vnode = vDom("div", [vText(arr)]);
    buildTree(vnode, fixture);
    expect(fixture.innerHTML).toBe("<div>&lt;div&gt;hey&lt;/div&gt;</div>");

    const arr2 = new VDomArray();
    arr2.push(vDom("div", [vText("hoy")]));
    const vnode2 = vDom("div", [vText(arr2)]);
    patch(vnode, vnode2);
    expect(fixture.innerHTML).toBe("<div>&lt;div&gt;hoy&lt;/div&gt;</div>");
  });
});

describe("updating children in a dom node, with keys", () => {
  function spanNum(n: number): VDOMNode {
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

    test("add elements in the middle", function () {
      const vnode1 = vDom("p", { key: 1 }, [1, 2, 4, 5].map(spanNum));
      const vnode2 = vDom("p", { key: 1 }, [1, 2, 3, 4, 5].map(spanNum));

      buildTree(vnode1, fixture);
      expect(fixture.innerHTML).toBe(
        "<p><span>1</span><span>2</span><span>4</span><span>5</span></p>"
      );
      const span2 = fixture.querySelectorAll("span")[1];
      expect(span2.outerHTML).toBe("<span>2</span>");

      patch(vnode1, vnode2);
      expect(fixture.innerHTML).toBe(
        "<p><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></p>"
      );
      const spans = fixture.querySelectorAll("span")!;
      expect(spans[1]).toBe(span2);
    });

    test("add elements at beginning and end", function () {
      const vnode1 = vDom("p", { key: 1 }, [2, 3, 4].map(spanNum));
      const vnode2 = vDom("p", { key: 1 }, [1, 2, 3, 4, 5].map(spanNum));

      buildTree(vnode1, fixture);
      expect(fixture.innerHTML).toBe("<p><span>2</span><span>3</span><span>4</span></p>");
      const span2 = fixture.querySelectorAll("span")[0];
      expect(span2.outerHTML).toBe("<span>2</span>");
      const span4 = fixture.querySelectorAll("span")[2];
      expect(span4.outerHTML).toBe("<span>4</span>");

      patch(vnode1, vnode2);
      expect(fixture.innerHTML).toBe(
        "<p><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></p>"
      );
      const spans = fixture.querySelectorAll("span")!;
      expect(spans[1]).toBe(span2);
      expect(spans[3]).toBe(span4);
    });

    test("adds children to parent with no children", function () {
      const vnode1 = vDom("p", { key: 1 }, []);
      const vnode2 = vDom("p", { key: 1 }, [1, 2, 3].map(spanNum));

      buildTree(vnode1, fixture);
      expect(fixture.innerHTML).toBe("<p></p>");

      patch(vnode1, vnode2);
      expect(fixture.innerHTML).toBe("<p><span>1</span><span>2</span><span>3</span></p>");
    });

    test("removes all children from parent", function () {
      const vnode1 = vDom("p", { key: 1 }, [1, 2, 3].map(spanNum));
      const vnode2 = vDom("p", { key: 1 }, []);

      buildTree(vnode1, fixture);
      expect(fixture.innerHTML).toBe("<p><span>1</span><span>2</span><span>3</span></p>");

      patch(vnode1, vnode2);
      expect(fixture.innerHTML).toBe("<p></p>");
    });
  });

  describe("addition of elements", () => {
    test("removes elements from the beginning", function () {
      const vnode1 = vDom("p", { key: 1 }, [1, 2, 3, 4, 5].map(spanNum));
      const vnode2 = vDom("p", { key: 1 }, [3, 4, 5].map(spanNum));

      buildTree(vnode1, fixture);
      const span3 = fixture.querySelectorAll("span")[2];
      expect(span3.innerHTML).toBe("3");
      expect(fixture.innerHTML).toBe(
        "<p><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></p>"
      );

      patch(vnode1, vnode2);
      expect(fixture.innerHTML).toBe("<p><span>3</span><span>4</span><span>5</span></p>");
      expect(fixture.querySelectorAll("span")[0]).toBe(span3);
      expect(vnode1.children.length).toBe(3);
    });

    test("removes elements from the end", function () {
      const vnode1 = vDom("p", { key: 1 }, [1, 2, 3, 4, 5].map(spanNum));
      const vnode2 = vDom("p", { key: 1 }, [1, 2, 3].map(spanNum));

      buildTree(vnode1, fixture);
      const span3 = fixture.querySelectorAll("span")[2];
      expect(span3.innerHTML).toBe("3");
      expect(fixture.innerHTML).toBe(
        "<p><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></p>"
      );

      patch(vnode1, vnode2);
      expect(fixture.innerHTML).toBe("<p><span>1</span><span>2</span><span>3</span></p>");
      expect(fixture.querySelectorAll("span")[2]).toBe(span3);
      expect(vnode1.children.length).toBe(3);
    });
  });
});
