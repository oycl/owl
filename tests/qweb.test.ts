import { renderToString, xml } from "../src/index";
import { compiledTemplates, clearQWeb, addTemplate } from "../src/qweb/qweb";

function render(template: string, context?: any): string {
  const str = renderToString(template, context);
  expect(compiledTemplates[template].toString()).toMatchSnapshot();
  return str;
}

beforeEach(() => {
  clearQWeb();
});
//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("static templates", () => {
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

  test("properly handle comments between t-if/t-else", () => {
    const template = xml`
      <div>
        <span t-if="true">true</span>
        <!-- comment-->
        <span t-else="">owl</span>
      </div>`;
    expect(render(template)).toBe(`<div><span>true</span></div>`);
  });
});

describe("error handling", () => {
  test("invalid xml", () => {
    const template = xml`<div>`;
    expect(() => render(template)).toThrow("Invalid XML in template");
  });

  //   test("template with text node and tag", () => {
  //     const template = xml`<t>text<span>other node</span></t>`;

  //     expect(() => render(template)).toThrow(
  //       "A template should not have more than one root node"
  //     );
  //   });

  //   test("nice warning if no template with given name", () => {
  //     expect(() => qweb.render("invalidname")).toThrow("does not exist");
  //   });

  //   test("cannot add twice the same template", () => {
  //     const template = xml`<t></t>`;
  //     expect(() => const template = xml"<div/>", true)).not.toThrow("already defined";
  //     expect(() => const template = xml"<div/>")).toThrow("already defined";
  //   });

  //   test("addTemplates throw if parser error", () => {
  //     expect(() => {
  //       qweb.addTemplates("<templates><abc>></templates>");
  //     }).toThrow("Invalid XML in template");
  //   });

  //   test("nice error when t-on is evaluated with a missing event", () => {
  //     qweb.addTemplate("templatename", `<div t-on="somemethod"></div>`);
  //     expect(() => qweb.render("templatename", { someMethod() {} }, { handlers: [] })).toThrow(
  //       "Missing event name with t-on directive"
  //     );
  //   });

  //   test("error when unknown directive", () => {
  //     qweb.addTemplate("templatename", `<div t-best-beer="rochefort 10">test</div>`);
  //     expect(() => qweb.render("templatename")).toThrow("Unknown QWeb directive: 't-best-beer'");
  //   });
});

describe("t-esc", () => {
  test("literal", () => {
    const template = xml`<span><t t-esc="'ok'"/></span>`;
    expect(render(template)).toBe("<span>ok</span>");
  });

  test("variable", () => {
    const template = xml`<span><t t-esc="var"/></span>`;
    expect(render(template, { var: "ok" })).toBe("<span>ok</span>");
  });

  test("escaping", () => {
    const template = xml`<span><t t-esc="var"/></span>`;
    expect(render(template, { var: "<ok>abc</ok>" })).toBe(
      "<span>&amp;lt;ok&amp;gt;abc&amp;lt;/ok&amp;gt;</span>"
    );
  });

  test("escaping on a node", () => {
    const template = xml`<span t-esc="'ok'"/>`;
    expect(render(template)).toBe("<span>ok</span>");
  });

  test("escaping on a node with a body", () => {
    const template = xml`<span t-esc="'ok'">nope</span>`;
    expect(render(template)).toBe("<span>ok</span>");
  });

  test("escaping on a node with a body, as a default", () => {
    const template = xml`<span t-esc="var">nope</span>`;
    expect(render(template)).toBe("<span>nope</span>");
  });

  //   test("t-esc is escaped", () => {
  //     const template = xml`("test", `<div><t t-set="var"><p>escaped</p></t><t t-esc="var"/></div>`);
  //     const domRendered = renderToDOM(qweb, "test");
  //     expect(domRendered.textContent).toBe("<p>escaped</p>");
  //   });

  //   test("t-esc=0 is escaped", () => {
  //     const template = xml`("test", `<span><t t-esc="0"/></span>`);
  //     const template = xml`("testCaller", `<div><t t-call="test"><p>escaped</p></t></div>`);
  //     const domRendered = renderToDOM(qweb, "testCaller") as HTMLElement;
  //     expect(domRendered.querySelector("span")!.textContent).toBe("<p>escaped</p>");
  //   });

  test("div with falsy values", () => {
    const template = xml`
        <div>
          <p t-esc="v1"/>
          <p t-esc="v2"/>
          <p t-esc="v3"/>
          <p t-esc="v4"/>
          <p t-esc="v5"/>
        </div>`;
    const vals = {
      v1: false,
      v2: undefined,
      v3: null,
      v4: 0,
      v5: "",
    };
    expect(render(template, vals)).toBe("<div><p>false</p><p></p><p></p><p>0</p><p></p></div>");
  });

  test("t-esc work with spread operator", () => {
    const template = xml`<span><t t-esc="[...state.list]"/></span>`;
    expect(render(template, { state: { list: [1, 2] } })).toBe("<span>1,2</span>");
  });
});

// describe("t-raw", () => {
//   test("literal", () => {
//     const template = xml`<span><t t-raw="'ok'"/></span>`;
//     expect(render(template)).toBe("<span>ok</span>");
//   });

//   test("variable", () => {
//     const template = xml`<span><t t-raw="var"/></span>`;
//     expect(render(template, { var: "ok" })).toBe("<span>ok</span>");
//   });

//   test("not escaping", () => {
//     const template = xml`<div><t t-raw="var"/></div>`;
//     expect(render(template, { var: "<ok></ok>" })).toBe("<div><ok></ok></div>");
//   });

//   test("t-raw and another sibling node", () => {
//     const template = xml`<span><span>hello</span><t t-raw="var"/></span>`;
//     expect(render(template, { var: "<ok>world</ok>" })).toBe(
//       "<span><span>hello</span><ok>world</ok></span>"
//     );
//   });
// });

