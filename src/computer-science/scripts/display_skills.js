document.addEventListener('DOMContentLoaded', () => {
    const toggles = document.querySelectorAll('.toggle-skill');

    toggles.forEach(toggle => {
        toggle.addEventListener('click', (event) => {
            const details = event.target.nextElementSibling;
            if (details.classList.contains('hidden')) {
                details.classList.remove('hidden');
                event.target.textContent = '▲'; 
            } else {
                details.classList.add('hidden');
                event.target.textContent = '▼';
            }
        });
    });
});
