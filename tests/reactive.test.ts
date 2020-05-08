import { reactive } from "../src/reactive";

describe("reactive", () => {
  test("basic properties", () => {
    let n = 0;
    const obj = reactive({} as any, () => n++);
    expect(typeof obj).toBe("object");
    expect(n).toBe(0);

    obj.a = 3;
    expect(n).toBe(1);
    expect(obj.a).toBe(3);
    expect(n).toBe(1);
  });

  test("setting property to same value does not trigger callback", () => {
    let n = 0;
    const obj = reactive({} as any, () => n++);

    obj.a = 3;
    obj.a = 3;
    expect(n).toBe(1);
  });

  test("does not work on primitive values", () => {
    expect(() => reactive(1, () => {})).toThrow();
    expect(() => reactive("asf", () => {})).toThrow();
    expect(() => reactive(true, () => {})).toThrow();
    expect(() => reactive(null, () => {})).toThrow();
    expect(() => reactive(undefined, () => {})).toThrow();
  });

  test("does not work on dates", () => {
    expect(() => reactive(new Date(), () => {})).toThrow();
  });

  test("contains initial values", () => {
    const obj = reactive({ a: 1, b: 2 }, () => {});
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect((obj as any).c).toBe(undefined);
  });

  test("detect object value changes", () => {
    let n = 0;
    const obj = reactive({ a: 1 }, () => n++) as any;

    expect(n).toBe(0);
    obj.a = 3;
    expect(n).toBe(1);

    obj.b = 5;
    expect(n).toBe(2);

    obj.a = null;
    obj.b = undefined;
    expect(n).toBe(4);
    expect(obj).toEqual({ a: null, b: undefined });
  });

  test("properly handle dates", () => {
    const date = new Date();
    let n = 0;
    const obj = reactive({ date }, () => n++);

    expect(typeof obj.date.getFullYear()).toBe("number");
    expect(obj.date).toBe(date);
    obj.date = new Date();
    expect(n).toBe(1);
    expect(obj.date).not.toBe(date);
  });

  test("can observe value change in array in an object", () => {
    let n = 0;
    const obj = reactive({ arr: [1, 2] }, () => n++) as any;

    expect(Array.isArray(obj.arr)).toBe(true);
    expect(n).toBe(0);

    obj.arr[0] = "nope";

    expect(n).toBe(1);
    expect(obj.arr).toEqual(["nope", 2]);
  });

  test("getting twice an object properties return same object", () => {
    const obj = reactive({ a: { b: 1 } }, () => {});

    const a1 = obj.a;
    const a2 = obj.a;
    expect(a1).toBe(a2);
  });

  test("various object property changes", () => {
    let n = 0;
    const obj = reactive({ a: 1 }, () => n++) as any;
    expect(n).toBe(0);

    obj.a = 2;
    expect(n).toBe(1);

    // same value again
    obj.a = 2;
    expect(n).toBe(1);

    obj.a = 3;
    expect(n).toBe(2);
  });

  test("properly observe arrays", () => {
    let n = 0;
    const arr = reactive([], () => n++) as any;

    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(0);
    expect(n).toBe(0);

    arr.push(1);
    expect(n).toBe(1);
    expect(arr.length).toBe(1);
    expect(arr).toEqual([1]);

    arr.splice(1, 0, "hey");
    expect(n).toBe(2);
    expect(arr).toEqual([1, "hey"]);
    expect(arr.length).toBe(2);

    arr.unshift("lindemans");
    //it generates 3 primitive operations
    expect(n).toBe(5);
    expect(arr).toEqual(["lindemans", 1, "hey"]);
    expect(arr.length).toBe(3);

    arr.reverse();
    //it generates 2 primitive operations
    expect(n).toBe(7);
    expect(arr).toEqual(["hey", 1, "lindemans"]);
    expect(arr.length).toBe(3);

    arr.pop(); // one set, one delete
    expect(n).toBe(9);
    expect(arr).toEqual(["hey", 1]);
    expect(arr.length).toBe(2);

    arr.shift(); // 2 sets, 1 delete
    expect(n).toBe(12);
    expect(arr).toEqual([1]);
    expect(arr.length).toBe(1);
  });

  test("object pushed into arrays are observed", () => {
    let n = 0;
    const arr: any = reactive([], () => n++);

    arr.push({ kriek: 5 });
    expect(n).toBe(1);

    arr[0].kriek = 6;

    expect(n).toBe(2);
  });

  test("set new property on observed object", async () => {
    let n = 0;
    const state = reactive({}, () => n++) as any;

    expect(n).toBe(0);
    state.b = 8;

    expect(n).toBe(1);
    expect(state.b).toBe(8);
  });

  test("delete property from observed object", async () => {
    let n = 0;
    const obj = reactive({ a: 1, b: 8 }, () => n++) as any;
    expect(n).toBe(0);

    delete obj.b;
    expect(n).toBe(1);
    expect(obj).toEqual({ a: 1 });
  });

  test("set element in observed array", async () => {
    let n = 0;
    const arr = reactive(["a"], () => n++);

    arr[1] = "b";
    expect(n).toBe(1);
    expect(arr).toEqual(["a", "b"]);
  });

  test("properly observe arrays in object", () => {
    let n = 0;
    const obj = reactive({ arr: [] }, () => n++) as any;

    expect(obj.arr.length).toBe(0);

    obj.arr.push(1);
    expect(n).toBe(1);
    expect(obj.arr.length).toBe(1);
  });

  test("properly observe objects in array", () => {
    let n = 0;
    const obj = reactive({ arr: [{ something: 1 }] }, () => n++) as any;
    expect(n).toBe(0);

    obj.arr[0].something = 2;
    expect(n).toBe(1);
    expect(obj.arr[0].something).toBe(2);
  });

  test("properly observe objects in object", () => {
    let n = 0;
    const obj = reactive({ a: { b: 1 } }, () => n++) as any;
    expect(n).toBe(0);

    obj.a.b = 2;
    expect(n).toBe(1);
  });

  test("reobserve new object values", () => {
    let n = 0;
    const obj = reactive({ a: 1 }, () => n++) as any;
    expect(n).toBe(0);

    obj.a = { b: 2 };
    expect(n).toBe(1);

    obj.a.b = 3;
    expect(n).toBe(2);
  });

  test("deep observe misc changes", () => {
    let n = 0;
    const obj = reactive({ o: { a: 1 }, arr: [1], n: 13 }, () => n++) as any;
    expect(n).toBe(0);

    obj.o.a = 2;
    expect(n).toBe(1);

    obj.arr.push(2);
    expect(n).toBe(2);

    obj.n = 155;
    expect(n).toBe(3);
  });

  test.skip("properly handle already observed state", () => {
    let n1 = 0;
    let n2 = 0;
    const obj1 = reactive({ a: 1 }, () => n1++) as any;
    const obj2 = reactive({ b: 1 }, () => n2++) as any;

    obj1.a = 2;
    obj2.b = 3;
    expect(n1).toBe(1);
    expect(n2).toBe(1);

    obj2.b = obj1;
    expect(n1).toBe(1);
    expect(n2).toBe(2);

    obj1.a = 33;
    expect(n1).toBe(2);
    // TODO: make this one work...
    expect(n2).toBe(3);
  });

  test("can set a property more than once", () => {
    let n = 0;
    const obj = reactive({}, () => n++) as any;

    obj.aku = "always finds annoying problems";
    expect(n).toBe(1);

    obj.aku = "always finds good problems";
    expect(n).toBe(2);
  });

  test.skip("properly handle swapping elements", () => {
    let n = 0;
    const obj = reactive({ a: { arr: [] }, b: 1 }, () => n++) as any;

    // swap a and b
    const b = obj.b;
    obj.b = obj.a;
    obj.a = b;
    expect(n).toBe(2);

    // push something into array to make sure it works
    obj.b.arr.push("blanche");
    expect(n).toBe(3);
  });

  test("properly handle assigning observed obj containing array", () => {
    let n = 0;
    const obj = reactive({ a: { arr: [], val: "test" } }, () => n++) as any;

    expect(n).toBe(0);
    obj.a = { ...obj.a, val: "test2" };
    expect(n).toBe(1);

    // push something into array to make sure it works
    obj.a.arr.push("blanche");
    expect(n).toBe(2);
  });

  test("accept cycles in observed state", () => {
    let n = 0;
    let obj1: any = {};
    let obj2: any = { b: obj1, key: 1 };
    obj1.a = obj2;
    obj1 = reactive(obj1, () => n++) as any;
    obj2 = obj1.a;
    expect(n).toBe(0);

    obj2.key = 3;
    expect(n).toBe(1);
  });
});
