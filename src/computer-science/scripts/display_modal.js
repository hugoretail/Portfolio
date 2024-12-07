const images = document.querySelectorAll('img[data-modal="true"]');

const modal = document.createElement('div');
modal.classList.add('modal');

const modalContent = document.createElement('div');
modalContent.classList.add('modal-content');
modal.appendChild(modalContent);

const closeModalButton = document.createElement('span');
closeModalButton.textContent = 'x';
closeModalButton.classList.add('close-modal');
modalContent.appendChild(closeModalButton);

const modalImage = document.createElement('img');
modalContent.appendChild(modalImage);

const modalDescription = document.createElement('p');
modalContent.appendChild(modalDescription);

document.body.appendChild(modal);

images.forEach(image => {
    image.addEventListener('click', (e) => {
        modalImage.src = e.target.src;
        modalDescription.textContent = e.target.getAttribute('data-description');
        modal.style.display = 'flex';
        if (document.body.classList.contains('dark-mode')) {
            modalContent.classList.add('dark-mode');
            modalDescription.classList.add('dark-mode');
        } else {
            modalContent.classList.remove('dark-mode');
            modalDescription.classList.remove('dark-mode');
        }
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