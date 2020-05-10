import { patch } from "../../src/vdom/vdom";
import { domNode, textNode, multiNode, dataNode } from "./helpers";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = document.createElement("div");
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