describe("t-set", () => {
  test("set from attribute literal", () => {
    const template = xml`<div><t t-set="value" t-value="'ok'"/><t t-esc="value"/></div>`;
    expect(render(template)).toBe("<div>ok</div>");
  });

  test("t-set and t-if", () => {
    const template = xml`
        <div>
          <t t-set="v" t-value="value"/>
          <t t-if="v === 'ok'">grimbergen</t>
        </div>`;
    expect(render(template, { value: "ok" })).toBe("<div>grimbergen</div>");
  });

  test("set from body literal", () => {
    const template = xml`<t><t t-set="value">ok</t><t t-esc="value"/></t>`;
    expect(render(template)).toBe("ok");
  });

  test("set from attribute lookup", () => {
    const template = xml`<div><t t-set="stuff" t-value="value"/><t t-esc="stuff"/></div>`;
    expect(render(template, { value: "ok" })).toBe("<div>ok</div>");
  });

  test("t-set evaluates an expression only once", () => {
    const template = xml`<div >
            <t t-set="v" t-value="value + ' artois'"/>
            <t t-esc="v"/>
            <t t-esc="v"/>
          </div>`;
    expect(render(template, { value: "stella" })).toBe("<div>stella artoisstella artois</div>");
  });

  test("set from body lookup", () => {
    const template = xml`<div><t t-set="stuff"><t t-esc="value"/></t><t t-esc="stuff"/></div>`;
    expect(render(template, { value: "ok" })).toBe("<div>ok</div>");
  });

  test("set from empty body", () => {
    const template = xml`<div><t t-set="stuff"/><t t-esc="stuff"/></div>`;
    expect(render(template)).toBe("<div></div>");
  });

  test("value priority", () => {
    const template = xml`<div><t t-set="value" t-value="1">2</t><t t-esc="value"/></div>`;
    expect(render(template)).toBe("<div>1</div>");
  });

  test("evaluate value expression", () => {
    const template = xml`<div><t t-set="value" t-value="1 + 2"/><t t-esc="value"/></div>`;
    expect(render(template)).toBe("<div>3</div>");
  });

  // test("t-set should reuse variable if possible", () => {
  //   const template = xml`<div>
  //         <t t-set="v" t-value="1"/>
  //         <div t-foreach="list" t-as="elem" t-key="elem_index">
  //             <span>v<t t-esc="v"/></span>
  //             <t t-set="v" t-value="elem"/>
  //         </div>
  //       </div>`;

  //     expect(render(template, { list: ["a", "b"] })).toBe(
  //     "<div><div><span>v1</span></div><div><span>va</span></div></div>"
  //   );
  // });

  test("t-set with content and sub t-esc", () => {
    const template = xml`<div>
          <t t-set="setvar"><t t-esc="beep"/> boop</t>
          <t t-esc="setvar"/>
        </div>`;

    expect(render(template, { beep: "beep" })).toBe("<div>beep boop</div>");
  });

  test("evaluate value expression, part 2", () => {
    const template = xml`<div><t t-set="value" t-value="somevariable + 2"/><t t-esc="value"/></div>`;
    expect(render(template, { somevariable: 43 })).toBe("<div>45</div>");
  });

  test("t-set, t-if, and mix of expression/body lookup, 1", () => {
    const template = xml`<div>
          <t t-if="flag" t-set="ourvar">1</t>
          <t t-else="" t-set="ourvar" t-value="0"></t>
          <t t-esc="ourvar"/>
        </div>`;
    expect(render(template, { flag: true })).toBe("<div>1</div>");
    expect(render(template, { flag: false })).toBe("<div>0</div>");
  });

  test("t-set, t-if, and mix of expression/body lookup, 2", () => {
    const template = xml`<div>
          <t t-if="flag" t-set="ourvar" t-value="1"></t>
          <t t-else="" t-set="ourvar">0</t>
          <t t-esc="ourvar"/>
        </div>`;
    expect(render(template, { flag: true })).toBe("<div>1</div>");
    expect(render(template, { flag: false })).toBe("<div>0</div>");
  });

  //   test("t-set body is evaluated immediately", () => {
  //     qweb.addTemplate(
  //       "test",
  //       `<div>
  //         <t t-set="v1" t-value="'before'"/>
  //         <t t-set="v2">
  //           <span><t t-esc="v1"/></span>
  //         </t>
  //         <t t-set="v1" t-value="'after'"/>
  //         <t t-raw="v2"/>
  //       </div>`
  //     );

  //     expect(render(template)).toBe("<div><span>before</span></div>");
  //   });

  //   test("t-set with t-value (falsy) and body", () => {
  //     qweb.addTemplate(
  //       "test",
  //       `<div>
  //         <t t-set="v3" t-value="false"/>
  //         <t t-set="v1" t-value="'before'"/>
  //         <t t-set="v2" t-value="v3">
  //           <span><t t-esc="v1"/></span>
  //         </t>
  //         <t t-set="v1" t-value="'after'"/>
  //         <t t-set="v3" t-value="true"/>
  //         <t t-raw="v2"/>
  //       </div>`
  //     );

  //     expect(render(template)).toBe("<div><span>before</span></div>");
  //   });

  //   test("t-set with t-value (truthy) and body", () => {
  //     qweb.addTemplate(
  //       "test",
  //       `<div>
  //         <t t-set="v3" t-value="'Truthy'"/>
  //         <t t-set="v1" t-value="'before'"/>
  //         <t t-set="v2" t-value="v3">
  //           <span><t t-esc="v1"/></span>
  //         </t>
  //         <t t-set="v1" t-value="'after'"/>
  //         <t t-set="v3" t-value="false"/>
  //         <t t-raw="v2"/>
  //       </div>`
  //     );

  //     expect(render(template)).toBe("<div>Truthy</div>");
  //   });
});

describe("t-if", () => {
  test("boolean value true condition", () => {
    const template = xml`<div><t t-if="condition">ok</t></div>`;
    expect(render(template, { condition: true })).toBe(`<div>ok</div>`);
  });

  test("boolean value false condition", () => {
    const template = xml`<div><t t-if="condition">ok</t></div>`;
    expect(render(template, { condition: false })).toBe(`<div></div>`);
  });

  test("boolean value true condition (on a dom node) (*)", () => {
    const template = xml`<div><span t-if="condition">ok</span></div>`;
    expect(render(template, { condition: true })).toBe(`<div><span>ok</span></div>`);
  });

  test("boolean value false condition (on a dom node) (*)", () => {
    const template = xml`<div><span t-if="condition">ok</span></div>`;
    expect(render(template, { condition: false })).toBe(`<div></div>`);
  });

  test("boolean value false condition, resulting in empty template (on a dom node) (*)", () => {
    const template = xml`<div t-if="condition">ok</div>`;
    expect(render(template, { condition: false })).toBe(``);
  });

  test("boolean value condition missing", () => {
    const template = xml`<span><t t-if="condition">fail</t></span>`;
    expect(render(template)).toBe("<span></span>");
  });

  test("boolean value condition elif", () => {
    const template = xml`
      <div>
        <t t-if="color == 'black'">black pearl</t>
        <t t-elif="color == 'yellow'">yellow submarine</t>
        <t t-elif="color == 'red'">red is dead</t>
        <t t-else="">beer</t>
      </div>
    `;
    expect(render(template, { color: "red" })).toBe("<div>red is dead</div>");
  });

  test("boolean value condition else", () => {
    const template = xml`
      <div>
        <span>begin</span>
        <t t-if="condition">ok</t>
        <t t-else="">ok-else</t>
        <span>end</span>
      </div>
    `;
    expect(render(template, { condition: true })).toBe(
      "<div><span>begin</span>ok<span>end</span></div>"
    );
  });

  test("boolean value condition false else", () => {
    const template = xml`
        <div><span>begin</span><t t-if="condition">fail</t>
          <t t-else="">fail-else</t><span>end</span></div>
        `;

    expect(render(template, { condition: false })).toBe(
      "<div><span>begin</span>fail-else<span>end</span></div>"
    );
  });

  test("can use some boolean operators in expressions", () => {
    const template = xml`
       <div>
        <t t-if="cond1 and cond2">and</t>
        <t t-if="cond1 and cond3">nope</t>
        <t t-if="cond1 or cond3">or</t>
        <t t-if="cond3 or cond4">nope</t>
        <t t-if="m gt 3">mgt</t>
        <t t-if="n gt 3">ngt</t>
        <t t-if="m lt 3">mlt</t>
        <t t-if="n lt 3">nlt</t>
      </div>`;

    const context = {
      cond1: true,
      cond2: true,
      cond3: false,
      cond4: false,
      m: 5,
      n: 2,
    };
    expect(render(template, context)).toBe("<div>andormgtnlt</div>");
  });

  test("t-esc with t-if", () => {
    const template = xml`<div><t t-if="true" t-esc="'x'"/></div>`;
    expect(render(template)).toBe("<div>x</div>");
  });

  test("t-esc with t-elif", () => {
    const template = xml`<div><t t-if="false">abc</t><t t-else="" t-esc="'x'"/></div>`;
    expect(render(template)).toBe("<div>x</div>");
  });

  test("t-set, then t-if", () => {
    const template = xml`
        <div>
          <t t-set="title" t-value="'test'"/>
          <t t-if="title"><t t-esc="title"/></t>
        </div>`;
    const result = render(template);
    const expected = `<div>test</div>`;
    expect(result).toBe(expected);
  });

  test("t-set, then t-if, part 2", () => {
    const template = xml`
          <div>
              <t t-set="y" t-value="true"/>
              <t t-set="x" t-value="y"/>
              <span t-if="x">COUCOU</span>
          </div>`;
    const result = render(template);
    const expected = `<div><span>COUCOU</span></div>`;
    expect(result).toBe(expected);
  });

  test("t-set, then t-elif, part 3", () => {
    const template = xml`
          <div>
              <t t-set="y" t-value="false"/>
              <t t-set="x" t-value="y"/>
              <span t-if="x">AAA</span>
              <span t-elif="!x">BBB</span>
          </div>`;
    const result = render(template);
    const expected = `<div><span>BBB</span></div>`;
    expect(result).toBe(expected);
  });
});

