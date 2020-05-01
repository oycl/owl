import { makeTestFixture } from "./helpers";
import { mount, render, update, RootType } from "../src/owl";
import { Component } from "../src/component";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

describe("mount", () => {
  test("simple static template", async () => {
    const vnode = render(`<div>simple vnode</div>`);
    await mount(vnode, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
    expect(vnode.data.type).toBe(RootType.Basic);
  });

  test("can render a simple functional component", async () => {
    function Test() {
      return () => render(`<div>simple vnode</div>`);
    }

    const vnode = await mount(Test, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
    expect(vnode.data.type).toBe(RootType.Function);
    expect(typeof (vnode.data as any).fn).toBe("function");
  });

  test("can render a simple class component", async () => {
    class Test extends Component {
      static template = `<div>simple vnode</div>`;
    }

    const vnode = await mount(Test, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
    expect(vnode.data.type).toBe(RootType.Component);
    expect((vnode.data as any).comp).toBeInstanceOf(Component);

    const div = fixture.querySelector("div");
    expect(div).toBeDefined();
    expect((vnode.data as any).comp.el).toBe(div);
  });

  // ---------------------------------------------------------------------------
  // simple mounting operation, only a text node
  // ---------------------------------------------------------------------------
  test("just a template, text node", async () => {
    const vnode = render(`simple text node`);
    await mount(vnode, { target: fixture });
    expect(fixture.innerHTML).toBe("simple text node");
  });

  test("functional component, text node", async () => {
    function Test() {
      return () => render(`simple text node`);
    }

    await mount(Test, { target: fixture });
    expect(fixture.innerHTML).toBe("simple text node");
  });

  test("class component, text node", async () => {
    class Test extends Component {
      static template = `simple text node`;
    }

    await mount(Test, { target: fixture });
    expect(fixture.innerHTML).toBe("simple text node");
  });

  // ---------------------------------------------------------------------------
  // simple mounting operation, multiroot content
  // ---------------------------------------------------------------------------
  test("simple template, multiroot", async () => {
    const vnode = render(`<div>a</div><div>b</div>`);
    await mount(vnode, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>a</div><div>b</div>");
  });

  test("simple functional component, multiroot", async () => {
    function Test() {
      return () => render(`<div>a</div><div>b</div>`);
    }

    await mount(Test, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>a</div><div>b</div>");
  });

  test("simple class component, multiroot", async () => {
    class Test extends Component {
      static template = `<div>a</div><div>b</div>`;
    }

    await mount(Test, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>a</div><div>b</div>");
  });

  // ---------------------------------------------------------------------------
  // simple mounting operation, dynamic content
  // ---------------------------------------------------------------------------
  test("vnode with dynamic content", async () => {
    const vnode = render(`<div>Hello <t t-esc="name"/></div>`, { name: "Alex" });

    await mount(vnode, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>Hello Alex</div>");
  });

  test("functional component with dynamic content", async () => {
    function Test() {
      return () => render(`<div>Hello <t t-esc="name"/></div>`, { name: "Alex" });
    }

    await mount(Test, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>Hello Alex</div>");
  });

  test("class component with dynamic content", async () => {
    class Test extends Component {
      name = "Alex";
      static template = `<div>Hello <t t-esc="name"/></div>`;
    }

    await mount(Test, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>Hello Alex</div>");
  });

  // ---------------------------------------------------------------------------
  // mounting, then update (on dynamic content)
  // ---------------------------------------------------------------------------
  test("updating a vnode with dynamic content", async () => {
    const vnode = render(`<div>Hello <t t-esc="name"/></div>`, { name: "Alex" });

    await mount(vnode, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>Hello Alex</div>");

    await update(vnode, { name: "Lyra" });
    expect(fixture.innerHTML).toBe("<div>Hello Lyra</div>");
  });

  test("updating a functional component with dynamic content", async () => {
    function Test() {
      return () => render(`<div>Hello <t t-esc="name"/></div>`, { name: "Alex" });
    }
    const vnode = await mount(Test, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>Hello Alex</div>");

    await update(vnode, { name: "Lyra" });
    expect(fixture.innerHTML).toBe("<div>Hello Lyra</div>");
  });

  test("updating a class component with dynamic content", async () => {
    class Test extends Component {
      name = "Alex";
      static template = `<div>Hello <t t-esc="name"/></div>`;
    }
    const vnode = await mount(Test, { target: fixture });
    expect(fixture.innerHTML).toBe("<div>Hello Alex</div>");

    await update(vnode, { name: "Lyra" });
    expect(fixture.innerHTML).toBe("<div>Hello Lyra</div>");
  });

  // ---------------------------------------------------------------------------
  // composition
  // ---------------------------------------------------------------------------

  test.skip("a functional component inside a template", async () => {
    function Test() {
      return () => render(`<div>simple vnode</div>`);
    }
    const vnode = render(`<span><Test/></span>`, { Test });
    await mount(vnode, { target: fixture });
    expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
  });

  // test("a class component inside a class component", async () => {
  //   class Child extends Component {
  //     static template = `<div>class component</div>`;
  //   }

  //   class Parent extends Component {
  //     static template = `<span><Child /></span>`;
  //     Child = Child;
  //   }

  //   await mount(Parent, { target: fixture });
  //   expect(fixture.innerHTML).toBe("<span><div>class component</div></span>");
  // });
});
