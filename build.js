const fs = require('fs-extra');
const Handlebars = require('handlebars');
const path = require('path');

const data = JSON.parse(fs.readFileSync('./config/data.json', 'utf8'));
const templateSource = fs.readFileSync('./templates/index.html', 'utf8');

Handlebars.registerHelper('breaklines', function(text) {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new Handlebars.SafeString(text);
});

const template = Handlebars.compile(templateSource);

const html = template(data);

fs.writeFileSync('./index.html', html);

console.log("✅ Homepage generated successfully! ");
console.log("📄 Output: index.html");