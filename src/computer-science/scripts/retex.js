const updateImagePaths = (selectedLanguage) => {
    const images = document.querySelectorAll('img[data-lang-path]');
    images.forEach(img => {
        const basePath = `../../assets/img/${selectedLanguage}/`;
        const fileName = img.getAttribute('data-lang-path');
        img.src = `${basePath}${fileName}`;
    });
};

const selectedLanguage = sessionStorage.getItem("selectedLanguage") || navigator.language.split('-')[0];
const supportedLanguages = ['en', 'fr', 'ja'];
const defaultLanguage = supportedLanguages.includes(selectedLanguage) ? selectedLanguage : 'en';

document.documentElement.lang = defaultLanguage;
sessionStorage.setItem("selectedLanguage", defaultLanguage);
updateImagePaths(defaultLanguage);

document.getElementById("language-select").value = defaultLanguage;

document.getElementById("language-select").addEventListener("change", () => {
    const newLanguage = document.getElementById("language-select").value;
    document.documentElement.lang = newLanguage;
    sessionStorage.setItem("selectedLanguage", newLanguage);
    updateImagePaths(newLanguage);
});