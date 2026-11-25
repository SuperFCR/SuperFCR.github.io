const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs-extra');
const Handlebars = require('handlebars');
const path = require('path');
const sharp = require('sharp');
const cheerio = require('cheerio');

const ROOT = __dirname;
const fromRoot = (...parts) => path.join(ROOT, ...parts);

const pages = [
    { localeFile: 'en.json', outputFile: 'index.html' },
    { localeFile: 'zh-CN.json', outputFile: path.join('zh', 'index.html') }
];

// Project figures are shown at 220×135 (full width on phones) and the avatar at
// 280px, so twice those widths keeps them sharp on high-density screens.
const THUMB_DIR = 'assets/thumbs';
const THUMB_QUALITY = 82;
const PROJECT_THUMB_WIDTH = 880;
const AVATAR_THUMB_WIDTH = 560;

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

// Brand icons come from Simple Icons (CC0) and the envelope from Material Icons
// (Apache 2.0); the RedNote book and the CV mark are drawn for this site.
const icons = Object.fromEntries(
    fs.readdirSync(fromRoot('templates/icons')).map((file) => [
        path.parse(file).name,
        fs.readFileSync(fromRoot('templates/icons', file), 'utf8').trim()
    ])
);

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

// Thumbnail names carry a hash of the source and settings, so replacing a figure
// produces a new file instead of reusing a stale one.
const thumbnails = new Map();
const makeThumbnail = async (source, width) => {
    const input = fs.readFileSync(fromRoot(source));
    const hash = crypto.createHash('sha1')
        .update(input)
        .update(`${width}:${THUMB_QUALITY}`)
        .digest('hex')
        .slice(0, 10);
    const name = path.parse(source).name.replace(/[^A-Za-z0-9_-]/g, '_');
    const output = path.posix.join(THUMB_DIR, `${name}-${hash}.webp`);
    if (!fs.existsSync(fromRoot(output))) {
        await sharp(input)
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: THUMB_QUALITY, effort: 6 })
            .toFile(fromRoot(output));
    }
    const { width: thumbWidth, height: thumbHeight } = await sharp(fromRoot(output)).metadata();
    thumbnails.set(source, { src: `./${output}`, width: thumbWidth, height: thumbHeight });
};

const buildThumbnails = async () => {
    fs.ensureDirSync(fromRoot(THUMB_DIR));
    const projectImages = new Set(
        Object.values(baseData.projects).flat().map((project) => project.image).filter(Boolean)
    );
    await Promise.all([
        ...Array.from(projectImages, (image) => makeThumbnail(image, PROJECT_THUMB_WIDTH)),
        makeThumbnail(baseData.personal.profileImage, AVATAR_THUMB_WIDTH)
    ]);
    const used = new Set(Array.from(thumbnails.values(), (thumb) => path.posix.basename(thumb.src)));
    for (const file of fs.readdirSync(fromRoot(THUMB_DIR))) {
        if (!used.has(file)) fs.removeSync(fromRoot(THUMB_DIR, file));
    }
};

