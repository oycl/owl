import { compileExpr } from "./expression_parser";
import { AST, ASTIfNode, ASTDOMNode, ASTStaticNode, ASTElifNode, ASTElseNode } from "./types";

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

interface ParserContext {
  isStatic: boolean;
}

export function parse(xml: string): AST {
  const template = `<t>${xml}</t>`;
  const doc = parseXML(template);
  const ctx: ParserContext = { isStatic: false };
  return parseNode(ctx, doc.firstChild!)!;
}

function parseNode(ctx: ParserContext, node: ChildNode): AST | null {
  if (!(node instanceof Element)) {
    return parseTextCommentNode(ctx, node);
  }
  return (
    parseTIfNode(ctx, node) ||
    parseTEscNode(ctx, node) ||
    parseTRawNode(ctx, node) ||
    parseComponentNode(ctx, node) ||
    parseTSetNode(ctx, node) ||
    parseTCallNode(ctx, node) ||
    parseTForeachNode(ctx, node) ||
    parseTNode(ctx, node) ||
    parseDOMNode(ctx, node)
  );
}

// -----------------------------------------------------------------------------
// Text and Comment Nodes
// -----------------------------------------------------------------------------
const lineBreakRE = /[\r\n]/;
const whitespaceRE = /\s+/g;

function parseTextCommentNode(ctx: ParserContext, node: ChildNode): AST | null {
  const type = node.nodeType === 3 ? "TEXT" : "COMMENT";
  let text = node.textContent!;
  if (lineBreakRE.test(text) && !text.trim()) {
    return null;
  }
  text = text.replace(whitespaceRE, " ");
  return {
    type,
    text,
    // text: "`" + text + "`",
  };
}

// -----------------------------------------------------------------------------
// t-if directive
// -----------------------------------------------------------------------------

function parseTIfNode(ctx: ParserContext, node: Element): ASTIfNode | null {
  if (!node.hasAttribute("t-if")) {
    return null;
  }
  ctx.isStatic = false;

  const condition = node.getAttribute("t-if")!;
  node.removeAttribute("t-if");
  let child = parseNode(ctx, node)!;

  let nextElement = node.nextElementSibling;
  let firstAST: null | ASTElifNode | ASTElseNode = null;
  let lastAST: null | ASTElifNode | ASTElseNode = null;

  // t-elifs
  while (nextElement && nextElement.hasAttribute("t-elif")) {
    const condition = nextElement.getAttribute("t-elif")!;
    nextElement.removeAttribute("t-elif");
    const elif: ASTElifNode = {
      type: "T-ELIF",
      child: parseNode(ctx, nextElement)!,
      condition,
      next: null,
    };
    firstAST = firstAST || elif;
    if (lastAST) {
      lastAST.next = elif;
      lastAST = elif;
    } else {
      lastAST = elif;
    }
    const n = nextElement.nextElementSibling;
    nextElement.remove();
    nextElement = n;
  }

  // t-else
  if (nextElement && nextElement.hasAttribute("t-else")) {
    const elseAST: ASTElseNode = {
      type: "T-ELSE",
      child: parseNode(ctx, nextElement)!,
    };
    firstAST = firstAST || elseAST;
    if (lastAST) {
      lastAST.next = elseAST;
    }
    nextElement.remove();
  }

  return {
    type: "T-IF",
    child,
    condition,
    next: firstAST,
  };
}

// -----------------------------------------------------------------------------
// t-esc and t-raw directive
// -----------------------------------------------------------------------------

function parseTEscNode(ctx: ParserContext, node: Element): AST | null {
  return parseTEscRawNode(ctx, node, "t-esc");
}

function parseTRawNode(ctx: ParserContext, node: Element): AST | null {
  return parseTEscRawNode(ctx, node, "t-raw");
}

