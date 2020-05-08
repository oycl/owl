import { reactive } from "./reactive";
import { engine } from "./core/rendering_engine";

export function useState<T>(state: T): T {
  let root = engine.currentVTree!;
  return reactive(state, () => engine.render(root));
}
