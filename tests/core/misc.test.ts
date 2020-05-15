import { makeTestFixture } from "../helpers";
import { mount, xml } from "../../src/index";
import { Component } from "../../src/core/component";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

describe("mount", () => {
  test("can mount a simple functional component", async () => {
    const Test = {
      template: xml`<div>simple vnode</div>`,
    };

    await mount(Test, fixture);
    expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
  });

  test("can mount a simple class component", async () => {
    class Test extends Component {
      static template = xml`<div>simple vnode</div>`;
    }

    const test = await mount(Test, fixture);
    expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
    expect(test).toBeInstanceOf(Component);

    const div = fixture.querySelector("div");
    expect(div).toBeDefined();
    expect(test.el).toBe(div);
  });

  test("return value of mount contains the result of setup", async () => {
    const obj = {};
    const Test = {
      template: xml`<div>simple vnode</div>`,
      setup() {
        return obj;
      },
    };

    const test = await mount(Test, fixture);
    test.__owl__;
    expect((test as any).__proto__).toBe(obj);
    expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
  });

  // ---------------------------------------------------------------------------
  // only a text node
  // ---------------------------------------------------------------------------
  test("functional component, just a text node", async () => {
    const Test = {
      template: xml`simple text node`,
    };
    await mount(Test, fixture);
    expect(fixture.innerHTML).toBe("simple text node");
  });

  test("class component, text node", async () => {
    class Test extends Component {
      static template = xml`simple text node`;
    }

    await mount(Test, fixture);
    expect(fixture.innerHTML).toBe("simple text node");
  });

  // ---------------------------------------------------------------------------
  // multiroot content
  // ---------------------------------------------------------------------------

  test("simple functional component, multiroot", async () => {
    const Test = {
      template: xml`<div>a</div><div>b</div>`,
    };

    await mount(Test, fixture);
    expect(fixture.innerHTML).toBe("<div>a</div><div>b</div>");
  });

  test("simple class component, multiroot", async () => {
    class Test extends Component {
      static template = xml`<div>a</div><div>b</div>`;
    }

    await mount(Test, fixture);
    expect(fixture.innerHTML).toBe("<div>a</div><div>b</div>");
  });

  // ---------------------------------------------------------------------------
  // simple mounting operation, dynamic content
  // ---------------------------------------------------------------------------

  test("functional component with dynamic content", async () => {
    const Test = {
      template: xml`<div>Hello <t t-esc="name"/></div>`,
      setup() {
        return { name: "Alex" };
      },
    };

    await mount(Test, fixture);
    expect(fixture.innerHTML).toBe("<div>Hello Alex</div>");
  });

  test("class component with dynamic content", async () => {
    class Test extends Component {
      static template = xml`<div>Hello <t t-esc="name"/></div>`;
      name = "Alex";
    }

    await mount(Test, fixture);
    expect(fixture.innerHTML).toBe("<div>Hello Alex</div>");
  });

  // ---------------------------------------------------------------------------
  // composition
  // ---------------------------------------------------------------------------

  test("a functional component inside another", async () => {
    const Child = {
      template: xml`<div>simple vnode</div>`,
    };
    const Parent = {
      template: xml`<span><Child/></span>`,
      setup() {
        return { Child };
      },
    };

    await mount(Parent, fixture);
    expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
  });

  test("a functional component inside another, alternate definition", async () => {
    const Child = {
      template: xml`<div>simple vnode</div>`,
    };
    const Parent = {
      template: xml`<span><Child/></span>`,
      components: { Child },
    };

    await mount(Parent, fixture);
    expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
  });

  test("props are passed from parent to child", async () => {
    const Child = {
      template: xml`<div><t t-esc="props.value"/></div>`,
    };
    const Parent = {
      template: xml`<span><Child value="v"/></span>`,
      setup() {
        return { Child, v: 123 };
      },
    };

    await mount(Parent, fixture);
    expect(fixture.innerHTML).toBe("<span><div>123</div></span>");
  });

  test("a class component inside a function component", async () => {
    class Child extends Component {
      static template = xml`<div>simple vnode</div>`;
    }

    const Parent = {
      template: xml`<span><Child/></span>`,
      setup() {
        return { Child };
      },
    };
    await mount(Parent, fixture);
    expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
  });

  test("a class component inside a function component, alternate definition", async () => {
    class Child extends Component {
      static template = xml`<div>simple vnode</div>`;
    }

    const Parent = {
      template: xml`<span><Child/></span>`,
      components: { Child },
    };
    await mount(Parent, fixture);
    expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
  });

  test("a function component inside a class component", async () => {
    const Child = {
      template: xml`<div>simple vnode</div>`,
    };

    class Parent extends Component {
      static template = xml`<span><Child/></span>`;
      Child = Child;
    }

    await mount(Parent, fixture);
    expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
  });

  test("a function component inside a class component, alternate definition", async () => {
    const Child = {
      template: xml`<div>simple vnode</div>`,
    };

    class Parent extends Component {
      static template = xml`<span><Child/></span>`;
      static components = { Child };
    }

    await mount(Parent, fixture);
    expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
  });

  test("a class component inside a class component", async () => {
    class Child extends Component {
      static template = xml`<div>simple vnode</div>`;
    }

    class Parent extends Component {
      static template = xml`<span><Child/></span>`;
      Child = Child;
    }

    await mount(Parent, fixture);
    expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
  });

  test("a class component inside a class component, alternate definition", async () => {
    class Child extends Component {
      static template = xml`<div>simple vnode</div>`;
    }

    class Parent extends Component {
      static template = xml`<span><Child/></span>`;
      static components = { Child };
    }

    await mount(Parent, fixture);
    expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
  });
});
