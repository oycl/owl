export function reactive<T>(elem: T, cb: () => void): T {
  if (elem === null || typeof elem !== "object" || elem instanceof Date) {
    throw new Error("Cannot make a reactive primitive value");
  }
  return observe(elem, cb);
}

function observe<T>(value: T, cb: () => void): T {
  const subProxies: { [key: string]: any } = {};

  return new Proxy(value as any, {
    get(target: any, key: string): any {
      const current = target[key];
      if (current === null || typeof current !== "object" || current instanceof Date) {
        return current;
      } else if (key in subProxies) {
        return subProxies[key];
      } else {
        const proxy = observe(current, cb);
        subProxies[key] = proxy;
        return proxy;
      }
    },
    set(target: any, key: string, value: any): boolean {
      const current = target[key];
      if (current !== value) {
        target[key] = value;
        cb();
      }
      return true;
    },
    deleteProperty(target: any, key: string | number) {
      if (key in target) {
        delete target[key];
        delete subProxies[key];
        cb();
      }
      return true;
    },
  });
}
