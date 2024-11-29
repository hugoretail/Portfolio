document.addEventListener('DOMContentLoaded', () => {
    const headers = document.querySelectorAll('.skill-header');

    headers.forEach(header => {
        header.addEventListener('click', (event) => {
            const details = header.closest('li').querySelector('.skill-details');
            const toggleButton = header.querySelector('.toggle-skill');
            if (details.classList.contains('hidden')) {
                details.classList.remove('hidden');
                toggleButton.textContent = '▲';
            } else {
                details.classList.add('hidden');
                toggleButton.textContent = '▼';
            }
        });
    });
});