import { gsap } from "https://cdn.skypack.dev/gsap";

export class PanelManager {
  constructor(root) {
    this.root = root;
    this.activeId = null;
  }

  render(data) {
    if (!data) {
      this.renderPlaceholder();
      return;
    }

    if (this.activeId === data.id) {
      return;
    }

    this.activeId = data.id;
    const section = document.createElement("section");
    section.className = `panel panel--${data.theme}`;
    section.innerHTML = `
      <div class="panel__header">
        ${data.eyebrow ? `<p class="panel__eyebrow">${data.eyebrow}</p>` : ""}
        <h2>${data.title}</h2>
        ${data.intro ? `<p class="panel__intro">${data.intro}</p>` : ""}
      </div>
      ${this.renderHighlights(data.highlights)}
      ${this.renderProjects(data.projects)}
      ${this.renderTimeline(data.timeline)}
      ${this.renderLinks(data.links)}
    `;

    this.root.innerHTML = "";
    this.root.appendChild(section);
    this.animatePanel(section, data.theme);
  }

  renderPlaceholder() {
    this.root.innerHTML = `
      <section class="panel panel--placeholder">
        <h2>Choisis une station</h2>
        <p>Chaque objet 3D révèle une partie de mon travail.</p>
      </section>
    `;
  }

  renderHighlights(items = []) {
    if (!items.length) return "";
    const chips = items
      .map(
        (item) => `
        <article class="panel__chip">
          <strong>${item.label}</strong>
          <span>${item.value}</span>
        </article>
      `
      )
      .join("");
    return `<div class="panel__grid">${chips}</div>`;
  }

  renderProjects(list = []) {
    if (!list.length) return "";
    const cards = list
      .map(
        (project) => `
        <article class="project-card">
          <h3>${project.title}</h3>
          <p>${project.description}</p>
          ${
            project.tags && project.tags.length
              ? `<div class="project-card__tags">${project.tags
                  .map((tag) => `<span>${tag}</span>`)
                  .join("")}</div>`
              : ""
          }
          ${
            project.link
              ? `<a href="${project.link.url}" target="_blank" rel="noopener">${project.link.label}</a>`
              : ""
          }
        </article>
      `
      )
      .join("");
    return `<div class="project-list">${cards}</div>`;
  }

  renderTimeline(rows = []) {
    if (!rows.length) return "";
    const html = rows
      .map(
        (row) => `
        <div class="timeline-row">
          <span>${row.year}</span>
          <p>${row.detail}</p>
        </div>
      `
      )
      .join("");
    return `<div class="panel__timeline">${html}</div>`;
  }

  renderLinks(links = []) {
    if (!links.length) return "";
    const html = links
      .map(
        (link) => `
        <a class="hud__chip" href="${link.url}" target="_blank" rel="noopener">${link.label}</a>
      `
      )
      .join("");
    return `<div class="panel__links">${html}</div>`;
  }

  animatePanel(node, theme) {
    const accent = this.getThemeColor(theme);
    node.style.setProperty("--panel-accent", accent);
    gsap.fromTo(
      node,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
  }

  getThemeColor(theme) {
    switch (theme) {
      case "spray":
        return "var(--accent-spray)";
      case "holo":
        return "var(--accent-teal)";
      case "signal":
        return "var(--accent-amber)";
      default:
        return "var(--accent-ink)";
    }
  }
}
