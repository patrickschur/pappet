#!/usr/bin/env node
const puppeteer = require('puppeteer');
const yargs = require('yargs');
const fs = require('fs-extra');
const slugify = require('slugify');

yargs.options({
    version: {
        boolean: true,
        describe: 'Show version number',
        default: false,
    },
    help: {
        boolean: true,
        describe: 'Show help',
        default: false,
    },
    q: {
        alias: 'quit',
        boolean: true,
        describe: 'Be quit',
        default: false,
    },
    t: {
        alias: 'tabs',
        number: true,
        describe: 'Set number of pages',
        default: 2,
    },
    s: {
        alias: 'screenshot',
        boolean: true,
        describe: 'Take a screenshot',
        default: false,
    },
    p: {
        alias: 'pdf',
        boolean: true,
        describe: 'Take a PDF',
        default: false,
    },
    r: {
        alias: 'recursive',
        boolean: true,
        describe: 'Recursively visit links',
        default: false,
    },
    l: {
        alias: 'level',
        number: true,
        describe: 'Set recursion depth',
        default: 1,
    },
    w: {
        alias: 'width',
        number: true,
        describe: 'Set page width',
        default: 1920,
    },
    h: {
        alias: 'height',
        number: true,
        describe: 'Set page height',
        default: 1080,
    },
    f: {
        alias: 'full-page',
        boolean: true,
        describe: 'Take a screenshot of the full scrollable page',
        default: false,
    },
    L: {
        alias: 'relative',
        boolean: true,
        describe: 'Follow relative links only',
        default: false,
    },
    ['device-scale-factor']: {
        number: true,
        describe: 'Specify device scale factor',
        default: 1,
    },
    ['is-mobile']: {
        boolean: true,
        describe: 'Take meta viewport into account',
        default: false,
    },
    ['has-touch']: {
        boolean: true,
        describe: 'Support touch events',
        default: false,
    },
    ['is-landscape']: {
        boolean: true,
        describe: 'Set viewport in landscape mode',
        default: false,
    },
    ['https-only']: {
        boolean: true,
        describe: 'Follow HTTPS links only',
        default: false,
    },
    ['same-origin']: {
        boolean: true,
        describe: 'Only visit pages with same origin',
        default: false,
    },
    ['disable-js']: {
        boolean: true,
        describe: 'Disable javascript',
        default: false,
    },
    ['user-agent']: {
        string: true,
        describe: 'Set user agent',
    },
    ['pattern']: {
        string: true,
        describe: 'Only follow links that match the supplied regular expression',
    }
});

yargs.usage('Usage: $0 [OPTION]... [URL]...');
yargs.demandCommand().showHelpOnFail(true).wrap(yargs.terminalWidth());

const argv = yargs.argv;
const { screenshot, pdf, fullPage, width, height, recursive, userAgent, disableJs, pattern } = argv;

const options = {
    args: [
        '--incognito',
        '--no-experiments',
        '--no-pings',
        '--no-referrers',
        '--dns-prefetch-disable',
        '--disable-preconnect',
    ],
    defaultViewport: { ...argv },
};

const TABS = argv.tabs;
const log = argv.quit ? function() {} : console.log;

function findAllLinks({ sameOrigin, httpsOnly, relative, pattern }) {
    const allElements = [];

    function isAnchor(el) {
        return el.localName === 'a' && el.href !== location.href && !el.href.startsWith('mailto')  && el.href;
    }

    function isSameOrigin(el) {
        return sameOrigin ? new URL(el.href).origin === new URL(location.href).origin : true;
    }

    function isHttps(el) {
        return httpsOnly ? el.href.startsWith('https:') : true;
    }

    function isRelative(el) {
        return relative ? el.attributes.href.value.indexOf('://') < 1 && el.attributes.href.value.indexOf('//') !== 0 : true;
    }

    function isPattern(el) {
        return pattern ? new RegExp(pattern).test(el.href) : true;
    }

    function findAllLinks() {
        let links = allElements.filter(isAnchor);

        if (sameOrigin) {
            links = links.filter(isSameOrigin);
        }

        if (httpsOnly) {
            links = links.filter(isHttps);
        }

        if (relative) {
            links = links.filter(isRelative);
        }

        if (pattern) {
            links = links.filter(isPattern);
        }

        return links.map(el => el.href);
    }

    function findAllElements(elements) {
        allElements.push(...elements);
        for (const e of elements) {
            if (e.shadowRoot) {
                findAllElements(e.shadowRoot.querySelectorAll('*'));
            }
        }
    }

    findAllElements(document.querySelectorAll('*'));
    return findAllLinks(allElements);
}

async function urlToPath(url) {
    let [, ...paths] = new URL(url).href.split('/');
    paths = paths.filter(path => path).map(path => slugify(path));

    if (paths.length < 2) {
        paths.push(Math.random().toString(36).slice(2));
    }

    const dir = paths.slice(0, -1).join('/');
    await fs.ensureDir(dir);

    return paths.join('/');
}

async function openBrowser(url) {
    const browser = await puppeteer.launch(options);
    const tabs = [];

    const urls = [ url ];
    const crawledPages = [];

    let depth = 0;
    let depthMarker = 1;

    async function openTab() {
        const page = await browser.newPage();

        if (userAgent) {
            await page.setUserAgent(argv.userAgent);
        }

        if (disableJs) {
            await page.setJavaScriptEnabled(false);
        }

        while (urls.length && depth <= argv.level) {
            const url = urls.shift();

            if (crawledPages.includes(url)) {
                continue;
            }

            log(url);

            await page.goto(url);
            const path = await urlToPath(url);

            if (screenshot) {
                await page.screenshot({
                    path: `${path}.png`,
                    type: 'png',
                    fullPage,
                });
            }

            if (pdf) {
                await page.pdf({ path: `${path}.pdf`, width, height });
            }

            if (recursive) {
                if (!depthMarker--) {
                    depth++;
                    depthMarker = urls.length;
                }

                if (depth < argv.level) {
                    const links = await page.evaluate(findAllLinks, argv);
                    urls.push(...links);
                }
            }

            crawledPages.push(url);
        }

        await page.close();
    }

    for (let i = 0; i < TABS; ++i) {
        tabs.push(openTab());
    }

    await Promise.all(tabs);
    await browser.close();
}

(async () => {
    const browsers = [];

    for (const url of argv._) {
        browsers.push(openBrowser(url));
    }

    await Promise.all(browsers);
})();
