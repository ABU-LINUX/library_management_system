const fs = require('fs');
let file = fs.readFileSync('frontend/static/js/dashboard.js', 'utf8');

file = file.replace(/< form id = "registerForm" >/g, '');
file = file.replace(/< div class="profile-info" >/g, '<div class="profile-info">');
file = file.replace(/<\/ div >/g, '</div>');

fs.writeFileSync('frontend/static/js/dashboard.js', file);
