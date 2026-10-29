const fs = require('fs');

const files = [
  'js/physics.js',
  'js/controller.js',
  'js/renderer.js',
  'js/stepManager.js',
  'js/main.js'
];

let hasError = false;
files.forEach(f => {
  try {
    const code = fs.readFileSync(f, 'utf8');
    new Function(code);
    console.log('✓', f);
  } catch (e) {
    hasError = true;
    console.error('✗', f, e.message);
  }
});

if (hasError) {
  process.exit(1);
} else {
  console.log('ALL JS FILES SYNTAX OK');
}

