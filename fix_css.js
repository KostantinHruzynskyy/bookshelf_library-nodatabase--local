const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'public', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Fix the broken line 157
const broken = `.shelf::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: 4px;
  right: 4px;
  height: 10px;
  backgrou`;

const fixed = `.shelf::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: 4px;
  right: 4px;
  height: 10px;
  background: linear-gradient(180deg, #5c3717 0%, #3d2410 100%);
  border-radius: 0 0 4px 4px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}`;

css = css.replace(broken, fixed);

fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ Fixed broken CSS line!');