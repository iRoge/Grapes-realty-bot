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
        headless: false,
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
    let data = await page.evaluate(() => {
        let announcements = document.querySelectorAll('._93444fe79c--card--ibP42');
        for (let an of announcements) {
            let 
        }

    });

    await page.waitForTimeout(10000);
}