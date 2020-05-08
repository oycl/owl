import { reactive } from "./reactive";
import { shared } from "./component";
import { render } from "./component";

export function useState<T>(state: T): T {
  let root = shared.currentVTree!;
  return reactive(state, () => render(root));
}