describe("attributes", () => {
  test("static attributes", () => {
    const template = xml`<div foo="a" bar="b" baz="c"/>`;
    const result = render(template);
    const expected = `<div foo="a" bar="b" baz="c"></div>`;
    expect(result).toBe(expected);
  });

  test("static attributes with dashes", () => {
    const template = xml`<div aria-label="Close"/>`;
    const result = render(template);
    const expected = `<div aria-label="Close"></div>`;
    expect(result).toBe(expected);
  });

  test("static attributes on void elements", () => {
    const template = xml`<img src="/test.jpg" alt="Test"/>`;
    const result = render(template);
    expect(result).toBe(`<img src="/test.jpg" alt="Test">`);
  });

  test("dynamic attributes", () => {
    const template = xml`<div t-att-foo="'bar'"/>`;
    const result = render(template);
    expect(result).toBe(`<div foo="bar"></div>`);
  });

  test("dynamic class attribute", () => {
    const template = xml`<div t-att-class="c"/>`;
    const result = render(template, { c: "abc" });
    expect(result).toBe(`<div class="abc"></div>`);
  });

  test("dynamic empty class attribute", () => {
    const template = xml`<div t-att-class="c"/>`;
    const result = render(template, { c: "" });
    expect(result).toBe(`<div></div>`);
  });

  test("dynamic attribute with a dash", () => {
    const template = xml`<div t-att-data-action-id="id"/>`;
    const result = render(template, { id: 32 });
    expect(result).toBe(`<div data-action-id="32"></div>`);
  });

  //   test("dynamic formatted attributes with a dash", () => {
  //     const template = xml`<div t-attf-aria-label="Some text {{id}}"/>`;
  //     const result = render(template, { id: 32 });
  //     expect(result).toBe(`<div aria-label="Some text 32"></div>`);
  //   });

  test("fixed variable", () => {
    const template = xml`<div t-att-foo="value"/>`;
    const result = render(template, { value: "ok" });
    expect(result).toBe(`<div foo="ok"></div>`);
  });

  test("dynamic attribute falsy variable ", () => {
    const template = xml`<div t-att-foo="value"/>`;
    const result = render(template, { value: false });
    expect(result).toBe(`<div></div>`);
  });

  //   test("tuple literal", () => {
  //     const template = xml`<div t-att="['foo', 'bar']"/>`;
  //     const result = render(template);
  //     expect(result).toBe(`<div foo="bar"></div>`);
  //   });

  //   test("tuple variable", () => {
  //     const template = xml`<div t-att="value"/>`;
  //     const result = render(template, { value: ["foo", "bar"] });
  //     expect(result).toBe(`<div foo="bar"></div>`);
  //   });

  //   test("object", () => {
  //     const template = xml`<div t-att="value"/>`;
  //     const result = render(template, {
  //       value: { a: 1, b: 2, c: 3 },
  //     });
  //     expect(result).toBe(`<div a="1" b="2" c="3"></div>`);
  //   });

  //   test("format literal", () => {
  //     const template = xml`<div t-attf-foo="bar"/>`;
  //     const result = render(template);
  //     expect(result).toBe(`<div foo="bar"></div>`);
  //   });

  //   test("t-attf-class should combine with class", () => {
  //     const template = xml`<div class="hello" t-attf-class="world"/>`;
  //     const result = render(template);
  //     expect(result).toBe(`<div class="hello world"></div>`);
  //   });

  //   test("format value", () => {
  //     const template = xml`<div t-attf-foo="b{{value}}r"/>`;
  //     const result = render(template, { value: "a" });
  //     expect(result).toBe(`<div foo="bar"></div>`);
  //   });

  test("from variables set previously", () => {
    const template = xml`
        <div><t t-set="abc" t-value="'def'"/><span t-att-class="abc"/></div>`;
    expect(render(template)).toBe('<div><span class="def"></span></div>');
  });

  test("from object variables set previously", () => {
    // Note: standard qweb does not allow this...
    const template = xml`
        <div><t t-set="o" t-value="{a:'b'}"/><span t-att-class="o.a"/></div>`;
    expect(render(template)).toBe('<div><span class="b"></span></div>');
  });

  //   test("format expression", () => {
  //     const template = xml`<div t-attf-foo="{{value + 37}}"/>`;
  //     const result = render(template, { value: 5 });
  //     expect(result).toBe(`<div foo="42"></div>`);
  //   });

  //   test("format expression, other format", () => {
  //     const template = xml`<div t-attf-foo="{{value + 37}}"/>`;
  //     const result = render(template, { value: 5 });
  //     expect(result).toBe(`<div foo="42"></div>`);
  //   });

  //   test("format multiple", () => {
  //     const template = xml`<div t-attf-foo="a {{value1}} is {{value2}} of {{value3}} ]"/>`;
  //     const result = render(template, {
  //       value1: 0,
  //       value2: 1,
  //       value3: 2,
  //     });
  //     expect(result).toBe(`<div foo="a 0 is 1 of 2 ]"></div>`);
  //   });

  //   test("various escapes", () => {
  //     // not needed??
  //     qweb.addTemplate(
  //       "test",
  //       `
  //          <div foo="&lt;foo"
  //             t-att-bar="bar"
  //             t-attf-baz="&lt;{{baz}}&gt;"
  //             t-att="qux"/>
  //         `
  //     );
  //     const result = render(template, {
  //       bar: 0,
  //       baz: 1,
  //       qux: { qux: "<>" },
  //     });
  //     const expected = '<div foo="<foo" bar="0" baz="<1>" qux="<>"></div>';
  //     expect(result).toBe(expected);
  //   });

  test("t-att-class and class should combine together", () => {
    const template = xml`<div class="hello" t-att-class="value"/>`;
    const result = render(template, { value: "world" });
    expect(result).toBe(`<div class="hello world"></div>`);
  });

  //   test("class and t-att-class should combine together", () => {
  //     const template = xml`<div t-att-class="value" class="hello" />`;
  //     const result = render(template, { value: "world" });
  //     expect(result).toBe(`<div class="world hello"></div>`);
  //   });

  //   test("class and t-attf-class with ternary operation", () => {
  //     const template = xml`<div class="hello" t-attf-class="{{value ? 'world' : ''}}"/>`;
  //     const result = render(template, { value: true });
  //     expect(result).toBe(`<div class="hello world"></div>`);
  //   });

  //   test("t-att-class with object", () => {
  //     const template = xml`<div class="static" t-att-class="{a: b, c: d, e: f}"/>`;
  //     const result = render(template, { b: true, d: false, f: true });
  //     expect(result).toBe(`<div class="static a e"></div>`);
  //   });
});

