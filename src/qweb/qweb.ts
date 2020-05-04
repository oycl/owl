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

export const utils: any = {};

export const compiledTemplates: { [name: string]: CompiledTemplate } = {};

export function getTemplateFn(template: string): CompiledTemplate {
  let fn = compiledTemplates[template];
  if (!fn) {
    const rawTemplate = templateMap[template];
    if (rawTemplate === undefined) {
      throw new Error("qweb not implemented yet...");
    }

    fn = compileTemplate(template, rawTemplate);
    compiledTemplates[template] = fn;
  }
  return fn;
}
