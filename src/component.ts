import { VTree } from "./core";

export class Component<Props = any, Env = any> {
  static template: string;
  props: Props;

  el: HTMLElement | Text | Comment | null = null;
  __vtree: VTree | null = null;

  constructor(props: Props) {
    this.props = props;
  }
}
