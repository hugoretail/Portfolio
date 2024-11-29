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
            if (descElement) descElement.textContent = translations[`${baseId}-description`] || descElement.textContent;
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