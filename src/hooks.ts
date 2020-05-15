import { reactive } from "./reactive";
import { core, render } from "./core/rendering_engine";

export function useState<T>(state: T): T {
  let component = core.current!;
  return reactive(state, () => render(component));
}
