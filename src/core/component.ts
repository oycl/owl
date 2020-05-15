import { FComponent, CComponent, OwlElement, render } from "./rendering_engine";

export class Component<Props = any, Env = any> {
  static template: string;
  static components: { [key: string]: FComponent | CComponent } = {};
  props: Props;
  env: Env;

  el: HTMLElement | Text | Comment | null = null;
  __owl__: OwlElement | null = null;

  constructor(props: Props, env: Env) {
    this.props = props;
    this.env = env;
  }

  render(): Promise<void> {
    return render(this.__owl__!);
  }
}
