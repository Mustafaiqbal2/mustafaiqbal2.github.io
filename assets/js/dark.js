document.addEventListener('DOMContentLoaded', function() {
    // Get the toggle button and body
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    const navbar = document.getElementById('navbar');
    
    // Function to apply dark mode
    function enableDarkMode() {
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
        if (darkModeToggle) {
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        if (navbar) {
            navbar.style.backgroundColor = 'rgba(13, 27, 42, 0.95)';
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
        }
        localStorage.setItem('darkMode', 'enabled');
    }
    
    // Function to disable dark mode
    function disableDarkMode() {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        if (darkModeToggle) {
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        if (navbar) {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }
        localStorage.setItem('darkMode', 'disabled');
    }
    
    // Check for saved user preference
    const savedPreference = localStorage.getItem('darkMode');
    
    // Set the initial theme
    if (savedPreference === 'enabled') {
        enableDarkMode();
    } else if (savedPreference === 'disabled') {
        disableDarkMode();
    } else {
        // If no preference stored, use system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            enableDarkMode();
        } else {
            disableDarkMode();
        }
    }
    
    // Add click event to toggle button
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            // Check if dark mode is currently enabled
            if (body.classList.contains('dark-mode')) {
                disableDarkMode();
            } else {
                enableDarkMode();
            }
        });
    }
});