import {DatabaseManager} from "../DatabaseManager.js";
import puppeteer from "puppeteer";
import {Advertisement} from "../DTOs/Advertisement.js";

const {Browser, Page} = puppeteer;

export class CianParser {
    #existingAds;
    #browser;
    #dataBaseManager;

    async startParsing() {
        this.#dataBaseManager = await new DatabaseManager;
        this.#browser = await CianParser.#getBrowser();
        this.#existingAds = await this.#getExistingAds();

        let page = (await this.#browser.pages()).shift();
        await page.goto('https://www.cian.ru/cat.php?deal_type=rent&engine_version=2&is_by_homeowner=1&offer_type=flat&region=1&sort=creation_date_desc&totime=3600&type=4');
        let badButton = await page.$('div._25d45facb5--close--C4TsU')
        if (badButton) {
            await badButton.click();
        }
        while (true) {
            try {
                await this.parsePage(page);
            } catch (error) {
                console.log('Какая-то неизвестная ошибка: ' + error.message);
                break;
            }
        }
    }

    /**
     *
     * @param {Page} page
     * @returns {Promise<void>}
     */
    async parsePage(page) {
        let ads = await page.$$('._93444fe79c--card--ibP42');
        for (let ad of ads) {
            let button = await ad.$('button span._93444fe79c--text--rH6sj');
            if (!button) {
                continue;
            }

            let url = await ad.$eval('div[data-name="LinkArea"] a._93444fe79c--link--eoxce', elem => elem.getAttribute('href'));
            let match = url.match(/\/rent\/flat\/(\d+)\//);
            let uniqueId = match[1];

            let key = this.#dataBaseManager.getUniqueKey(uniqueId, 1);
            if (this.#existingAds.indexOf(key) !== -1) {
                break;
            }

            let newAd = new Advertisement;
            newAd.uniqueId = uniqueId;
            let now = new Date();
            newAd.createdDate = now.toISOString().slice(0, 19).replace('T', ' ');
            newAd.siteId = 1;

            await button.click();
            newAd.telephones = await ad.$$eval(
                'div._93444fe79c--button--j934Y div._93444fe79c--container--aWzpE > span[data-mark="PhoneValue"]',
                phoneBlocks => {
                    return phoneBlocks.map(phoneBlock => phoneBlock.textContent)
                }
            );
            newAd.metroDistance = await ad.$eval('div._93444fe79c--remoteness--q8IXp', elem => elem.innerHTML);
            newAd.metro = await ad.$eval('a._93444fe79c--link--BwwJO div:nth-child(2)', elem => elem.innerHTML);

            let detailPage = await this.#browser.newPage();
            await detailPage.goto(url);
            let dateAddedHtml = await detailPage.$eval('div[data-name="OfferAdded"]', elem => elem.innerHTML);
            match = dateAddedHtml.match(/(\d\d):(\d\d)/);
            let addedDate = new Date();
            addedDate.setUTCHours(match[1]);
            addedDate.setUTCMinutes(match[2]);
            addedDate.setUTCSeconds(0);
            newAd.adAddedDate = addedDate.toISOString().slice(0, 19).replace('T', ' ');
            let viewsQtyHTML = await detailPage.$eval('a.a10a3f92e9--link--ulbh5.a10a3f92e9--link--SNP6L', elem => elem.innerHTML);
            newAd.title = await detailPage.$eval('h1.a10a3f92e9--title--UEAG3', elem => elem.innerHTML);
            newAd.viewsQty = viewsQtyHTML.match(/\d+/g)[0];
            let isStudio = newAd.title.match(/студия/gi);
            if (isStudio) {
                newAd.roomsQty = 0;
            } else {
                newAd.roomsQty = newAd.title.match(/(\d+)-комн/)[1];
            }
            newAd.description = await detailPage.$eval('p[itemprop="description"]', elem => elem.innerHTML);
            newAd.photo = null;
            newAd.noRealtor = null;
            newAd.adsByPhoneQty = null;
            let costHtml = await detailPage.$eval('span.a10a3f92e9--price_value--lqIK0 span[itemprop="price"]', elem => elem.innerHTML);
            match = costHtml.replace(/\s+/, '').replace('&nbsp;', '').match(/\d+/);
            newAd.cost = match[0];
            console.log(newAd.cost);

            console.log('Добавляем новое объявление в базу');
            this.#existingAds.push(key);
            await this.#dataBaseManager.addAds([newAd]);

            await detailPage.close();
        }

        console.log('Ждем 2 секунды');
        await page.waitForTimeout(2000);
        await (await page.$('button._93444fe79c--button--Cp1dl._93444fe79c--button--IqIpq._93444fe79c--XS--Q3OqJ._93444fe79c--button--OhHnj')).click();
    }

    /**
     * @returns {Browser}
     */
    static async #getBrowser() {
        let args = [
            '--no-sandbox',
            // '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
            '--start-maximized',
            // "--disable-notifications",
            // '--disable-web-security',
            // '--proxy-server=https://203.189.89.153:8080'
        ];

        return await puppeteer.launch({
            headless: true,
            args: args,
            defaultViewport: {
                width: 1920,
                height: 1080,
            },
        });
    }

    async #getExistingAds() {
        let existingAds = await this.#dataBaseManager.getAds(1, 100);

        let keysArray = [];
        for (let key in existingAds) {
            let ad = existingAds[key];
            keysArray.push(this.#dataBaseManager.getUniqueKey(ad.uniqueId, ad.siteId));
        }

        return keysArray;
    }
}