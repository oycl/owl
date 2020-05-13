import { MountTarget, MountOptions } from "../src/core/rendering_engine";
import { Component, mount } from "../src/index";

// modifies scheduler to make it faster to test components
window.requestAnimationFrame = function (callback: FrameRequestCallback) {
  setTimeout(callback, 1);
  return 1;
};

export function makeTestFixture() {
  let fixture = document.createElement("div");
  document.body.appendChild(fixture);
  return fixture;
}

export async function nextTick(): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(() => window.requestAnimationFrame(() => resolve()));
  });
}

export async function mountComponent(
  fixture: MountTarget,
  C: typeof Component,
  options?: MountOptions
): Promise<Component> {
  const c = await mount(fixture, C, options);
  return c.context;
}
