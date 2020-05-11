import { patch } from "../../src/vdom/vdom";
import { NodeType } from "../../src/vdom/types";
import { htmlToVDOM } from "../../src/vdom/html_to_vdom";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = document.createElement("div");
});

//------------------------------------------------------------------------------
// Html to vdom
//------------------------------------------------------------------------------
describe("html to vdom", function () {
  test("empty strings return empty list", function () {
    expect(htmlToVDOM("")).toEqual([]);
  });

  test("just text", function () {
    const nodeList = htmlToVDOM("simple text");
    expect(nodeList).toEqual([{ type: NodeType.Text, text: "simple text", el: null }]);
  });

  test("empty tag", function () {
    const nodeList = htmlToVDOM("<span></span>");
    expect(nodeList).toHaveLength(1);

    patch(fixture, nodeList[0]);
    expect(fixture.innerHTML).toEqual("<span></span>");
  });

  test("tag with text", function () {
    const nodeList = htmlToVDOM("<span>abc</span>");
    expect(nodeList).toHaveLength(1);
    patch(fixture, nodeList[0]);
    expect(fixture.innerHTML).toEqual("<span>abc</span>");
  });

  test("tag with attribute", function () {
    const nodeList = htmlToVDOM(`<span a="1" b="2">abc</span>`);
    expect(nodeList).toHaveLength(1);
    patch(fixture, nodeList[0]);
    expect(fixture.innerHTML).toEqual(`<span a="1" b="2">abc</span>`);
  });

  test("misc", function () {
    const nodeList = htmlToVDOM(`<span a="1" b="2">abc<div>1</div></span>`);
    expect(nodeList).toHaveLength(1);
    patch(fixture, nodeList[0]);
    expect(fixture.innerHTML).toEqual(`<span a="1" b="2">abc<div>1</div></span>`);
  });
});
