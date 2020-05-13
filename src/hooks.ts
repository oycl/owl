import { reactive } from "./reactive";
import { engine } from "./core/rendering_engine";

export function useState<T>(state: T): T {
  let component = engine.current!;
  return reactive(state, () => engine.render(component));
}