describe("t-call (template calling", () => {
  test("basic caller", () => {
    const callee = xml`<span>ok</span>`;
    const caller = xml`<div><t t-call="${callee}"/></div>`;
    const expected = "<div><span>ok</span></div>";
    expect(render(caller)).toBe(expected);
  });

  test("basic caller, no parent node", () => {
    const callee = xml`<div>ok</div>`;
    const caller = xml`<t t-call="${callee}"/>`;
    const expected = "<div>ok</div>";
    expect(render(caller)).toBe(expected);
  });

  test("t-call with t-if", () => {
    const sub = xml`<span>ok</span>`;
    const caller = xml`<div><t t-if="flag" t-call="${sub}"/></div>`;
    const expected = "<div><span>ok</span></div>";
    expect(render(caller, { flag: true })).toBe(expected);
  });

  test("t-call not allowed on a non t node", () => {
    const sub = xml`<t>ok</t>`;
    const caller = xml`<div t-call="${sub}"/>`;
    expect(() => render(caller)).toThrow("Invalid tag");
  });

  test("with unused body", () => {
    const sub = xml`<div>ok</div>`;
    const caller = xml`<t t-call="${sub}">WHEEE</t>`;
    const expected = "<div>ok</div>";
    expect(render(caller)).toBe(expected);
  });

  test("with unused setbody", () => {
    const sub = xml`<div>ok</div>`;
    const caller = xml`<t t-call="${sub}"><t t-set="qux" t-value="3"/></t>`;
    const expected = "<div>ok</div>";
    expect(render(caller)).toBe(expected);
  });

  test("with used body", () => {
    const sub = xml`<h1><t t-esc="0"/></h1>`;
    const caller = xml`<t t-call="${sub}">ok</t>`;
    const expected = "<h1>ok</h1>";
    expect(render(caller)).toBe(expected);
  });

  test("with used set body", () => {
    const foo = xml`<t t-esc="foo"/>`;
    const caller = xml`<span><t t-call="${foo}"><t t-set="foo" t-value="'ok'"/></t></span>`;

    const expected = "<span>ok</span>";
    expect(render(caller)).toBe(expected);
  });

  test("inherit context", () => {
    const foo = xml`<t t-esc="foo"/>`;
    const caller = xml`<div><t t-set="foo" t-value="1"/><t t-call="${foo}"/></div>`;
    const expected = "<div>1</div>";
    expect(render(caller)).toBe(expected);
  });

  test("scoped parameters", () => {
    const callee = xml`<t>ok</t>`;
    const caller = xml`
          <div>
              <t t-call="${callee}">
                  <t t-set="foo" t-value="42"/>
              </t>
              <t t-esc="foo"/>
          </div>`;
    const expected = "<div>ok</div>";
    expect(render(caller)).toBe(expected);
  });

  // test("call with several sub nodes on same line", () => {
  //   const sub = xml`
  //     <div t-name="SubTemplate">
  //         <t t-raw="0"/>
  //     </div>`;
  //   const main = xml`
  //     <div>
  //       <t t-call="${sub}">
  //         <span>hey</span> <span>yay</span>
  //       </t>
  //     </div>`;
  //   const expected = "<div><div><span>hey</span> <span>yay</span></div></div>";
  //   expect(render(main)).toBe(expected);
  // });

  //   test("cascading t-call t-raw='0'", () => {
  //     qweb.addTemplates(`
  //         <templates>
  //             <div t-name="finalTemplate">
  //               <span>cascade 2</span>
  //               <t t-raw="0"/>
  //             </div>

  //             <div t-name="subSubTemplate">
  //               <t t-call="finalTemplate">
  //                 <span>cascade 1</span>
  //                 <t t-raw="0"/>
  //               </t>
  //             </div>

  //             <div t-name="SubTemplate">
  //               <t t-call="subSubTemplate">
  //                 <span>cascade 0</span>
  //                 <t t-raw="0"/>
  //               </t>
  //             </div>

  //             <div t-name="main">
  //               <t t-call="SubTemplate">
  //                 <span>hey</span> <span>yay</span>
  //               </t>
  //             </div>
  //         </templates>
  //     `);
  //     const expected =
  //       "<div><div><div><div><span>cascade 2</span><span>cascade 1</span><span>cascade 0</span><span>hey</span> <span>yay</span></div></div></div></div>";
  //     expect(renderToString(qweb, "main")).toBe(expected);
  //   });

  test("recursive template, part 1", () => {
    addTemplate(
      "recursive",
      `
        <div>
          <span>hey</span>
          <t t-if="false">
            <t t-call="recursive"/>
          </t>
        </div>`
    );
    const expected = "<div><span>hey</span></div>";
    expect(render("recursive")).toBe(expected);
  });

  // test("recursive template, part 2", () => {
  //   addTemplate('Parent', `
  //     <div>
  //       <t t-call="nodeTemplate">
  //         <t t-set="node" t-value="root"/>
  //       </t>
  //     </div>`);

  //   addTemplate('nodeTemplate', `
  //       <div>
  //         <p><t t-esc="node.val"/></p>
  //         <t t-foreach="node.children or []" t-as="subtree">
  //           <t t-call="nodeTemplate">
  //             <t t-set="node" t-value="subtree"/>
  //           </t>
  //         </t>
  //       </div>`
  //   );
  //   const root = { val: "a", children: [{ val: "b" }, { val: "c" }] };
  //   const expected = "<div><div><p>a</p><div><p>b</p></div><div><p>c</p></div></div></div>";
  //   expect(render("Parent", { root })).toBe(expected);
  // });

  //   test("recursive template, part 3", () => {
  //     qweb.addTemplates(`
  //         <templates>
  //             <div t-name="Parent">
  //                 <t t-call="nodeTemplate">
  //                     <t t-set="node" t-value="root"/>
  //                 </t>
  //             </div>
  //             <div t-name="nodeTemplate">
  //                 <p><t t-esc="node.val"/></p>
  //                 <t t-foreach="node.children or []" t-as="subtree">
  //                     <t t-call="nodeTemplate">
  //                         <t t-set="node" t-value="subtree"/>
  //                     </t>
  //                 </t>
  //             </div>

  //         </templates>
  //     `);
  //     const root = { val: "a", children: [{ val: "b", children: [{ val: "d" }] }, { val: "c" }] };
  //     const expected =
  //       "<div><div><p>a</p><div><p>b</p><div><p>d</p></div></div><div><p>c</p></div></div></div>";
  //     expect(renderToString(qweb, "Parent", { root }, { fiber: {} })).toBe(expected);
  //     const recursiveFn = Object.values(qweb.subTemplates)[0] as any;
  //     expect(recursiveFn.toString()).toMatchSnapshot();
  //   });

  //   test("recursive template, part 4: with t-set recursive index", () => {
  //     qweb.addTemplates(`
  //         <templates>
  //             <div t-name="Parent">
  //                 <t t-call="nodeTemplate">
  //                     <t t-set="recursive_idx" t-value="1"/>
  //                     <t t-set="node" t-value="root"/>
  //                 </t>
  //             </div>
  //             <div t-name="nodeTemplate">
  //                 <t t-set="recursive_idx" t-value="recursive_idx + 1"/>
  //                 <p><t t-esc="node.val"/> <t t-esc="recursive_idx"/></p>
  //                 <t t-foreach="node.children or []" t-as="subtree">
  //                     <t t-call="nodeTemplate">
  //                         <t t-set="node" t-value="subtree"/>
  //                     </t>
  //                 </t>
  //             </div>

  //         </templates>
  //     `);
  //     const root = {
  //       val: "a",
  //       children: [{ val: "b", children: [{ val: "c", children: [{ val: "d" }] }] }],
  //     };
  //     const expected =
  //       "<div><div><p>a 2</p><div><p>b 3</p><div><p>c 4</p><div><p>d 5</p></div></div></div></div></div>";
  //     expect(renderToString(qweb, "Parent", { root })).toBe(expected);
  //     const recursiveFn = Object.values(qweb.subTemplates)[0] as any;
  //     expect(recursiveFn.toString()).toMatchSnapshot();
  //   });

  //   test("t-call, global templates", () => {
  //     QWeb.registerTemplate("abcd", '<div><t t-call="john"/></div>');
  //     qweb.addTemplate("john", `<span>desk</span>`);
  //     const expected = "<div><span>desk</span></div>";
  //     expect(trim(renderToString(qweb, "abcd"))).toBe(expected);
  //   });

  //   test("t-call, conditional and t-set in t-call body", () => {
  //     QWeb.registerTemplate("callee1", "<div>callee1</div>");
  //     QWeb.registerTemplate("callee2", '<div>callee2 <t t-esc="v"/></div>');
  //     QWeb.registerTemplate(
  //       "caller",
  //       `<div>
  //         <t t-set="v1" t-value="'elif'"/>
  //         <t t-if="v1 === 'if'" t-call="callee1" />
  //         <t t-elif="v1 === 'elif'" t-call="callee2" >
  //           <t t-set="v" t-value="'success'" />
  //         </t>
  //        </div>`
  //     );
  //     const rendered = renderToString(qweb, "caller");
  //     expect(rendered).toBe(`<div><div>callee2 success</div></div>`);
  //   });

  //   test("t-call with t-set inside and outside", () => {
  //     qweb.addTemplates(`
  //       <templates>
  //         <div t-name="main">
  //           <t t-foreach="list" t-as="v">
  //             <t t-set="val" t-value="v.val"/>
  //             <t t-call="sub">
  //               <t t-set="val3" t-value="val*3"/>
  //             </t>
  //           </t>
  //         </div>
  //         <t t-name="sub">
  //           <span t-esc="val3"/>
  //         </t>
  //       </templates>
  //     `);
  //     const expected = "<div><span>3</span><span>6</span><span>9</span></div>";
  //     const context = { list: [{ val: 1 }, { val: 2 }, { val: 3 }] };
  //     expect(trim(renderToString(qweb, "main", context))).toBe(expected);
  //   });

  //   test("t-call with t-set inside and outside. 2", () => {
  //     qweb.addTemplates(`
  //       <templates>
  //         <div t-name="main">
  //           <t t-foreach="list" t-as="v">
  //             <t t-set="val" t-value="v.val"/>
  //             <t t-call="sub">
  //               <t t-set="val3" t-value="val*3"/>
  //             </t>
  //           </t>
  //         </div>
  //         <t t-name="sub">
  //           <span t-esc="val3"/>
  //           <t t-esc="w"/>
  //         </t>
  //         <p t-name="wrapper"><t t-set="w" t-value="'fromwrapper'"/><t t-call="main"/></p>
  //       </templates>
  //     `);
  //     const expected =
  //       "<p><div><span>3</span>fromwrapper<span>6</span>fromwrapper<span>9</span>fromwrapper</div></p>";
  //     const context = { list: [{ val: 1 }, { val: 2 }, { val: 3 }] };
  //     expect(trim(renderToString(qweb, "wrapper", context))).toBe(expected);
  //   });
});

