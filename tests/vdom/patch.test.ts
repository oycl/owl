import { patch } from "../../src/vdom/vdom";
import { vDom, vText, vMulti, vRoot, vComment, vStatic } from "./helpers";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = document.createElement("div");
});

describe("patch function", () => {
  test("can make a simple text node", () => {
    const vnode = vText("abc");
    expect(vnode.el).toBeNull();
    patch(fixture, vnode);
    expect(vnode.el).toEqual(document.createTextNode("abc"));
    expect(fixture.innerHTML).toBe("abc");
  });

  test("can patch into a fragment", () => {
    const vnode = vText("abc");
    expect(vnode.el).toBeNull();
    const fragment = document.createDocumentFragment();
    patch(fragment, vnode);
    expect(vnode.el).toEqual(document.createTextNode("abc"));
    fixture.appendChild(fragment);
    expect(fixture.innerHTML).toBe("abc");
  });

  test("can patch a simple dom node", () => {
    const vnode = vDom("div", []);
    expect(vnode.el).not.toBeDefined();
    patch(fixture, vnode);
    expect(vnode.el).toEqual(document.createElement("div"));
    expect(fixture.innerHTML).toBe("<div></div>");
  });

  test("can make a dom node with text content", () => {
    const vnode = vDom("div", [vText("abc")]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");
  });

  test("can patch an empty multi node", () => {
    const vnode = vMulti([]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("");
  });

  test("can patch a data node with text node", () => {
    const vnode = vRoot(vText("abc"));
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc");
  });

  test("falsy text values", () => {
    const vnode = vMulti([
      vDom("p", [vText(false)]),
      vDom("p", [vText(undefined)]),
      vDom("p", [vText(null)]),
      vDom("p", [vText(0)]),
      vDom("p", [vText("")]),
    ]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<p>false</p><p></p><p></p><p>0</p><p></p>");
  });

  test("can patch a data node with dom node", () => {
    const vnode = vRoot(vDom("div", [vText("abc")]));
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div>abc</div>");
  });

  test("can patch a non empty multi node", () => {
    const vnode = vMulti([vText("abc"), vDom("div", [])]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc<div></div>");
  });

  test("multi node in a multi node", () => {
    const vnode = vMulti([vText("abc"), vMulti([vDom("span", [vText("text")])])]);
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("abc<span>text</span>");
  });

  test("comment node", () => {
    const vnode = vComment("comment");
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<!--comment-->");
  });

  test("static node", () => {
    const vnode = vStatic(3, "<div>hey</div>");
    patch(fixture, vnode);
    expect(fixture.innerHTML).toBe("<div>hey</div>");
  });

  describe("attributes", () => {
    test("can make a dom node with an attribute", () => {
      const vnode = vDom("div", { attrs: { a: "b" } });
      patch(fixture, vnode);
      expect(fixture.innerHTML).toBe(`<div a="b"></div>`);
    });

    test("have their provided value", () => {
      const attrs = { href: "/foo", minlength: 1, selected: true, disabled: false };
      const vnode = vDom("div", { attrs }, []);
      patch(fixture, vnode);
      const elm = fixture.firstElementChild! as HTMLElement;
      expect(elm.getAttribute("href")).toBe("/foo");
      expect(elm.getAttribute("minlength")).toBe("1");
      expect(elm.hasAttribute("selected")).toBe(true);
      expect(elm.getAttribute("selected")).toBe("");
      expect(elm.hasAttribute("disabled")).toBe(false);
    });

    test("are not omitted when falsy values are provided", () => {
      const attrs = { href: null, minlength: 0, value: "", title: "undefined" };

      const vnode = vDom("div", { attrs }, []);
      patch(fixture, vnode);
      const elm = fixture.firstElementChild! as HTMLElement;
      expect(elm.getAttribute("href")).toBe("null");
      expect(elm.getAttribute("minlength")).toBe("0");
      expect(elm.getAttribute("value")).toBe("");
      expect(elm.getAttribute("title")).toBe("undefined");
    });

    test("is present and empty string if the value is truthy", function () {
      const attrs = { required: true, readonly: 1, noresize: "truthy" };
      const vnode = vDom("div", { attrs });
      patch(fixture, vnode);
      const elm = fixture.firstElementChild! as HTMLElement;

      expect(elm.hasAttribute("required")).toBe(true);
      expect(elm.getAttribute("required")).toBe("");
      expect(elm.hasAttribute("readonly")).toBe(true);
      expect(elm.getAttribute("readonly")).toBe("1");
      expect(elm.hasAttribute("noresize")).toBe(true);
      expect(elm.getAttribute("noresize")).toBe("truthy");
    });

    test("is omitted if the value is false", function () {
      const attrs = { required: false };
      const vnode = vDom("div", { attrs });
      patch(fixture, vnode);
      const elm = fixture.firstElementChild! as HTMLElement;
      expect(elm.hasAttribute("required")).toBe(false);
      expect(elm.getAttribute("required")).toBe(null);
    });

    test("is not omitted if the value is falsy but casted to string", function () {
      const attrs = { readonly: 0, noresize: null };
      const vnode = vDom("div", { attrs }, []);
      patch(fixture, vnode);
      const elm = fixture.firstElementChild! as HTMLElement;
      expect(elm.getAttribute("readonly")).toBe("0");
      expect(elm.getAttribute("noresize")).toBe("null");
    });

    test("is not considered as a boolean attribute and shouldn't be omitted", function () {
      const attrs1 = { constructor: true };
      const vnode1 = vDom("div", { attrs: attrs1 }, []);
      patch(fixture, vnode1);
      const elm1 = fixture.firstElementChild! as HTMLElement;
      expect(elm1.hasAttribute("constructor")).toBe(true);
      expect(elm1.getAttribute("constructor")).toBe("");

      const attrs2 = { constructor: false };
      const vnode2 = vDom("div", { attrs: attrs2 }, []);
      fixture.innerHTML = "";
      patch(fixture, vnode2);
      const elm2 = fixture.firstElementChild! as HTMLElement;
      expect(elm2.hasAttribute("constructor")).toBe(false);
    });
  });

  describe("class", () => {
    test("can make a dom node with class", () => {
      const vnode = vDom("div", { class: { a: true } });
      patch(fixture, vnode);
      expect(fixture.innerHTML).toBe(`<div class="a"></div>`);
    });

    test("can make a dom node with two classes", () => {
      const vnode = vDom("div", { class: { a: true, b: true } });
      patch(fixture, vnode);
      expect(fixture.innerHTML).toBe(`<div class="a b"></div>`);
    });
  });
});
