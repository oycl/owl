import { buildTree, patch } from "../../src/vdom/vdom";
import { vDom, vText } from "./helpers";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = document.createElement("div");
});

describe("event handling", () => {
  test("can bind an event handler", () => {
    const vnode = vDom("button", [vText("abc")]);

    let isClicked = false;
    vnode.on = { click: () => (isClicked = true) };
    buildTree(vnode, fixture);
    fixture.querySelector("button")!.click();
    expect(isClicked).toBe(true);
  });

  test("binding is updated on patch", () => {
    const vnode = vDom("button", { on: { click: () => steps.push("a") } }, [vText("abc")]);

    let steps: string[] = [];
    buildTree(vnode, fixture);
    fixture.querySelector("button")!.click();
    expect(steps).toEqual(["a"]);

    const vnode2 = vDom("button", { on: { click: () => steps.push("b") } }, [vText("abc")]);
    patch(vnode, vnode2);
    fixture.querySelector("button")!.click();
    expect(steps).toEqual(["a", "b"]);
  });
});