// describe("foreach", () => {
//   test("iterate on items", () => {
//     qweb.addTemplate(
//       "test",
//       `
//       <div>
//         <t t-foreach="[3, 2, 1]" t-as="item">
//           [<t t-esc="item_index"/>: <t t-esc="item"/> <t t-esc="item_value"/>]
//         </t>
//     </div>`
//     );
//     const result = trim(render(template));
//     const expected = `<div>[0:33][1:22][2:11]</div>`;
//     expect(result).toBe(expected);
//   });

//   test("iterate on items (on a element node)", () => {
//     qweb.addTemplate(
//       "test",
//       `
//       <div>
//         <span t-foreach="[1, 2]" t-as="item" t-key="item"><t t-esc="item"/></span>
//     </div>`
//     );
//     const result = trim(render(template));
//     const expected = `<div><span>1</span><span>2</span></div>`;
//     expect(result).toBe(expected);
//   });

//   test("iterate, position", () => {
//     qweb.addTemplate(
//       "test",
//       `
//       <div>
//         <t t-foreach="Array(5)" t-as="elem">
//           -<t t-if="elem_first"> first</t><t t-if="elem_last"> last</t> (<t t-esc="elem_index"/>)
//         </t>
//       </div>`
//     );
//     const result = trim(render(template));
//     const expected = `<div>-first(0)-(1)-(2)-(3)-last(4)</div>`;
//     expect(result).toBe(expected);
//   });

//   test("iterate, dict param", () => {
//     qweb.addTemplate(
//       "test",
//       `
//       <div>
//         <t t-foreach="value" t-as="item">
//           [<t t-esc="item_index"/>: <t t-esc="item"/> <t t-esc="item_value"/>]
//         </t>
//       </div>`
//     );
//     const result = trim(render(template, { value: { a: 1, b: 2, c: 3 } }));
//     const expected = `<div>[0:a1][1:b2][2:c3]</div>`;
//     expect(result).toBe(expected);
//   });

//   test("does not pollute the rendering context", () => {
//     qweb.addTemplate(
//       "test",
//       `<div>
//         <t t-foreach="[1]" t-as="item"><t t-esc="item"/></t>
//       </div>`
//     );
//     const context = { __owl__: {} };
//     render(template, context);
//     expect(Object.keys(context)).toEqual(["__owl__"]);
//   });

//   test("t-foreach in t-forach", () => {
//     qweb.addTemplate(
//       "test",
//       `<div>
//         <t t-foreach="numbers" t-as="number">
//           <t t-foreach="letters" t-as="letter">
//             [<t t-esc="number"/><t t-esc="letter"/>]
//           </t>
//         </t>
//       </div>`
//     );
//     const context = { numbers: [1, 2, 3], letters: ["a", "b"] };
//     expect(render(template, context)).toBe(
//       "<div> [1a]  [1b]  [2a]  [2b]  [3a]  [3b] </div>"
//     );
//   });

//   test("throws error if invalid loop expression", () => {
//     qweb.addTemplate(
//       "test",
//       `<div><t t-foreach="abc" t-as="item"><span t-key="item_index"/></t></div>`
//     );
//     expect(() => qweb.render("test")).toThrow("Invalid loop expression");
//   });

//   test("warn if no key in some case", () => {
//     const consoleWarn = console.warn;
//     console.warn = jest.fn();

//     qweb.addTemplate(
//       "test",
//       `
//       <div>
//         <t t-foreach="[1, 2]" t-as="item">
//           <span><t t-esc="item"/></span>
//         </t>
//     </div>`
//     );
//     render(template);
//     expect(console.warn).toHaveBeenCalledTimes(1);
//     expect(console.warn).toHaveBeenCalledWith(
//       "Directive t-foreach should always be used with a t-key! (in template: 'test')"
//     );
//     console.warn = consoleWarn;
//   });
// });

// describe("misc", () => {
//   test("global", () => {
//     qweb.addTemplate("_callee-asc", `<año t-att-falló="'agüero'" t-raw="0"/>`);
//     qweb.addTemplate("_callee-uses-foo", `<span t-esc="foo">foo default</span>`);
//     qweb.addTemplate("_callee-asc-toto", `<div t-raw="toto">toto default</div>`);
//     qweb.addTemplate(
//       "caller",
//       `
//       <div>
//         <t t-foreach="[4,5,6]" t-as="value">
//           <span t-esc="value"/>
//           <t t-call="_callee-asc">
//             <t t-call="_callee-uses-foo">
//                 <t t-set="foo" t-value="'aaa'"/>
//             </t>
//             <t t-call="_callee-uses-foo"/>
//             <t t-set="foo" t-value="'bbb'"/>
//             <t t-call="_callee-uses-foo"/>
//           </t>
//         </t>
//         <t t-call="_callee-asc-toto"/>
//       </div>
//     `
//     );
//     const result = trim(renderToString(qweb, "caller"));
//     const expected = trim(`
//       <div>
//         <span>4</span>
//         <año falló="agüero">
//           <span>aaa</span>
//           <span>foo default</span>
//           <span>bbb</span>
//         </año>

//         <span>5</span>
//         <año falló="agüero">
//           <span>aaa</span>
//           <span>foo default</span>
//           <span>bbb</span>
//         </año>

//         <span>6</span>
//         <año falló="agüero">
//           <span>aaa</span>
//           <span>foo default</span>
//           <span>bbb</span>
//         </año>

//         <div>toto default</div>
//       </div>
//     `);
//     expect(result).toBe(expected);
//   });
// });

// describe("t-on", () => {
//   test("can bind event handler", () => {
//     const template = xml`<button t-on-click="add">Click</button>`;
//     let a = 1;
//     const node = renderToDOM(
//       qweb,
//       "test",
//       {
//         add() {
//           a = 3;
//         },
//       },
//       { handlers: [] }
//     );
//     (<HTMLElement>node).click();
//     expect(a).toBe(3);
//   });

//   test("can bind two event handlers", () => {
//     qweb.addTemplate(
//       "test",
//       `<button t-on-click="handleClick" t-on-dblclick="handleDblClick">Click</button>`
//     );
//     let steps: string[] = [];
//     const node = renderToDOM(
//       qweb,
//       "test",
//       {
//         handleClick() {
//           steps.push("click");
//         },
//         handleDblClick() {
//           steps.push("dblclick");
//         },
//       },
//       { handlers: [] }
//     );
//     expect(steps).toEqual([]);
//     (<HTMLElement>node).click();
//     expect(steps).toEqual(["click"]);
//     (<HTMLElement>node).dispatchEvent(new Event("dblclick"));
//     expect(steps).toEqual(["click", "dblclick"]);
//   });

