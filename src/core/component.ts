import { VTree } from "./rendering_engine";

export class Component<Props = any, Env = any> {
  static template: string;
  props: Props;
  env: Env;

  el: HTMLElement | Text | Comment | null = null;
  __owl__: VTree | null = null;

  constructor(props: Props, env: Env) {
    this.props = props;
    this.env = env;
  }
}
