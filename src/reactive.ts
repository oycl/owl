type CB = () => void;

export function reactive<T>(elem: T, cb: () => void): T {
  if (elem === null || typeof elem !== "object" || elem instanceof Date) {
    throw new Error("Cannot make a reactive primitive value");
  }
  return observe(elem, cb);
}

const owl = Symbol("owl");

function observe<T>(value: T, cb: CB): T {
  if (owl in value) {
    // need to traverse all value and add cb recursively
    registerCallBack(value, cb);
    return value;
  }
  const callbacks: Set<CB> = new Set();
  callbacks.add(cb);
  const OBJ = value as any;
  Object.defineProperty(OBJ, owl, {
    value: callbacks,
    enumerable: false,
  });

  const proxy = new Proxy(value as any, {
    get(target: any, key: any): any {
      const current = target[key];
      if (current === null || typeof current !== "object" || current instanceof Date) {
        return current;
      }
      if (owl in current) {
        return current;
      }
      if (key === owl) {
        return current;
      }
      const subValue = observe(current, cb);
      target[key] = subValue;
      return subValue;
    },
    set(target: any, key: string, value: any): boolean {
      const current = OBJ[key];
      if (current !== value) {
        const isPrimitive = value === null || typeof value !== "object" || value instanceof Date;

        OBJ[key] = isPrimitive ? value : observe(value, cb);
        notify(callbacks);
      }
      return true;
    },
    deleteProperty(target: any, key: string | number) {
      if (key in target) {
        delete target[key];
        notify(callbacks);
      }
      return true;
    },
  });

  return proxy;
}

function notify(cbs: Set<CB>) {
  for (let cb of cbs) {
    cb();
  }
}

function registerCallBack(elem: any, cb: CB) {
  elem[owl].add(cb);
  for (let key in elem) {
    const val = elem[key];
    if (typeof val === "object") {
      registerCallBack(val, cb);
    }
  }
}
