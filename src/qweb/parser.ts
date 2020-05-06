// -----------------------------------------------------------------------------
// AST Type definition
// -----------------------------------------------------------------------------
export interface ASTDOMNode {
  type: "DOM";
  tag: string;
  children: AST[];
  key: string | number;
  attrs: { [name: string]: string };
}

export interface ASTComponentNode {
  type: "COMPONENT";
  name: string;
}

export interface ASTTextNode {
  type: "TEXT";
  text: string;
}

export interface ASTEscNode {
  type: "T-ESC";
  expr: string;
  body: AST[];
}

export interface ASTCommentNode {
  type: "COMMENT";
  text: string;
}

export interface ASTMultiNode {
  type: "MULTI";
  children: AST[];
}

export interface ASTIfNode {
  type: "T-IF";
  condition: string;
  child: AST;
  next: ASTElifNode | ASTElseNode | null;
}

export interface ASTElifNode {
  type: "T-ELIF";
  condition: string;
  child: AST;
  next: ASTElifNode | ASTElseNode | null;
}

export interface ASTElseNode {
  type: "T-ELSE";
  child: AST;
}

export interface ASTSetNode {
  type: "T-SET";
  name: string;
  value: string | null;
  body: AST[];
}

export type AST =
  | ASTDOMNode
  | ASTTextNode
  | ASTEscNode
  | ASTSetNode
  | ASTCommentNode
  | ASTMultiNode
  | ASTIfNode
  | ASTElifNode
  | ASTElseNode
  | ASTComponentNode;

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

export function parse(xml: string): AST {
  const template = `<t>${xml}</t>`;
  const doc = parseXML(template);
  return parseNode(doc.firstChild!)!;
}

function parseNode(node: ChildNode): AST | null {
  if (!(node instanceof Element)) {
    return parseTextCommentNode(node);
  }
  return (
    parseTIfNode(node) ||
    parseTEscNode(node) ||
    parseComponentNode(node) ||
    parseTSetNode(node) ||
    parseTNode(node) ||
    parseDOMNode(node)
  );
}

// -----------------------------------------------------------------------------
// Text and Comment Nodes
// -----------------------------------------------------------------------------
const lineBreakRE = /[\r\n]/;
const whitespaceRE = /\s+/g;

function parseTextCommentNode(node: ChildNode): AST | null {
  const type = node.nodeType === 3 ? "TEXT" : "COMMENT";
  let text = node.textContent!;
  if (lineBreakRE.test(text) && !text.trim()) {
    return null;
  }
  text = text.replace(whitespaceRE, " ");
  return {
    type,
    text: "`" + text + "`",
  };
}

// -----------------------------------------------------------------------------
// t-if directive
// -----------------------------------------------------------------------------

function parseTIfNode(node: Element): ASTIfNode | null {
  if (!node.hasAttribute("t-if")) {
    return null;
  }

  const condition = node.getAttribute("t-if")!;
  node.removeAttribute("t-if");
  let child = parseNode(node)!;

  let nextElement = node.nextElementSibling;
  let firstAST: null | ASTElifNode | ASTElseNode = null;
  let lastAST: null | ASTElifNode | ASTElseNode = null;

  // t-elifs
  while (nextElement && nextElement.hasAttribute("t-elif")) {
    const condition = nextElement.getAttribute("t-elif")!;
    nextElement.removeAttribute("t-elif");
    const elif: ASTElifNode = {
      type: "T-ELIF",
      child: parseNode(nextElement)!,
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
      child: parseNode(nextElement)!,
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
// t-esc directive
// -----------------------------------------------------------------------------

function parseTEscNode(node: Element): AST | null {
  if (!node.hasAttribute("t-esc")) {
    return null;
  }
  const expr = node.getAttribute("t-esc")!;
  node.removeAttribute("t-esc");
  const ast = parseNode(node);
  if (ast && ast.type === "DOM") {
    const body = ast.children;
    ast.children = [{ type: "T-ESC", expr, body }];
    return ast;
  }
  return { type: "T-ESC", expr, body: [] };
}

// -----------------------------------------------------------------------------
// Components: <t t-component /> and <Component />
// -----------------------------------------------------------------------------

function parseComponentNode(node: Element): AST | null {
  const firstLetter = node.tagName[0];
  if (firstLetter !== firstLetter.toUpperCase()) {
    return null;
  }
  return {
    type: "COMPONENT",
    name: node.tagName,
  };
}

// -----------------------------------------------------------------------------
// t-set directive
// -----------------------------------------------------------------------------

function parseTSetNode(node: Element): AST | null {
  if (!node.hasAttribute("t-set")) {
    return null;
  }
  const name = node.getAttribute("t-set")!;
  const value = node.getAttribute("t-value");
  const body = parseChildren(node);
  return { type: "T-SET", name, value, body };
}

// -----------------------------------------------------------------------------
// <t /> tag
// -----------------------------------------------------------------------------

function parseTNode(node: Element): AST | null {
  if (node.tagName !== "t") {
    return null;
  }
  let children = parseChildren(node);
  if (children.length === 1) {
    return children[0];
  } else {
    return { type: "MULTI", children };
  }
}

function parseChildren(node: Element): AST[] {
  let children: AST[] = [];
  while (node.hasChildNodes()) {
    const child = node.firstChild!;
    const astnode = parseNode(child);
    if (astnode) {
      children.push(astnode);
    }
    child.remove();
  }
  return children;
}

// -----------------------------------------------------------------------------
// Regular dom node
// -----------------------------------------------------------------------------

function parseDOMNode(node: Element): AST {
  const attributes = (<Element>node).attributes;
  const attrs: { [name: string]: string } = {};
  for (let i = 0; i < attributes.length; i++) {
    let attrName = attributes[i].name;
    let attrValue = attributes[i].textContent;
    if (attrValue) {
      attrs[attrName] = attrValue;
    }
  }
  return {
    type: "DOM",
    tag: node.tagName,
    children: parseChildren(node),
    key: 1,
    attrs,
  };
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
    let pattr = function (name) {
      return prevElem.getAttribute(name);
    };
    let nattr = function (name) {
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
      let textNode;
      while ((textNode = node.previousSibling) !== prevElem) {
        if (textNode.nodeValue.trim().length && textNode.nodeType !== 8) {
          throw new Error("text is not allowed between branching directives");
        }
        textNode.remove();
      }
    } else {
      throw new Error(
        "t-elif and t-else directives must be preceded by a t-if or t-elif directive"
      );
    }
  }

  return doc;
}
