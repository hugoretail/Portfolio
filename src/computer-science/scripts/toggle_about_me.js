document.getElementById('toggle-about-me').addEventListener('click', function() {
  const aboutMeDescription = document.getElementById('about-me-description');
  
  if (aboutMeDescription.classList.contains('collapsed')) {
    aboutMeDescription.classList.remove('collapsed');
    aboutMeDescription.style.maxHeight = aboutMeDescription.scrollHeight + 'px';
  } else {
    aboutMeDescription.classList.add('collapsed');
    aboutMeDescription.style.maxHeight = '60px';
  }
});