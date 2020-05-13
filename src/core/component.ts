import { OwlComponent, ComponentData } from "./rendering_engine";

export class Component<Props = any, Env = any> {
  static template: string;
  static components: { [key: string]: OwlComponent } = {};
  props: Props;
  env: Env;

  el: HTMLElement | Text | Comment | null = null;
  __owl__: ComponentData | null = null;

  constructor(props: Props, env: Env) {
    this.props = props;
    this.env = env;
  }
}