//   test("can bind handlers with arguments", () => {
//     const template = xml`<button t-on-click="add(5)">Click</button>`;
//     let a = 1;
//     const node = renderToDOM(
//       qweb,
//       "test",
//       {
//         add(n) {
//           a = a + n;
//         },
//       },
//       { handlers: [] }
//     );
//     (<HTMLElement>node).click();
//     expect(a).toBe(6);
//   });

//   test("can bind handlers with object arguments", () => {
//     const template = xml`<button t-on-click="add({val: 5})">Click</button>`;
//     let a = 1;
//     const node = renderToDOM(
//       qweb,
//       "test",
//       {
//         add({ val }) {
//           a = a + val;
//         },
//       },
//       { handlers: [] }
//     );
//     (<HTMLElement>node).click();
//     expect(a).toBe(6);
//   });

//   test("can bind handlers with empty object", () => {
//     expect.assertions(2);
//     const template = xml`<button t-on-click="doSomething({})">Click</button>`;
//     const node = renderToDOM(
//       qweb,
//       "test",
//       {
//         doSomething(arg) {
//           expect(arg).toEqual({});
//         },
//       },
//       { handlers: [] }
//     );
//     (<HTMLElement>node).click();
//   });

//   test("can bind handlers with empty object (with non empty inner string)", () => {
//     expect.assertions(2);
//     const template = xml`<button t-on-click="doSomething({ })">Click</button>`;
//     const node = renderToDOM(
//       qweb,
//       "test",
//       {
//         doSomething(arg) {
//           expect(arg).toEqual({});
//         },
//       },
//       { handlers: [] }
//     );
//     (<HTMLElement>node).click();
//   });

//   test("can bind handlers with loop variable as argument", () => {
//     expect.assertions(2);
//     qweb.addTemplate(
//       "test",
//       `
//       <ul>
//         <li t-foreach="['someval']" t-as="action" t-key="action_index"><a t-on-click="activate(action)">link</a></li>
//       </ul>`
//     );
//     const node = renderToDOM(
//       qweb,
//       "test",
//       {
//         activate(action) {
//           expect(action).toBe("someval");
//         },
//       },
//       { handlers: [] }
//     );
//     (<HTMLElement>node).getElementsByTagName("a")[0].click();
//   });

//   test("handler is bound to proper owner", () => {
//     expect.assertions(2);
//     const template = xml`<button t-on-click="add">Click</button>`;
//     let owner = {
//       add() {
//         expect(this).toBe(owner);
//       },
//     };
//     const node = renderToDOM(qweb, "test", owner, { handlers: [] });
//     (<HTMLElement>node).click();
//   });

//   test("t-on with inline statement", () => {
//     const template = xml`<button t-on-click="state.counter++">Click</button>`;
//     let owner = {
//       state: {
//         counter: 0,
//       },
//     };
//     const node = renderToDOM(qweb, "test", owner, { handlers: [] });
//     expect(owner.state.counter).toBe(0);
//     (<HTMLElement>node).click();
//     expect(owner.state.counter).toBe(1);
//   });

//   test("t-on with inline statement (function call)", () => {
//     const template = xml`<button t-on-click="state.incrementCounter(2)">Click</button>`;
//     let owner = {
//       state: {
//         counter: 0,
//         incrementCounter: (inc) => {
//           owner.state.counter += inc;
//         },
//       },
//     };
//     const node = renderToDOM(qweb, "test", owner, { handlers: [] });
//     expect(owner.state.counter).toBe(0);
//     (<HTMLElement>node).click();
//     expect(owner.state.counter).toBe(2);
//   });

//   test("t-on with inline statement, part 2", () => {
//     const template = xml`<button t-on-click="state.flag = !state.flag">Toggle</button>`;
//     let owner = {
//       state: {
//         flag: true,
//       },
//     };
//     const node = renderToDOM(qweb, "test", owner, { handlers: [] });
//     expect(owner.state.flag).toBe(true);
//     (<HTMLElement>node).click();
//     expect(owner.state.flag).toBe(false);
//     (<HTMLElement>node).click();
//     expect(owner.state.flag).toBe(true);
//   });

//   test("t-on with inline statement, part 3", () => {
//     const template = xml`<button t-on-click="state.n = someFunction(3)">Toggle</button>`;
//     let owner = {
//       someFunction(n) {
//         return n + 1;
//       },
//       state: {
//         n: 11,
//       },
//     };
//     const node = renderToDOM(qweb, "test", owner, { handlers: [] });
//     expect(owner.state.n).toBe(11);
//     (<HTMLElement>node).click();
//     expect(owner.state.n).toBe(4);
//   });

//   test("t-on with t-call", async () => {
//     expect.assertions(2);
//     qweb.addTemplate("sub", `<p t-on-click="update">lucas</p>`);
//     qweb.addTemplate("main", `<div><t t-call="sub"/></div>`);

//     let owner = {
//       update() {
//         expect(this).toBe(owner);
//       },
//     };

//     const node = renderToDOM(qweb, "main", owner, { handlers: [] });
//     (<HTMLElement>node).querySelector("p")!.click();
//   });

//   test("t-on, with arguments and t-call", async () => {
//     expect.assertions(3);
//     qweb.addTemplate("sub", `<p t-on-click="update(value)">lucas</p>`);
//     qweb.addTemplate("main", `<div><t t-call="sub"/></div>`);

//     let owner = {
//       update(val) {
//         expect(this).toBe(owner);
//         expect(val).toBe(444);
//       },
//       value: 444,
//     };

//     const node = renderToDOM(qweb, "main", owner, { handlers: [] });
//     (<HTMLElement>node).querySelector("p")!.click();
//   });

//   test("t-on with prevent and/or stop modifiers", async () => {
//     expect.assertions(7);
//     qweb.addTemplate(
//       "test",
//       `<div>
//         <button t-on-click.prevent="onClickPrevented">Button 1</button>
//         <button t-on-click.stop="onClickStopped">Button 2</button>
//         <button t-on-click.prevent.stop="onClickPreventedAndStopped">Button 3</button>
//       </div>`
//     );
//     let owner = {
//       onClickPrevented(e) {
//         expect(e.defaultPrevented).toBe(true);
//         expect(e.cancelBubble).toBe(false);
//       },
//       onClickStopped(e) {
//         expect(e.defaultPrevented).toBe(false);
//         expect(e.cancelBubble).toBe(true);
//       },
//       onClickPreventedAndStopped(e) {
//         expect(e.defaultPrevented).toBe(true);
//         expect(e.cancelBubble).toBe(true);
//       },
//     };
//     const node = renderToDOM(qweb, "test", owner, { handlers: [] });

//     const buttons = (<HTMLElement>node).getElementsByTagName("button");
//     buttons[0].click();
//     buttons[1].click();
//     buttons[2].click();
//   });

//   test("t-on with self modifier", async () => {
//     expect.assertions(2);
//     qweb.addTemplate(
//       "test",
//       `<div>
//         <button t-on-click="onClick"><span>Button</span></button>
//         <button t-on-click.self="onClickSelf"><span>Button</span></button>
//       </div>`
//     );
//     let steps: string[] = [];
//     let owner = {
//       onClick(e) {
//         steps.push("onClick");
//       },
//       onClickSelf(e) {
//         steps.push("onClickSelf");
//       },
//     };
//     const node = renderToDOM(qweb, "test", owner, { handlers: [] });

//     const buttons = (<HTMLElement>node).getElementsByTagName("button");
//     const spans = (<HTMLElement>node).getElementsByTagName("span");
//     spans[0].click();
//     spans[1].click();
//     buttons[0].click();
//     buttons[1].click();

//     expect(steps).toEqual(["onClick", "onClick", "onClickSelf"]);
//   });

//   test("t-on with self and prevent modifiers (order matters)", async () => {
//     expect.assertions(2);
//     qweb.addTemplate(
//       "test",
//       `<div>
//         <button t-on-click.self.prevent="onClick"><span>Button</span></button>
//       </div>`
//     );
//     let steps: boolean[] = [];
//     let owner = {
//       onClick() {},
//     };
//     const node = renderToDOM(qweb, "test", owner, { handlers: [] });
//     (<HTMLElement>node).addEventListener("click", function (e) {
//       steps.push(e.defaultPrevented);
//     });

