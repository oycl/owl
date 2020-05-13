import { QWeb } from "./qweb";
import { VRootNode } from "../vdom/types";

export interface RenderContext {
  [key: string]: any;
}

export interface TemplateInfo {
  fn: (this: QWeb["utils"], root: VRootNode, context: RenderContext, extra: any) => void;
  staticNodes: HTMLElement[];
}

export interface QWebTemplate {
  createRoot(): VRootNode;
  render(root: VRootNode, context: RenderContext, extra: any): void;
}

// -----------------------------------------------------------------------------
// AST Type definition
// -----------------------------------------------------------------------------

interface Handler {
  expr: string;
}

export interface ASTDOMNode {
  type: "DOM";
  tag: string;
  children: AST[];
  key: string | number;
  attrs: { [name: string]: string };
  on: { [event: string]: Handler };
  attClass?: string;
  attfClass?: string;
}

export interface ASTStaticNode {
  type: "STATIC";
  child: AST;
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

export interface ASTRawNode {
  type: "T-RAW";
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

export interface ASTForeachNode {
  type: "T-FOREACH";
  collection: string;
  varName: string;
  children: AST[];
}

export interface ASTCallNode {
  type: "T-CALL";
  template: string;
  children: AST[];
}

// TODO: add and support nodes of types "BLOCK":

export type AST =
  | ASTDOMNode
  | ASTStaticNode
  | ASTTextNode
  | ASTEscNode
  | ASTRawNode
  | ASTSetNode
  | ASTCommentNode
  | ASTMultiNode
  | ASTIfNode
  | ASTElifNode
  | ASTElseNode
  | ASTComponentNode
  | ASTForeachNode
  | ASTCallNode;
