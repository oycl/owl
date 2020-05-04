import { renderToString, xml } from "../src/index";
import { compiledTemplates } from "../src/qweb/qweb";

function render(template: string, context?: any): string {
  const str = renderToString(template, context);
  expect(compiledTemplates[template].toString()).toMatchSnapshot();
  return str;
}

describe("static template", () => {
  test("simple string", () => {
    const template = xml`<t>hello vdom</t>`;
    expect(render(template)).toBe("hello vdom");
  });

  test("simple string (*)", () => {
    const template = xml`hello vdom`;
    expect(render(template)).toBe("hello vdom");
  });

  test("simple dynamic value", () => {
    const template = xml`<t><t t-esc="text"/></t>`;
    expect(render(template, { text: "hello vdom" })).toBe("hello vdom");
  });

  test("simple string, with some dynamic value", () => {
    const template = xml`<t>hello <t t-esc="text"/></t>`;
    expect(render(template, { text: "vdom" })).toBe("hello vdom");
  });

  test("no template (*)", () => {
    const template = xml``;
    expect(render(template)).toBe("");
  });

  test("empty div", () => {
    const template = xml`<div></div>`;
    expect(render(template)).toBe("<div></div>");
  });

  test("two empty divs (*)", () => {
    const template = xml`<div></div><div></div>`;
    expect(render(template)).toBe("<div></div><div></div>");
  });

  test("div with a text node", () => {
    const template = xml`<div>word</div>`;
    expect(render(template)).toBe("<div>word</div>");
  });

  test("div with a class attribute", () => {
    const template = xml`<div class="abc">word</div>`;
    expect(render(template)).toBe(`<div class="abc">word</div>`);
  });

  test("div with a class attribute with a quote", () => {
    const template = xml`<div class="a'bc">word</div>`;
    expect(render(template)).toBe(`<div class="a'bc">word</div>`);
  });

  test("div with an arbitrary attribute with a quote", () => {
    const template = xml`<div abc="a'bc">word</div>`;
    expect(render(template)).toBe(`<div abc="a'bc">word</div>`);
  });

  test("div with a empty class attribute", () => {
    const template = xml`<div class="">word</div>`;
    expect(render(template)).toBe(`<div>word</div>`);
  });

  test("div with a span child node", () => {
    const template = xml`<div><span>word</span></div>`;
    expect(render(template)).toBe(`<div><span>word</span></div>`);
  });

  test("properly handle comments", () => {
    const template = xml`<div>hello <!-- comment-->owl</div>`;
    expect(render(template)).toBe(`<div>hello <!-- comment-->owl</div>`);
  });
});
