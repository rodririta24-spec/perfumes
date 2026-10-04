export function renderCollection(view, api, mode) {
  view.dataset.screen = mode;
  view.innerHTML = `<p>${api.perfumes.filter((p) => p.status === mode).length} perfumes</p>`;
}