function parseTEscRawNode(ctx: ParserContext, node: Element, attr: "t-esc" | "t-raw"): AST | null {
  if (!node.hasAttribute(attr)) {
    return null;
  }
  ctx.isStatic = false;
  const type = attr === "t-esc" ? "T-ESC" : "T-RAW";
  const expr = node.getAttribute(attr)!;
  node.removeAttribute(attr);
  let ast = parseNode(ctx, node);
  if (ast && ast.type === "STATIC") {
    // since we have a t-esc, this cannot really be a static node
    ast = ast.child;
  }

  if (ast && ast.type === "DOM") {
    const body = ast.children;
    ast.children = [{ type, expr, body }];
    return ast;
  }
  if (ast && ast.type === "MULTI") {
    return { type, expr, body: ast.children };
  }
  return { type, expr, body: ast ? [ast] : [] };
}

// -----------------------------------------------------------------------------
// Components: <t t-component /> and <Component />
// -----------------------------------------------------------------------------

function parseComponentNode(ctx: ParserContext, node: Element): AST | null {
  const firstLetter = node.tagName[0];
  if (firstLetter !== firstLetter.toUpperCase()) {
    return null;
  }
  ctx.isStatic = false;
  const props: { [key: string]: string } = {};
  let key = "";

  const attributes = node.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const name = attributes[i].name;
    const value = attributes[i].textContent!;
    if (name.startsWith("t-")) {
      if (name === "t-key") {
        key = value;
      }
    } else {
      props[name] = value;
    }
  }

  return {
    type: "COMPONENT",
    name: node.tagName,
    props,
    key,
  };
}

// -----------------------------------------------------------------------------
// t-set directive
// -----------------------------------------------------------------------------

function parseTSetNode(ctx: ParserContext, node: Element): AST | null {
  if (!node.hasAttribute("t-set")) {
    return null;
  }
  const name = node.getAttribute("t-set")!;
  const value = node.getAttribute("t-value");
  const body = parseChildren(ctx, node);
  return { type: "T-SET", name, value, body };
}

// -----------------------------------------------------------------------------
// <t /> tag
// -----------------------------------------------------------------------------

function parseTNode(ctx: ParserContext, node: Element): AST | null {
  if (node.tagName !== "t") {
    return null;
  }
  let children = parseChildren(ctx, node);
  if (children.length === 1) {
    return children[0];
  } else {
    return { type: "MULTI", children };
  }
}

function parseChildren(ctx: ParserContext, node: Element): AST[] {
  let children: AST[] = [];
  while (node.hasChildNodes()) {
    const child = node.firstChild!;
    const astnode = parseNode(ctx, child);
    if (astnode) {
      children.push(astnode);
    }
    child.remove();
  }
  while (children.length === 1 && children[0].type === "MULTI") {
    children = children[0].children;
  }
  return children;
}

// -----------------------------------------------------------------------------
// Regular dom node
// -----------------------------------------------------------------------------

function parseDOMNode(ctx: ParserContext, node: Element): ASTDOMNode | ASTStaticNode {
  let isStatic = true;
  let key = "1";
  if (node.hasAttribute("t-key")) {
    isStatic = false;
    const keyExpr = node.getAttribute("t-key");
    key = keyExpr ? compileExpr(keyExpr) : "1";
    node.removeAttribute("t-key");
  }
  const attributes = (<Element>node).attributes;
  const handlers: ASTDOMNode["on"] = {};
  let attClass = "";
  let attfClass = "";

  const attrs: { [name: string]: string } = {};
  for (let i = 0; i < attributes.length; i++) {
    let attrName = attributes[i].name;
    let attrValue = attributes[i].textContent!;
    if (attrName.startsWith("t-")) {
      isStatic = false;
    }
    if (attrName.startsWith("t-on-")) {
      handlers[attrName.slice(5)] = { expr: attrValue };
    } else if (attrValue) {
      if (attrName === "t-att-class") {
        attClass = attrValue;
      } else {
        attrs[attrName] = attrValue;
      }
    }
  }
  if (!isStatic) {
    ctx.isStatic = false;
  }
  const subContext: ParserContext = { isStatic };
  const children = parseChildren(subContext, node);
  const domNode: ASTDOMNode = {
    type: "DOM",
    tag: node.tagName,
    children,
    key,
    attrs,
    on: handlers,
    attClass,
    attfClass,
  };
  if (subContext.isStatic && !ctx.isStatic) {
    return {
      type: "STATIC",
      child: domNode,
    };
  }
  return domNode;
}

