const themeClassMap = {
    spray: "panel--spray",
    holo: "panel--holo",
    ink: "panel--ink"
};

export class PanelManager {
    constructor(root) {
        this.root = root;
        this.currentId = null;
    }

    show(node) {
        if (!node || node.id === this.currentId) return;
        this.currentId = node.id;
        const section = document.createElement("section");
        section.className = `panel ${themeClassMap[node.vignette] || ""}`.trim();
        section.innerHTML = this.#buildMarkup(node);
        this.root.replaceChildren(section);
        requestAnimationFrame(() => section.classList.add("revealed"));
    }

    #buildMarkup(node) {
        const chips = (node.chips || [])
            .map(chip => `<span class="panel__chip">${chip}</span>`)
            .join("");

        const projects = (node.projects || [])
            .map(project => `
                <article class="project-card">
                    <h3>${project.title}</h3>
                    <p><strong>${project.role}</strong></p>
                    <p>${project.desc}</p>
                    <p class="project-card__stack">${project.stack}</p>
                    ${project.link ? `<a href="${project.link}" target="_blank" rel="noreferrer">Explore</a>` : ""}
                </article>
            `)
            .join("");

        const projectsBlock = projects
            ? `<div class="panel__projects">${projects}</div>`
            : "<p>Fresh work coming soon. I'm sketching the next wall.</p>";

        return `
            <div class="panel__header">
                <p class="eyebrow">${node.label}</p>
                <h2>${node.summary}</h2>
            </div>
            <div class="panel__chips">${chips}</div>
            <p>${node.body}</p>
            ${projectsBlock}
        `;
    }
}