//     const button = (<HTMLElement>node).getElementsByTagName("button")[0];
//     const span = (<HTMLElement>node).getElementsByTagName("span")[0];
//     span.click();
//     button.click();

//     expect(steps).toEqual([false, true]);
//   });

//   test("t-on with prevent and self modifiers (order matters)", async () => {
//     expect.assertions(2);
//     qweb.addTemplate(
//       "test",
//       `<div>
//         <button t-on-click.prevent.self="onClick"><span>Button</span></button>
//       </div>`
//     );
//     let steps: boolean[] = [];
//     let owner = {
//       onClick() {},
//     };
//     const node = renderToDOM(qweb, "test", owner, { handlers: [] });
//     (<HTMLElement>node).addEventListener("click", function (e) {
//       steps.push(e.defaultPrevented);
//     });

//     const button = (<HTMLElement>node).getElementsByTagName("button")[0];
//     const span = (<HTMLElement>node).getElementsByTagName("span")[0];
//     span.click();
//     button.click();

//     expect(steps).toEqual([true, true]);
//   });

//   test("t-on with prevent modifier in t-foreach", async () => {
//     expect.assertions(5);
//     qweb.addTemplate(
//       "test",
//       `<div>
//         <t t-foreach="projects" t-as="project">
//           <a href="#" t-key="project" t-on-click.prevent="onEdit(project.id)">
//             Edit <t t-esc="project.name"/>
//           </a>
//         </t>
//       </div>`
//     );
//     const steps: string[] = [];
//     const owner = {
//       projects: [
//         { id: 1, name: "Project 1" },
//         { id: 2, name: "Project 2" },
//       ],

//       onEdit(projectId, ev) {
//         expect(ev.defaultPrevented).toBe(true);
//         steps.push(projectId);
//       },
//     };

//     const node = <HTMLElement>renderToDOM(qweb, "test", owner, { handlers: [] });
//     expect(node.outerHTML).toBe(
//       `<div><a href="#"> Edit Project 1</a><a href="#"> Edit Project 2</a></div>`
//     );

//     const links = node.querySelectorAll("a")!;
//     links[0].click();
//     links[1].click();

//     expect(steps).toEqual([1, 2]);
//   });

//   test("t-on with empty handler (only modifiers)", () => {
//     expect.assertions(2);
//     qweb.addTemplate(
//       "test",
//       `<div>
//         <button t-on-click.prevent="">Button</button>
//       </div>`
//     );
//     const node = renderToDOM(qweb, "test", {}, { handlers: [] });

//     node.addEventListener("click", (e) => {
//       expect(e.defaultPrevented).toBe(true);
//     });

//     const button = (<HTMLElement>node).getElementsByTagName("button")[0];
//     button.click();
//   });

//   test("t-on combined with t-esc", async () => {
//     expect.assertions(3);
//     const template = xml`<div><button t-on-click="onClick" t-esc="text"/></div>`;
//     const steps: string[] = [];
//     const owner = {
//       text: "Click here",
//       onClick() {
//         steps.push("onClick");
//       },
//     };

//     const node = <HTMLElement>renderToDOM(qweb, "test", owner, { handlers: [] });
//     expect(node.outerHTML).toBe(`<div><button>Click here</button></div>`);

//     node.querySelector("button")!.click();

//     expect(steps).toEqual(["onClick"]);
//   });

//   test("t-on combined with t-raw", async () => {
//     expect.assertions(3);
//     const template = xml`<div><button t-on-click="onClick" t-raw="html"/></div>`;
//     const steps: string[] = [];
//     const owner = {
//       html: "Click <b>here</b>",
//       onClick() {
//         steps.push("onClick");
//       },
//     };

//     const node = <HTMLElement>renderToDOM(qweb, "test", owner, { handlers: [] });
//     expect(node.outerHTML).toBe(`<div><button>Click <b>here</b></button></div>`);

//     node.querySelector("button")!.click();

//     expect(steps).toEqual(["onClick"]);
//   });

//   test("t-on with .capture modifier", () => {
//     expect.assertions(2);
//     qweb.addTemplate(
//       "test",
//       `<div t-on-click.capture="onCapture">
//         <button t-on-click="doSomething">Button</button>
//       </div>`
//     );

//     const steps: string[] = [];
//     const owner = {
//       onCapture() {
//         steps.push("captured");
//       },
//       doSomething() {
//         steps.push("normal");
//       },
//     };
//     const node = renderToDOM(qweb, "test", owner, { handlers: [] });

//     const button = (<HTMLElement>node).getElementsByTagName("button")[0];
//     button.click();
//     expect(steps).toEqual(["captured", "normal"]);
//   });
// });

// describe("t-ref", () => {
//   test("can get a ref on a node", () => {
//     const template = xml`<div><span t-ref="myspan"/></div>`;
//     let refs: any = {};
//     renderToDOM(qweb, "test", { __owl__: { refs } });
//     expect(refs.myspan.tagName).toBe("SPAN");
//   });

//   test("can get a dynamic ref on a node", () => {
//     const template = xml`<div><span t-ref="myspan{{id}}"/></div>`;
//     let refs: any = {};
//     renderToDOM(qweb, "test", { id: 3, __owl__: { refs } });
//     expect(refs.myspan3.tagName).toBe("SPAN");
//   });

//   test("refs in a loop", () => {
//     qweb.addTemplate(
//       "test",
//       `
//       <div>
//         <t t-foreach="items" t-as="item">
//           <div t-ref="{{item}}" t-key="item"><t t-esc="item"/></div>
//         </t>
//       </div>`
//     );
//     let refs: any = {};
//     renderToDOM(qweb, "test", { items: [1, 2, 3], __owl__: { refs } });
//     expect(Object.keys(refs)).toEqual(["1", "2", "3"]);
//   });
// });

// describe("loading templates", () => {
//   test("can initialize qweb with a string", () => {
//     const templates = `
//       <?xml version="1.0" encoding="UTF-8"?>
//       <templates id="template" xml:space="preserve">
//         <div t-name="hey">jupiler</div>
//       </templates>`;
//     const qweb = new QWeb({ templates });
//     expect(renderToString(qweb, "hey")).toBe("<div>jupiler</div>");
//   });

//   test("can load a few templates from a xml string", () => {
//     const data = `
//       <?xml version="1.0" encoding="UTF-8"?>
//       <templates id="template" xml:space="preserve">

//         <t t-name="items"><li>ok</li><li>foo</li></t>

//         <ul t-name="main"><t t-call="items"/></ul>
//       </templates>`;
//     qweb.addTemplates(data);
//     const result = renderToString(qweb, "main");
//     expect(result).toBe("<ul><li>ok</li><li>foo</li></ul>");
//   });

//   test("does not crash if string does not have templates", () => {
//     const data = "";
//     qweb.addTemplates(data);
//     expect(Object.keys(qweb.templates)).toEqual([]);
//   });
// });

// describe("special cases for some boolean html attributes/properties", () => {
//   test("input type= checkbox, with t-att-checked", () => {
//     const template = xml`<input type="checkbox" t-att-checked="flag"/>`;
//     const result = render(template, { flag: true });
//     expect(result).toBe(`<input type="checkbox" checked="">`);
//   });

//   test("various boolean html attributes", () => {
//     // the unique assertion here is the code snapshot automatically done by
//     // renderToString
//     expect.assertions(1);
//     qweb.addTemplate(
//       "test",
//       `
//       <div>
//         <input type="checkbox" checked="checked"/>
//         <input checked="checked"/>
//         <div checked="checked"/>
//         <div selected="selected"/>
//         <option selected="selected" other="1"/>
//         <input readonly="readonly"/>
//         <button disabled="disabled"/>
//       </div>
//       `
//     );
//     render(template, { flag: true });
//   });
// });

// describe("whitespace handling", () => {
//   test("white space only text nodes are condensed into a single space", () => {
//     const template = xml`<div>  </div>`;
//     const result = render(template);
//     expect(result).toBe(`<div> </div>`);
//   });

