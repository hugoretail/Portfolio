const updateImagePaths = (selectedLanguage) => {
    const images = document.querySelectorAll('img[data-lang-path]');
    images.forEach(img => {
        const basePath = `https://raw.githubusercontent.com/hugoretail/Portfolio/main/assets/img/${selectedLanguage}/`;
        const fallbackBasePath = `https://raw.githubusercontent.com/hugoretail/Portfolio/main/assets/img/en/`;
        const fileName = "retex_" + img.getAttribute('data-lang-path') + "_" + selectedLanguage + ".webp";
        const fallbackFileName = "retex_" + img.getAttribute('data-lang-path') + "_en.webp";
        const imageUrl = `${basePath}${fileName}`;
        const fallbackImageUrl = `${fallbackBasePath}${fallbackFileName}`;

        fetch(imageUrl).then(response => {
            if (response.ok) {
                img.src = imageUrl;
            } else {
                img.src = fallbackImageUrl;
            }
        }).catch(() => {
            img.src = fallbackImageUrl;
        });
    });
};

const applyTheme = (theme) => {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    }
};

const selectedLanguage = sessionStorage.getItem("selectedLanguage") || navigator.language.split('-')[0];
const supportedLanguages = ['en', 'fr', 'ja'];
const defaultLanguage = supportedLanguages.includes(selectedLanguage) ? selectedLanguage : 'en';

document.documentElement.lang = defaultLanguage;
updateImagePaths(defaultLanguage);

const storedTheme = sessionStorage.getItem('theme') || 'light';
applyTheme(storedTheme);