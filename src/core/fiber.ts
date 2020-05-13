/**
 * Make this a simple object???
 */

export class Fiber {
  static nextId: number = 1;

  id = Fiber.nextId++;
  root: Fiber;
  isCompleted: boolean = false;
  counter: number = 0;

  constructor(parent: Fiber | null) {
    this.root = parent || this;
  }
}
