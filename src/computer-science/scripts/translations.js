const loadTranslations = (selectedLanguage) => {
    fetch(`../../../assets/translation/${selectedLanguage}/cumputer-science.json`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(translations => {
            // TO DO
        })
        .catch(err => {
            console.error("Error loading translations:", err);
            loadTranslations("en");
        });
};


const selectedLanguage = sessionStorage.getItem("selectedLanguage") || 'en';
document.documentElement.lang = selectedLanguage;

loadTranslations();