import puppeteer from 'puppeteer';
import {DatabaseManager} from '../classes/DatabaseManager.js';
import {TimeoutError} from '../classes/errors/TimeoutError.js';
import {Advertisement} from '../classes/DTOs/Advertisement.js';

(async () => {
    const dataBaseManager = new DatabaseManager();
    let existingAds = await dataBaseManager.getAds(1, 100);

    let keysArray = [];
    for (let key in existingAds) {
        let ad = existingAds[key];
        keysArray.push(dataBaseManager.getUniqueKey(ad.uniqueId, ad.siteId));
    }

    let args = [
        '--no-sandbox',
        // '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
        '--start-maximized',
        // "--disable-notifications",
        // '--disable-web-security',
        // '--proxy-server=https://203.189.89.153:8080'
    ];
    let browser = await puppeteer.launch({
        headless: false,
        args: args,
        defaultViewport: {
            width: 1920,
            height: 1080,
        },
    });

    let page = (await browser.pages()).shift();

    while (true) {
        try {
            await page.goto('https://www.cian.ru/cat.php?deal_type=rent&engine_version=2&is_by_homeowner=1&offer_type=flat&region=1&sort=creation_date_desc&type=4');

            let ads = await page.$$('._93444fe79c--card--ibP42');
            let newAds = [];
            for (let ad of ads) {
                let button = await ad.$('button span._93444fe79c--text--rH6sj');
                if (!button) {
                    continue;
                }

                let url = await ad.$eval('div[data-name="LinkArea"] a._93444fe79c--link--eoxce', elem => elem.getAttribute('href'));
                let match = url.match(/\/rent\/flat\/(\d+)\//);
                let uniqueId = match[1];

                let key = dataBaseManager.getUniqueKey(uniqueId, 1);
                if (keysArray.indexOf(key) !== -1) {
                    console.log('Закончились новые объявления');
                    break;
                }

                let newAd = new Advertisement;
                newAd.uniqueId = uniqueId;
                newAd.time = new Date().toISOString().slice(0, 19).replace('T', ' ');
                newAd.siteId = 1;

                await button.click();
                newAd.telephones = await ad.$$eval(
                    'div._93444fe79c--button--j934Y div._93444fe79c--container--aWzpE > span[data-mark="PhoneValue"]',
                        phoneBlocks => {
                        return phoneBlocks.map(phoneBlock => phoneBlock.textContent)
                    }
                );

                newAd.title = await ad.$eval('span[data-mark="OfferTitle"] span', elem => elem.innerHTML);
                newAd.metro = await ad.$eval('a._93444fe79c--link--BwwJO div:nth-child(2)', elem => elem.innerHTML);

                newAds.push(newAd)
            }

            if (newAds.length) {
                console.log('Добавляем ' + newAds.length + ' новых объявлений в базу');
                for (let ad of newAds) {
                    let key = dataBaseManager.getUniqueKey(ad.uniqueId, ad.siteId);
                    keysArray.push(key);
                }

                await dataBaseManager.addAds(newAds);
            }

            console.log('Ждем 5 секунд');
            await page.waitForTimeout(5);
        } catch (error) {
            console.log('Какая-то неизвестная ошибка: ' + error.message);
            break;
        }
    }

})()
