import { CompiledTemplate, compileTemplate } from "./compiler";

// -----------------------------------------------------------------------------
// Global template Map
// -----------------------------------------------------------------------------

let nextId = 1;
const templateMap: { [name: string]: string } = {};

export function addTemplate(name: string, template: string) {
  templateMap[name] = template;
}

export function xml(strings, ...args) {
  const name = `__template__${nextId++}`;
  const value = String.raw(strings, ...args);
  addTemplate(name, value);
  return name;
}

// -----------------------------------------------------------------------------
// QWeb
// -----------------------------------------------------------------------------

export class QWeb {
  static utils: any = {};

  templates: { [name: string]: CompiledTemplate } = {};

  getTemplate(template: string): CompiledTemplate {
    let fn = this.templates[template];
    if (!fn) {
      const rawTemplate = templateMap[template];
      if (!rawTemplate) {
        throw new Error("qweb not implemented yet...");
      }

      fn = compileTemplate(template, rawTemplate).bind(QWeb.utils);
      this.templates[template] = fn;
    }
    return fn;
  }
}