//   test("consecutives whitespaces are condensed into a single space", () => {
//     const template = xml`<div>  abc  </div>`;
//     const result = render(template);
//     expect(result).toBe(`<div> abc </div>`);
//   });

//   test("whitespace only text nodes with newlines are removed", () => {
//     qweb.addTemplate(
//       "test",
//       `<div>
//         <span>abc</span>
//        </div>`
//     );
//     const result = render(template);
//     expect(result).toBe(`<div><span>abc</span></div>`);
//   });

//   test("nothing is done in pre tags", () => {
//     const template = xml`<pre>  </pre>`;
//     const result = render(template);
//     expect(result).toBe(`<pre>  </pre>`);

//     const pretagtext = `<pre>
//         some text
//       </pre>`;
//     qweb.addTemplate("test2", pretagtext);
//     const result2 = renderToString(qweb, "test2");
//     expect(result2).toBe(pretagtext);

//     const pretagwithonlywhitespace = `<pre>

//       </pre>`;
//     qweb.addTemplate("test3", pretagwithonlywhitespace);
//     const result3 = renderToString(qweb, "test3");
//     expect(result3).toBe(pretagwithonlywhitespace);
//   });
// });

// describe("t-key", () => {
//   test("can use t-key directive on a node", () => {
//     const template = xml`<div t-key="beer.id"><t t-esc="beer.name"/></div>`;
//     expect(render(template, { beer: { id: 12, name: "Chimay Rouge" } })).toBe(
//       "<div>Chimay Rouge</div>"
//     );
//   });

//   test("t-key directive in a list", () => {
//     qweb.addTemplate(
//       "test",
//       `<ul>
//         <li t-foreach="beers" t-as="beer" t-key="beer.id"><t t-esc="beer.name"/></li>
//        </ul>`
//     );
//     expect(
//       render(template, {
//         beers: [{ id: 12, name: "Chimay Rouge" }],
//       })
//     ).toMatchSnapshot();
//   });
// });

// describe("debugging", () => {
//   test("t-debug", () => {
//     const consoleLog = console.log;
//     console.log = jest.fn();
//     qweb.addTemplate(
//       "test",
//       `<div t-debug=""><t t-if="true"><span t-debug="">hey</span></t></div>`
//     );
//     qweb.render("test");
//     expect(qweb.templates.test.fn.toString()).toMatchSnapshot();

//     expect(console.log).toHaveBeenCalledTimes(1);
//     console.log = consoleLog;
//   });

//   test("t-debug on sub template", () => {
//     const consoleLog = console.log;
//     console.log = jest.fn();
//     qweb.addTemplates(`
//       <templates>
//       <p t-name="sub" t-debug="">coucou</p>
//       <div t-name="test">
//         <t t-call="sub"/>
//       </div>
//       </templates>`);
//     qweb.render("test");

//     expect(console.log).toHaveBeenCalledTimes(1);
//     console.log = consoleLog;
//   });

//   test("t-log", () => {
//     const consoleLog = console.log;
//     console.log = jest.fn();

//     qweb.addTemplate(
//       "test",
//       `<div>
//           <t t-set="foo" t-value="42"/>
//           <t t-log="foo + 3"/>
//         </div>`
//     );
//     qweb.render("test");
//     expect(qweb.templates.test.fn.toString()).toMatchSnapshot();

//     expect(console.log).toHaveBeenCalledWith(45);
//     console.log = consoleLog;
//   });
// });

// describe("update on event bus", () => {
//   test("two consecutive forceUpdates only causes one listener update", async () => {
//     const fn = jest.fn();
//     qweb.on("update", null, fn);
//     qweb.forceUpdate();
//     qweb.forceUpdate();
//     expect(fn).toBeCalledTimes(0);
//     await nextTick();
//     expect(fn).toBeCalledTimes(1);
//   });
// });

// describe("global template registration", () => {
//   test("can register template globally", () => {
//     expect.assertions(5);
//     let qweb = new QWeb();
//     try {
//       qweb.render("mytemplate");
//     } catch (e) {
//       expect(e.message).toMatch("Template mytemplate does not exist");
//     }
//     expect(qweb.templates.mytemplate).toBeUndefined();

//     QWeb.registerTemplate("mytemplate", "<div>global</div>");
//     expect(qweb.templates.mytemplate).toBeDefined();
//     const vnode = qweb.render("mytemplate");
//     expect(vnode.sel).toBe("div");
//     expect((vnode as any).children[0].text).toBe("global");
//   });
// });

// describe("properly support svg", () => {
//   test("add proper namespace to svg", () => {
//     qweb.addTemplate(
//       "test",
//       `<svg width="100px" height="90px"><circle cx="50" cy="50" r="4" stroke="green" stroke-width="1" fill="yellow"/> </svg>`
//     );
//     expect(render(template)).toBe(
//       `<svg width=\"100px\" height=\"90px\"><circle cx=\"50\" cy=\"50\" r=\"4\" stroke=\"green\" stroke-width=\"1\" fill=\"yellow\"></circle> </svg>`
//     );
//   });

//   test("add proper namespace to g tags", () => {
//     // this is necessary if one wants to use components in a svg
//     qweb.addTemplate(
//       "test",
//       `<g><circle cx="50" cy="50" r="4" stroke="green" stroke-width="1" fill="yellow"/> </g>`
//     );
//     expect(render(template)).toBe(
//       `<g><circle cx=\"50\" cy=\"50\" r=\"4\" stroke=\"green\" stroke-width=\"1\" fill=\"yellow\"></circle> </g>`
//     );
//   });
// });

// describe("translation support", () => {
//   test("can translate node content", () => {
//     const translations = {
//       word: "mot",
//     };
//     const translateFn = (expr) => translations[expr] || expr;
//     const qweb = new QWeb({ translateFn });
//     const template = xml"<div>word</div>";
//     expect(render(template)).toBe("<div>mot</div>");
//   });

//   test("does not translate node content if disabled", () => {
//     const translations = {
//       word: "mot",
//     };
//     const translateFn = (expr) => translations[expr] || expr;
//     const qweb = new QWeb({ translateFn });
//     qweb.addTemplate(
//       "test",
//       `
//       <div>
//         <span>word</span>
//         <span t-translation="off">word</span>
//       </div>`
//     );
//     expect(render(template)).toBe("<div><span>mot</span><span>word</span></div>");
//   });

//   test("some attributes are translated", () => {
//     const translations = {
//       word: "mot",
//     };
//     const translateFn = (expr) => translations[expr] || expr;
//     const qweb = new QWeb({ translateFn });
//     qweb.addTemplate(
//       "test",
//       `
//       <div>
//         <p label="word">word</p>
//         <p title="word">word</p>
//         <p placeholder="word">word</p>
//         <p alt="word">word</p>
//         <p something="word">word</p>
//       </div>`
//     );
//     expect(render(template)).toBe(
//       '<div><p label="mot">mot</p><p title="mot">mot</p><p placeholder="mot">mot</p><p alt="mot">mot</p><p something="word">mot</p></div>'
//     );
//   });
// });

// describe("t-key tests", () => {
//   test("t-key on t-foreach", async () => {
//     qweb.addTemplate(
//       "test",
//       `
//         <div>
//           <t t-foreach="things" t-as="thing" t-key="thing">
//             <span/>
//           </t>
//         </div>`
//     );

//     let vnode = qweb.render("test", { things: [1, 2] });
//     vnode = patch(document.createElement("div"), vnode);
//     let elm = vnode.elm as HTMLElement;

//     expect(elm.outerHTML).toBe("<div><span></span><span></span></div>");

//     const first = elm.querySelectorAll("span")[0];
//     const second = elm.querySelectorAll("span")[1];

//     patch(vnode, qweb.render("test", { things: [2, 1] }));

//     expect(elm.outerHTML).toBe("<div><span></span><span></span></div>");

//     expect(first).toBe(elm.querySelectorAll("span")[1]);
//     expect(second).toBe(elm.querySelectorAll("span")[0]);
//   });
// });
