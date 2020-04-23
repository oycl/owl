import { Fiber } from "./fiber";

interface Task {
  fiber: Fiber;
  callback: (err?: Error) => void;
}

export const scheduler = {
  tasks: {} as { [id: number]: Task },
  isRunning: false,
  taskCount: 0,

  start() {
    this.isRunning = true;
    this.scheduleTasks();
  },

  stop() {
    this.isRunning = false;
  },

  addFiber(fiber: Fiber): Promise<void> {
    // if the fiber was remapped into a larger rendering fiber, it may not be a
    // root fiber.  But we only want to register root fibers
    fiber = fiber.root;
    return new Promise((resolve, reject) => {
      // if (fiber.error) {
      //   return reject(fiber.error);
      // }
      this.taskCount++;
      this.tasks[fiber.id] = {
        fiber,
        callback: () => {
          // if (fiber.error) {
          //   return reject(fiber.error);
          // }
          resolve();
        },
      };
      if (!this.isRunning) {
        this.start();
      }
    });
  },
  /**
   * Process all current tasks. This only applies to the fibers that are ready.
   * Other tasks are left unchanged.
   */
  flush() {
    for (let id in this.tasks) {
      let task = this.tasks[id];
      if (task.fiber.isCompleted) {
        task.callback();
        delete this.tasks[id];
        this.taskCount--;
      }
      if (task.fiber.counter === 0) {
        task.callback();
        delete this.tasks[id];
      }
    }
    if (this.taskCount === 0) {
      this.stop();
    }
  },

  scheduleTasks() {
    requestAnimationFrame(() => {
      this.flush();
      if (this.isRunning) {
        this.scheduleTasks();
      }
    });
  },
};
