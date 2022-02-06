const puppeteer = require('puppeteer');

run();

async function run() {
    const args = [
        '--no-sandbox',
        // '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
        '--start-maximized',
        // "--disable-notifications",
        // '--disable-web-security',
        // '--proxy-server=188.113.190.7:80'
    ];
    const browser = await puppeteer.launch({
        headless: true,
        args: args,
        defaultViewport: {
            width: 1920,
            height: 1080,
        }
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    page.on('console', msg => {
        console.log(msg.text());
    });

    await page.goto('https://www.cian.ru/cat.php?deal_type=rent&engine_version=2&is_by_homeowner=1&offer_type=flat&region=1&sort=creation_date_desc&type=4');
    let newAnnounces = await page.evaluate(() => {
        let announcements = document.querySelectorAll('._93444fe79c--card--ibP42');
        let newAnnounces = [];
        for (let an of announcements) {
            let button = an.querySelector('button span._93444fe79c--text--rH6sj');
            if (!button) {
                continue;
            }

            let url = an.querySelector('div[data-name="LinkArea"] a._93444fe79c--link--eoxce').getAttribute('href');
            let match = url.match(/\/rent\/flat\/(\d+)\//);
            let primaryKey = match[1];
            /** Здесь должны быть проверки на уникальность перед записью **/

            let now = new Date();
            let newAnnounce = {
                id: primaryKey,
                time: now.toDateString(),
                title: null,
                rooms: null,
                announcesByPhone: null,
                views: null,
                noRealtor: null,
                cost: null,
                telephones: [],
                metro: null,
                photo: null,
                city: null,
            };
            button.click();
            let numbersDivs = an.querySelectorAll('div._93444fe79c--button--j934Y div._93444fe79c--container--aWzpE > span[data-mark="PhoneValue"]');
            for (let numberDiv of numbersDivs) {
                newAnnounce.telephones.push(numberDiv.innerHTML.trim());
            }

            newAnnounce.title = an.querySelector('span[data-mark="OfferTitle"] span').innerHTML;
            newAnnounce.metro = an.querySelector('a._93444fe79c--link--BwwJO div:nth-child(2)').innerHTML;

            newAnnounces.push(newAnnounce)
        }
        return newAnnounces;
    });

    console.log(newAnnounces);
    await page.waitForTimeout(10000);
}