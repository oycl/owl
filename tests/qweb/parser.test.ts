import { parse } from "../../src/qweb/parser";
// import { VTree } from "../../src/core/rendering_engine";


//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("qweb parser", () => {
    test("remove multi node from ast if they  have 1 child", () => {
        const ast = parse("<t>text</t>")
        expect(ast).toEqual({type: "TEXT", text: "text"});
    });

    test("recursively remove multi node from ast if they  have 1 child", () => {
        const ast = parse("<t><t><t>text</t></t></t>")
        expect(ast).toEqual({type: "TEXT", text: "text"});
    });
    
});
