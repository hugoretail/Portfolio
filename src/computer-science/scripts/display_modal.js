const images = document.querySelectorAll('img[data-modal="true"]');

const modal = document.createElement('div');
modal.classList.add('modal');

const closeModalButton = document.createElement('span');
closeModalButton.textContent = 'x';
closeModalButton.classList.add('close-modal');
modal.appendChild(closeModalButton);

const modalImage = document.createElement('img');
modal.appendChild(modalImage);

document.body.appendChild(modal);

images.forEach(image => {
    image.addEventListener('click', (e) => {
        modalImage.src = e.target.src;
        modal.style.display = 'flex';
    });
});

closeModalButton.addEventListener('click', () => {
    modal.style.display = 'none';
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        modal.style.display = 'none';
    }
});