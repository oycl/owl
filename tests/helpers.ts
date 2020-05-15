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
