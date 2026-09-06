const fs = require('fs-extra');
const Handlebars = require('handlebars');
const path = require('path');

const ROOT = __dirname;
const fromRoot = (...parts) => path.join(ROOT, ...parts);

const pages = [
    { localeFile: 'en.json', outputFile: 'index.html' },
    { localeFile: 'zh-CN.json', outputFile: path.join('zh', 'index.html') }
];

const isPlainObject = (value) => value !== null
    && typeof value === 'object'
    && !Array.isArray(value);

// Locale files only contain translated fields. Arrays are merged by position,
// so links, images, authors, and other shared metadata stay in data.json.
const mergeLocale = (baseValue, localizedValue) => {
    if (localizedValue === undefined) {
        if (Array.isArray(baseValue)) return baseValue.map((item) => mergeLocale(item, undefined));
        if (isPlainObject(baseValue)) {
            return Object.fromEntries(
                Object.entries(baseValue).map(([key, value]) => [key, mergeLocale(value, undefined)])
            );
        }
        return baseValue;
    }

    if (Array.isArray(baseValue) && Array.isArray(localizedValue)) {
        const length = Math.max(baseValue.length, localizedValue.length);
        return Array.from({ length }, (_, index) => (
            mergeLocale(baseValue[index], localizedValue[index])
        ));
    }

    if (isPlainObject(baseValue) && isPlainObject(localizedValue)) {
        const keys = new Set([...Object.keys(baseValue), ...Object.keys(localizedValue)]);
        return Object.fromEntries(
            Array.from(keys, (key) => [key, mergeLocale(baseValue[key], localizedValue[key])])
        );
    }

    if (Array.isArray(localizedValue)) return localizedValue.map((item) => mergeLocale(undefined, item));
    if (isPlainObject(localizedValue)) {
        return Object.fromEntries(
            Object.entries(localizedValue).map(([key, value]) => [key, mergeLocale(undefined, value)])
        );
    }

    return localizedValue;
};

const readJson = (relativePath) => fs.readJsonSync(fromRoot(relativePath));

console.log('📖 Reading shared content and locale configuration...');
const baseData = readJson('config/data.json');
const analyticsIds = new Set();
for (const project of Object.values(baseData.projects).flat()) {
    const id = project.analyticsId;
    if (!/^[a-z][a-z0-9_]{0,79}$/.test(id || '') || analyticsIds.has(id)) {
        throw new Error(`Missing, invalid or duplicate analyticsId for ${project.title}`);
    }
    analyticsIds.add(id);
}
const templateSource = fs.readFileSync(fromRoot('templates/index.html'), 'utf8');

const scholarPath = fromRoot('config/scholar_data.json');
if (fs.existsSync(scholarPath)) {
    try {
        const scholarData = fs.readJsonSync(scholarPath);
        if (scholarData.citedby) baseData.personal.citations = scholarData.citedby;
    } catch (error) {
        console.error('Error reading scholar data:', error.message);
    }
}

let starsMap = {};
const githubPath = fromRoot('config/github_data.json');
if (fs.existsSync(githubPath)) {
    try {
        console.log('⭐️ Loading GitHub stars...');
        starsMap = fs.readJsonSync(githubPath);
    } catch (error) {
        console.error('Error reading GitHub data:', error.message);
    }
}

const preparePageData = (localeConfig) => {
    const data = mergeLocale(baseData, localeConfig.content || {});
    data.locale = localeConfig.locale;
    data.meta = localeConfig.meta;
    data.ui = localeConfig.ui;

    for (const projects of Object.values(data.projects)) {
        for (const project of projects) {
            for (const link of project.links || []) {
                if (Object.prototype.hasOwnProperty.call(starsMap, link.url)) {
                    link.stars = starsMap[link.url];
                }
                link.label = data.ui.resourceLabels[link.type] || link.type;
            }
        }
    }

    data.projectGroups = data.projectCategories.map((category) => ({
        ...category,
        label: data.ui.projectGroupLabels[category.key] || category.key,
        items: data.projects[category.key] || []
    }));

    return data;
};

Handlebars.registerHelper('breaklines', function breaklines(text) {
    const escapedText = Handlebars.Utils.escapeExpression(text);
    return new Handlebars.SafeString(escapedText.replace(/(\r\n|\n|\r)/gm, '<br>'));
});

console.log('🔨 Compiling localized pages...');
const template = Handlebars.compile(templateSource);

for (const page of pages) {
    const localeConfig = readJson(path.join('config', 'locales', page.localeFile));
    const pageData = preparePageData(localeConfig);
    const outputPath = fromRoot(page.outputFile);
    fs.ensureDirSync(path.dirname(outputPath));
    fs.writeFileSync(outputPath, template(pageData));
    console.log(`✅ ${pageData.locale.htmlLang}: ${path.relative(ROOT, outputPath)}`);
}
