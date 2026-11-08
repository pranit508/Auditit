// For text nodes and quoted HTML attributes only; not scripts, CSS, or URL validation.
// Escape at the rendering boundary so stored/edited invoice values stay unchanged.
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
