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

});