// "Last updated" follows the last commit that changed page content, not the
// daily Scholar/GitHub refresh.
const contentDate = (() => {
    try {
        const committed = execFileSync(
            'git',
            ['log', '-1', '--format=%cI', '--', 'config/data.json', 'config/locales', 'templates'],
            { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
        ).trim();
        if (committed) return new Date(committed);
    } catch (error) {
        // Fall through to the build date when git history is unavailable.
    }
    console.warn('⚠️ No git history for page content; using the build date for "Last updated".');
    return new Date();
})();

// The homepage lists the newest blog posts, read from the blog index so a new
// post only has to be added there. Entries are already ordered newest first.
const LATEST_POST_COUNT = 3;
const latestPosts = (() => {
    const indexPath = fromRoot('blogs', 'index.html');
    if (!fs.existsSync(indexPath)) return [];
    const $ = cheerio.load(fs.readFileSync(indexPath, 'utf8'));
    return $('article.post-entry').slice(0, LATEST_POST_COUNT).map((_, element) => {
        const entry = $(element);
        const href = entry.find('a.entry-link').attr('href') || '';
        const slug = href.replace(/^\.\//, '').replace(/\/$/, '');
        const date = new Date(entry.find('.entry-footer span').first().text().trim());
        if (!slug || Number.isNaN(date.getTime())) {
            throw new Error(`Cannot read blog entry: ${href || entry.find('h2').text()}`);
        }
        return {
            slug,
            title: entry.find('.entry-header h2').text().trim(),
            typeKey: entry.attr('data-type'),
            typeLabel: entry.find('.post-type').first().text().trim(),
            date,
            hasChinese: fs.existsSync(fromRoot('blogs', slug, 'zh', 'index.html'))
        };
    }).get();
})();

const localeConfigs = pages.map((page) => readJson(path.join('config', 'locales', page.localeFile)));
const pageUrl = (localeConfig) => new URL(localeConfig.locale.path, baseData.site.url).href;
const englishUrl = pageUrl(localeConfigs.find((config) => !config.locale.isChinese));
const chineseUrl = pageUrl(localeConfigs.find((config) => config.locale.isChinese));

const preparePageData = (localeConfig, profileImageSize) => {
    const data = mergeLocale(baseData, localeConfig.content || {});
    data.locale = localeConfig.locale;
    data.meta = localeConfig.meta;
    data.ui = localeConfig.ui;

    data.site = {
        ...data.site,
        pageUrl: pageUrl(localeConfig),
        englishUrl,
        chineseUrl,
        image: { url: new URL(data.personal.profileImage, data.site.url).href, ...profileImageSize }
    };
    data.personal.avatar = thumbnails.get(data.personal.profileImage);
    data.icons = icons;
    data.personal.social = (data.personal.social || []).map((item) => {
        if (!icons[item.type] || !(item.url || item.qr)) {
            throw new Error(`Social entry needs a known type and a url or qr: ${JSON.stringify(item)}`);
        }
        return {
            ...item,
            icon: icons[item.type],
            label: data.ui.socialLabels?.[item.type] || item.type,
            caption: data.ui.socialQrCaptions?.[item.type],
            accountLabel: data.ui.socialAccountLabels?.[item.type]
        };
    });
    const timeZone = data.personal.timeZone;
    data.footer.lastUpdated = new Intl.DateTimeFormat(data.locale.dateTimeLocale, {
        year: 'numeric', month: 'long', timeZone
    }).format(contentDate);
    data.footer.copyrightYear = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone }).format(contentDate);
    data.jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: data.personal.name,
        alternateName: data.personal.nameChinese,
        url: englishUrl,
        image: data.site.image.url,
        email: `mailto:${data.personal.email}`,
        jobTitle: data.personal.title,
        affiliation: { '@type': 'CollegeOrUniversity', name: data.personal.university },
        sameAs: [data.personal.googleScholar, data.personal.github].filter(Boolean)
    }).replace(/</g, '\\u003c');

    for (const projects of Object.values(data.projects)) {
        for (const project of projects) {
            project.thumb = thumbnails.get(project.image);
            for (const link of project.links || []) {
                if (Object.prototype.hasOwnProperty.call(starsMap, link.url)) {
                    link.stars = starsMap[link.url];
                }
                link.label = data.ui.resourceLabels[link.type] || link.type;
            }
        }
    }

    const showcaseIds = data.projectShowcaseIds || [];
    if (new Set(showcaseIds).size !== showcaseIds.length) {
        throw new Error('Duplicate projectShowcaseIds');
    }
    const selectedIds = data.selectedPaperIds || [];
    const selectedIdSet = new Set(selectedIds);
    if (selectedIdSet.size !== selectedIds.length) {
        throw new Error('Duplicate selectedPaperIds');
    }
    const allProjects = new Map();
    data.projectGroups = data.projectCategories.map((category) => {
        const items = (data.projects[category.key] || []).map((project) => {
            const item = {
                ...project,
                analyticsArea: category.analyticsArea,
                isSelected: selectedIdSet.has(project.analyticsId)
            };
            allProjects.set(item.analyticsId, item);
            return item;
        });
        return {
            ...category,
            label: data.ui.projectGroupLabels[category.key] || category.key,
            items: items.filter((item) => !showcaseIds.includes(item.analyticsId))
        };
    }).filter((group) => group.items.length);
    for (const id of selectedIds) {
        if (!allProjects.has(id) || showcaseIds.includes(id)) {
            throw new Error(`Unknown or non-paper selectedPaperId: ${id}`);
        }
    }
    data.paperCount = data.projectGroups.reduce((count, group) => count + group.items.length, 0);
    data.selectedPaperCount = selectedIds.length;
    data.defaultPaperFilter = selectedIds.length ? 'selected' : 'all';
    data.latestPosts = latestPosts.map((post) => ({
        ...post,
        url: `blogs/${post.slug}/${localeConfig.locale.isChinese && post.hasChinese ? 'zh/' : ''}`,
        isoDate: post.date.toISOString().slice(0, 10),
        dateLabel: new Intl.DateTimeFormat(localeConfig.locale.dateTimeLocale, {
            year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
        }).format(post.date)
    }));

    data.showcaseProjects = showcaseIds.map((id) => {
        const project = allProjects.get(id);
        if (!project) throw new Error(`Unknown projectShowcaseId: ${id}`);
        return project;
    });

    return data;
};

Handlebars.registerHelper('breaklines', function breaklines(text) {
    const escapedText = Handlebars.Utils.escapeExpression(text);
    return new Handlebars.SafeString(escapedText.replace(/(\r\n|\n|\r)/gm, '<br>'));
});

const main = async () => {
    console.log('🖼️ Preparing image thumbnails...');
    await buildThumbnails();
    const { width, height } = await sharp(fromRoot(baseData.personal.profileImage)).metadata();

    console.log('🔨 Compiling localized pages...');
    const template = Handlebars.compile(templateSource);
    Handlebars.registerPartial('paper', fs.readFileSync(fromRoot('templates/partials/paper.html'), 'utf8'));

    pages.forEach((page, index) => {
        const pageData = preparePageData(localeConfigs[index], { width, height });
        const outputPath = fromRoot(page.outputFile);
        fs.ensureDirSync(path.dirname(outputPath));
        fs.writeFileSync(outputPath, template(pageData));
        console.log(`✅ ${pageData.locale.htmlLang}: ${path.relative(ROOT, outputPath)}`);
    });
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
