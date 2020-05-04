// -----------------------------------------------------------------------------
// AST
// -----------------------------------------------------------------------------

export const enum ASTNodeType {
  DOM,
  Text,
  Multi,
  Component,
}

export interface ASTDOMNode {
  type: ASTNodeType.DOM;
  tag: string;
  children: AST[];
  key: string | number;
}

export interface ASTComponentNode {
  type: ASTNodeType.Component;
  name: string;
}

export interface ASTTextNode {
  type: ASTNodeType.Text;
  text: string;
}

export interface ASTMultiNode {
  type: ASTNodeType.Multi;
  children: AST[];
}

export type AST = ASTDOMNode | ASTTextNode | ASTMultiNode | ASTComponentNode;

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

export function parse(xml: string): AST {
  const template = `<t>${xml}</t>`;
  const doc = toXML(template);
  return parseNode(doc.firstChild!);
}

function parseNode(node: ChildNode): AST {
  if (!(node instanceof Element)) {
    let text = '"' + node.textContent! + '"';
    return {
      type: ASTNodeType.Text,
      text,
    };
  }
  if (node.tagName === "t") {
    const tEsc = node.getAttribute("t-esc");
    if (tEsc) {
      return {
        type: ASTNodeType.Text,
        text: `context["${tEsc}"]`,
      };
    }
    const children = Array.from(node.childNodes).map(parseNode);
    if (children.length === 1) {
      return children[0];
    } else {
      return { type: ASTNodeType.Multi, children };
    }
  }
  const firstLetter = node.tagName[0];
  if (firstLetter === firstLetter.toUpperCase()) {
    return {
      type: ASTNodeType.Component,
      name: node.tagName,
    };
  }
  let children = Array.from(node.childNodes).map(parseNode);
  return {
    type: ASTNodeType.DOM,
    tag: node.tagName,
    children,
    key: 1,
  };
}

function toXML(xml: string): Document {
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
