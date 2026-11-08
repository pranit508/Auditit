import { escapeHtml } from "./html.js";

export function renderInfoTooltip(id, message) {
  return `
    <span class="info-tooltip-wrap">
      <button type="button" class="info-tooltip-button" aria-label="More information" aria-expanded="false" aria-controls="${escapeHtml(id)}">i</button>
      <span id="${escapeHtml(id)}" class="info-tooltip" role="tooltip">${escapeHtml(message)}</span>
    </span>
  `;
}

export function bindInfoTooltipEvents(container) {
  if (!container || typeof container.addEventListener !== "function" || !container.dataset) return;

  const closeOpenTooltips = () => {
    container.querySelectorAll(".info-tooltip-wrap.is-open").forEach((wrap) => {
      wrap.classList.remove("is-open");
      wrap.querySelector(".info-tooltip-button")?.setAttribute("aria-expanded", "false");
    });
  };

  container.querySelectorAll(".info-tooltip-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const wrap = button.closest(".info-tooltip-wrap");
      const shouldOpen = !wrap.classList.contains("is-open");
      closeOpenTooltips();
      if (shouldOpen) {
        wrap.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });

  if (container.dataset.infoTooltipHandlersBound === "true") return;
  container.dataset.infoTooltipHandlersBound = "true";

  container.addEventListener("click", (event) => {
    if (!event.target.closest(".info-tooltip-wrap")) closeOpenTooltips();
  });

  container.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeOpenTooltips();
  });
}
