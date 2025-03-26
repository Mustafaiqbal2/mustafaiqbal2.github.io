document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    
    // Check for saved theme preference or use system preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && 
                       localStorage.getItem('darkMode') === null);
    
    // Apply initial theme
    applyTheme(isDarkMode);
    
    // Toggle dark mode
    darkModeToggle.addEventListener('click', () => {
        const isCurrentlyDark = body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', (!isCurrentlyDark).toString());
        applyTheme(!isCurrentlyDark);
    });
    
    // Function to apply theme
    function applyTheme(isDarkMode) {
        if (isDarkMode) {
            body.classList.add('dark-mode');
            body.classList.remove('light-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            console.log('Dark mode applied');
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            console.log('Light mode applied');
        }
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('darkMode') === null) {
            applyTheme(e.matches);
        }
    });
    
    // For debugging
    console.log('Dark mode initialized. Current state:', isDarkMode);
});