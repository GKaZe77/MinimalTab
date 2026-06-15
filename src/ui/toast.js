const toastEl = () => document.getElementById("toast");

let _timer = null;

export function showToast(msg, ms = 2600) {
  const el = toastEl();
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(_timer);
  _timer = setTimeout(() => el.classList.remove("show"), ms);
}
