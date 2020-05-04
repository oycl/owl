export function escape(str: string | number | undefined): string {
  if (str === undefined) {
    return "";
  }
  if (typeof str === "number") {
    return String(str);
  }
  const p = document.createElement("p");
  p.textContent = str;
  return p.innerHTML;
}