// -----------------------------------------------------------------------------
// parse XML
// -----------------------------------------------------------------------------

function parseXML(xml: string): Document {
  const parser = new DOMParser();

  const doc = parser.parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    let msg = "Invalid XML in template.";
    const parsererrorText = doc.getElementsByTagName("parsererror")[0].textContent;
    if (parsererrorText) {
      msg += "\nThe parser has produced the following error message:\n" + parsererrorText;
      const re = /\d+/g;
      const firstMatch = re.exec(parsererrorText);
      if (firstMatch) {
        const lineNumber = Number(firstMatch[0]);
        const line = xml.split("\n")[lineNumber - 1];
        const secondMatch = re.exec(parsererrorText);
        if (line && secondMatch) {
          const columnIndex = Number(secondMatch[0]) - 1;
          if (line[columnIndex]) {
            msg +=
              `\nThe error might be located at xml line ${lineNumber} column ${columnIndex}\n` +
              `${line}\n${"-".repeat(columnIndex - 1)}^`;
          }
        }
      }
    }
    throw new Error(msg);
  }
  let tbranch = doc.querySelectorAll("[t-elif], [t-else]");
  for (let i = 0, ilen = tbranch.length; i < ilen; i++) {
    let node = tbranch[i];
    let prevElem = node.previousElementSibling!;
    let pattr = function (name: string) {
      return prevElem.getAttribute(name);
    };
    let nattr = function (name: string) {
      return +!!node.getAttribute(name);
    };
    if (prevElem && (pattr("t-if") || pattr("t-elif"))) {
      if (pattr("t-foreach")) {
        throw new Error(
          "t-if cannot stay at the same level as t-foreach when using t-elif or t-else"
        );
      }
      if (
        ["t-if", "t-elif", "t-else"].map(nattr).reduce(function (a, b) {
          return a + b;
        }) > 1
      ) {
        throw new Error("Only one conditional branching directive is allowed per node");
      }
      // All text (with only spaces) and comment nodes (nodeType 8) between
      // branch nodes are removed
      let textNode: any;
      while ((textNode = node.previousSibling!) !== prevElem) {
        if (textNode!.nodeValue!.trim().length && textNode!.nodeType !== 8) {
          throw new Error("text is not allowed between branching directives");
        }
        textNode!.remove();
      }
    } else {
      throw new Error(
        "t-elif and t-else directives must be preceded by a t-if or t-elif directive"
      );
    }
  }

  return doc;
}

// -----------------------------------------------------------------------------
// t-call directive
// -----------------------------------------------------------------------------

function parseTCallNode(ctx: ParserContext, node: Element): AST | null {
  if (!node.hasAttribute("t-call")) {
    return null;
  }
  ctx.isStatic = false;
  if (node.tagName !== "t") {
    throw new Error("Invalid tag for t-call directive (should be 't')");
  }

  return {
    type: "T-CALL",
    template: node.getAttribute("t-call")!,
    children: parseChildren(ctx, node),
  };
}

// -----------------------------------------------------------------------------
// t-foreach directive
// -----------------------------------------------------------------------------

function parseTForeachNode(ctx: ParserContext, node: Element): AST | null {
  if (!node.hasAttribute("t-foreach")) {
    return null;
  }
  ctx.isStatic = false;
  const collection = node.getAttribute("t-foreach")!;
  const varName = node.getAttribute("t-as")!;
  node.removeAttribute("t-foreach");
  node.removeAttribute("t-as");
  const children = node.tagName === "t" ? parseChildren(ctx, node) : [parseDOMNode(ctx, node)];
  return {
    type: "T-FOREACH",
    children,
    collection,
    varName,
  };
}
