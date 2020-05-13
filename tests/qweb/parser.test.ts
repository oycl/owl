import { parse } from "../../src/qweb/parser";
import { AST, ASTDOMNode } from "../../src/qweb/types";

function structure(node: AST): any {
  switch (node.type) {
    case "STATIC":
      return { type: "STATIC", child: structure(node.child) };
    case "MULTI":
    case "T-FOREACH":
    case "T-CALL":
    case "DOM":
      return { type: node.type, children: node.children.map(structure) };
    case "T-ESC":
    case "T-RAW":
    case "T-SET":
      return { type: node.type, children: node.body.map(structure) };
    case "T-IF":
    case "T-ELIF":
      return {
        type: "T-IF",
        child: structure(node.child),
        next: node.next ? structure(node.next) : null,
      };
    case "T-ELSE":
      return { type: node.type, child: structure(node.child) };
    default:
      return { type: node.type };
  }
}

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("qweb parser", () => {
  test("remove multi node from ast if they  have 1 child", () => {
    const ast = parse("<t>text</t>");
    expect(ast).toEqual({ type: "TEXT", text: "text" });
  });

  test("recursively remove multi node from ast if they  have 1 child", () => {
    const ast = parse("<t><t><t>text</t></t></t>");
    expect(ast).toEqual({ type: "TEXT", text: "text" });
  });

  test("flatten multi node tree", () => {
    const ast = parse("<t><t><t>text1</t></t><t>text2</t></t>");
    expect(ast).toEqual({
      type: "MULTI",
      children: [
        { type: "TEXT", text: "text1" },
        { type: "TEXT", text: "text2" },
      ],
    });
  });

  test("can detect simple static node", () => {
    const ast = parse("<div>text</div>");
    expect(structure(ast)).toEqual({
      type: "STATIC",
      child: { type: "DOM", children: [{ type: "TEXT" }] },
    });
  });

  test("can detect static node with static children", () => {
    const ast = parse("<div>abc<p>def</p></div>");
    expect(structure(ast)).toEqual({
      type: "STATIC",
      child: {
        type: "DOM",
        children: [{ type: "TEXT" }, { type: "DOM", children: [{ type: "TEXT" }] }],
      },
    });
  });

  test("template with t-if and static sub node", () => {
    const ast = parse(`<div t-if="condition">abc</div>`);
    expect(structure(ast)).toEqual({
      type: "T-IF",
      child: {
        type: "STATIC",
        child: { type: "DOM", children: [{ type: "TEXT" }] },
      },
      next: null,
    });
  });

  test("template with dom node and t-if inside", () => {
    const ast = parse(`<div><t t-if="condition">abc</t></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-IF",
          child: { type: "TEXT" },
          next: null,
        },
      ],
    });
  });

  test("dom node and t-call inside", () => {
    const ast = parse(`<div><t t-call="blabla"/></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-CALL",
          children: [],
        },
      ],
    });
  });

  test("dom node and t-esc inside", () => {
    const ast = parse(`<div><t t-esc="blabla"/></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-ESC",
          children: [],
        },
      ],
    });
  });

  test("dom node and t-esc inside, alternate version", () => {
    const ast = parse(`<div t-esc="blabla"/>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-ESC",
          children: [],
        },
      ],
    });
  });

  test("dom node and t-raw inside", () => {
    const ast = parse(`<div><t t-raw="blabla"/></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-RAW",
          children: [],
        },
      ],
    });
  });

  test("dom node and t-raw inside, alternate version", () => {
    const ast = parse(`<div t-raw="blabla"/>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-RAW",
          children: [],
        },
      ],
    });
  });

  test("dom node and t-foreach inside", () => {
    const ast = parse(`<div><t t-foreach="items" t-as="item" t-key="item.id"><span/></t></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-FOREACH",
          children: [{ type: "STATIC", child: { type: "DOM", children: [] } }],
        },
      ],
    });
  });

  test("dom node and component inside", () => {
    const ast = parse(`<div><MyComponent /></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "COMPONENT",
        },
      ],
    });
  });

  test("dom node with dynamic attribute", () => {
    const ast = parse(`<div t-att-foo="'bar'"/>`) as ASTDOMNode;
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [],
    });
    expect(ast.attrs).toEqual({ "t-att-foo": "'bar'" });
  });

  test("dom node with class attribute", () => {
    const ast = parse(`<div class="abc"><t t-esc="hey"/></div>`) as ASTDOMNode;
    expect(ast.attrs).toEqual({ class: "abc" });
    expect(ast.attClass).toEqual("");
    expect(ast.attfClass).toEqual("");
  });

  test("dom node with class and t-att-class attribute", () => {
    const ast = parse(`<div class="abc" t-att-class="d"><t t-esc="hey"/></div>`) as ASTDOMNode;
    expect(ast.attrs).toEqual({ class: "abc" });
    expect(ast.attClass).toEqual("d");
    expect(ast.attfClass).toEqual("");
  });
});
