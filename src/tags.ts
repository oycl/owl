import { qweb } from "./qweb/qweb";

export function xml(strings: TemplateStringsArray, ...args: any[]) {
  const name = `__template__${qweb.nextId++}`;
  const value = String.raw(strings, ...args);
  qweb.addTemplate(name, value);
  return name;
}
