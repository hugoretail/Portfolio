const loadTranslations = (selectedLanguage = 'en') => {
    fetch(`../../../assets/translation/${selectedLanguage}/${selectedLanguage}-computer-science.json`)
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
    })
    .then(translations => {
        const navigationElements = [
            "menu-index", "menu-about", "menu-skills", 
            "menu-projects", "menu-contact"
        ];
        navigationElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = translations[id] || element.textContent;
        });

        const mainElements = [
            "main-heading", "about-me", "about-me-description",
            "skills-heading", "projects-heading", "toggle-filters"
        ];
        mainElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = translations[id] || element.textContent;
        });

        const skillElements = [
            { id: "skill-database", text: "strong", childId: "database-skills" },
            { id: "database-relational", text: "text" },
            { id: "database-object", text: "text" },
            { id: "database-sgbd", text: "text" },
            
            { id: "skill-project-management", text: "strong" },
            { id: "project-management-clean-code", text: "text" },
            { id: "project-management-v-model", text: "text" },
            { id: "project-management-agile", text: "text" },
            { id: "project-management-tools", text: "text" },
            
            { id: "skill-deployment-tools", text: "strong" },
            { id: "deployment-github-actions", text: "text" },
            { id: "deployment-gitlab", text: "text" },
            
            { id: "skill-frameworks", text: "strong" },
            { id: "framework-bootstrap", text: "text" },
            { id: "framework-symfony", text: "text" },
            
            { id: "skill-ci-cd", text: "strong" },
            { id: "ci-cd-formal-methods", text: "text" },
            { id: "ci-cd-quality", text: "text" },
            { id: "ci-cd-testing", text: "text" },
            
            { id: "skill-modeling", text: "strong" },
            { id: "modeling-entity-diagram", text: "text" },
            { id: "modeling-uml", text: "text" },
            
            { id: "skill-programming-languages", text: "strong" },
            { id: "programming-system", text: "text" },
            { id: "programming-object-oriented", text: "text" },
            { id: "programming-web-dev", text: "text" },
            { id: "programming-scripting", text: "text" },
            
            { id: "skill-development-tools", text: "strong" },
            
            { id: "skill-oop", text: "strong" },
            { id: "oop-principles", text: "text" },
            { id: "oop-mvc", text: "text" },
            { id: "oop-design-patterns", text: "text" },
            
            { id: "skill-networks", text: "strong" },
            { id: "network-protocols", text: "text" },
            { id: "network-http", text: "text" },
            { id: "network-routing", text: "text" },
            { id: "network-osi", text: "text" },
            
            { id: "skill-operating-systems", text: "strong" },
            
            { id: "skill-testing", text: "strong" },
            { id: "testing-junit", text: "text" },
            { id: "testing-methodology", text: "text" },
            { id: "testing-static-analysis", text: "text" }
        ];

        skillElements.forEach(element => {
            const skillElement = document.getElementById(element.id);
            if (skillElement) {
                const translationKey = element.id;
                if (element.text === "strong") {
                    const strongElement = skillElement.querySelector('strong');
                    if (strongElement) {
                        strongElement.textContent = translations[translationKey] || strongElement.textContent;
                    }
                } else if (element.text === "text") {
                    skillElement.textContent = translations[translationKey] || skillElement.textContent;
                }
            }
        });

        const filterLabels = [
            { filterKey: "filter-ai", translationKey: "filter-ai" },
            { filterKey: "filter-web", translationKey: "filter-web" },
            { filterKey: "filter-networks", translationKey: "filter-networks" },
            { filterKey: "filter-games", translationKey: "filter-games" },
            { filterKey: "filter-data", translationKey: "filter-data" },
            { filterKey: "filter-devops", translationKey: "filter-devops" },
            { filterKey: "filter-cloud", translationKey: "filter-cloud" }
        ];
        filterLabels.forEach(({ filterKey, translationKey }) => {
            const checkbox = document.getElementById(filterKey);
            if (checkbox) {
                const label = checkbox.closest('label');
                if (label) label.textContent = translations[translationKey] || label.textContent;
            }
        });

        const projectElements = [
            "project-japanese-conjugator", 
            "project-labyrinth-update", 
            "project-anhydralgo", 
            "project-network-installation", 
            "project-graffiting-streets", 
            "project-towa-ai"
        ];
        projectElements.forEach(baseId => {
            const titleElement = document.getElementById(`${baseId}-title`);
            const descElement = document.getElementById(`${baseId}-description`);
            
            if (titleElement) titleElement.textContent = translations[`${baseId}-title`] || titleElement.textContent;
            if (descElement) descElement.innerHTML = translations[`${baseId}-description`] || descElement.innerHTML;
        });

        const contactElements = [
            "contact-heading", "contact-intro", 
            "contact-email", "contact-linkedin", 
            "contact-github", "contact-phone", 
            "contact-outro"
        ];
        contactElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (["contact-email", "contact-linkedin", "contact-github", "contact-phone"].includes(id)) {
                    const strongElement = element.querySelector('strong');
                    if (strongElement) strongElement.textContent = translations[id] || strongElement.textContent;
                } else {
                    element.textContent = translations[id] || element.textContent;
                }
            }
        });

        const footerElement = document.getElementById("footer-copyright");
        if (footerElement) footerElement.textContent = translations["footer-copyright"] || footerElement.textContent;
    })
    .catch(err => {
        console.error("Error loading translations:", err);
        if (selectedLanguage !== 'en') {
            loadTranslations("en");
        }
    });
};

const initializeLanguage = () => {
    const selectedLanguage = sessionStorage.getItem("selectedLanguage") || 'en';
    document.documentElement.lang = selectedLanguage;
    loadTranslations(selectedLanguage);
};

document.addEventListener('DOMContentLoaded', initializeLanguage);