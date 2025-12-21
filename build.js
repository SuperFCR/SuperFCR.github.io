const fs = require('fs-extra');
const Handlebars = require('handlebars');
const path = require('path');

console.log("📖 Reading configuration...");
const data = JSON.parse(fs.readFileSync('./config/data.json', 'utf8'));
const templateSource = fs.readFileSync('./templates/index.html', 'utf8');

const scholarPath = './config/scholar_data.json';
if (fs.existsSync(scholarPath)) {
    try {
        const sData = JSON.parse(fs.readFileSync(scholarPath, 'utf8'));
        if (sData.citedby) data.personal.citations = sData.citedby;
    } catch (e) { console.error("Error reading scholar data", e); }
}

const githubPath = './config/github_data.json';
if (fs.existsSync(githubPath)) {
    try {
        console.log("⭐️ Injecting GitHub stars...");
        const starsMap = JSON.parse(fs.readFileSync(githubPath, 'utf8'));
        
        for (const category in data.projects) {
            data.projects[category].forEach(project => {
                if (project.links) {
                    project.links.forEach(link => {
                        if (starsMap[link.url]) {
                            link.stars = starsMap[link.url]; 
                        }
                    });
                }
            });
        }
    } catch (e) { console.error("Error reading github data", e); }
}

Handlebars.registerHelper('breaklines', function(text) {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new Handlebars.SafeString(text);
});

console.log("🔨 Compiling template...");
const template = Handlebars.compile(templateSource);
const html = template(data);

fs.writeFileSync('./index.html', html);
console.log("✅ Homepage generated successfully!");