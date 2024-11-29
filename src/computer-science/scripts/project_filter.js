document.addEventListener('DOMContentLoaded', () => {
    const checkboxes = document.querySelectorAll('.filter-checkbox');
    const projects = document.querySelectorAll('.project');

    const updateProjects = () => {
        const selectedCheckbox = Array.from(checkboxes).find(cb => cb.checked);

        if (!selectedCheckbox) {
            // If no filter is selected, show all projects
            projects.forEach(project => project.style.display = 'block');
        } else {
            // Show only projects matching the selected filter
            const selectedTag = selectedCheckbox.value;
            projects.forEach(project => {
                const projectTags = project.getAttribute('data-tags').split(' ');
                project.style.display = projectTags.includes(selectedTag) ? 'block' : 'none';
            });
        }
    };

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Uncheck all other checkboxes when one is selected
            checkboxes.forEach(cb => {
                if (cb !== checkbox) cb.checked = false;
            });

            updateProjects();
        });
    });

    // Initialize the project view on page load
    updateProjects();
});

document.getElementById('toggle-filters').addEventListener('click', () => {
    const filterContainer = document.getElementById('filter-container');
    const isHidden = filterContainer.style.display === 'none';
    
    filterContainer.style.display = isHidden ? 'flex' : 'none';

    document.getElementById('toggle-filters').textContent = isHidden ? 'Hide Filters' : 'Show Filters';
});