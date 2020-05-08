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
