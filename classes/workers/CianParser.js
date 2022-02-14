import {DatabaseManager} from "../DatabaseManager.js";
import puppeteer from "puppeteer";
import {Advertisement} from "../DTOs/Advertisement.js";
import {Functions} from "../Functions.js";
import proxyChain from'proxy-chain';

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
        let proxyUrl = 'http://api.scraperapi.com/?api_key=b9ba82b0cb711b6de6f05c9f47095fbf&url=https://www.cian.ru/cat.php?deal_type=rent&engine_version=2&is_by_homeowner=1&offer_type=flat&region=1&sort=creation_date_desc&totime=600&type=4';
        let url = 'https://www.cian.ru/cat.php?deal_type=rent&engine_version=2&is_by_homeowner=1&offer_type=flat&region=1&sort=creation_date_desc&totime=600&type=4';
        await page.goto(proxyUrl);
        if (await page.$('form#form_captcha')) {
            let result = await Functions.dealWithRecaptcha(page);
            if (!result) {
                console.log('Капча не решена');
                await this.#browser.close();
                return;
            }
            await page.goto(proxyUrl);
        }


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
        for (let ad of ads.reverse()) {
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
            console.log('Обрабатываем элемент');

            let newAd = new Advertisement;
            newAd.uniqueId = uniqueId;
            let now = new Date();
            newAd.createdDate = now.toISOString().slice(0, 19).replace('T', ' ');
            newAd.siteId = 1;
            newAd.url = url;

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

            if (await detailPage.$('form#form_captcha')) {
                let result = await Functions.dealWithRecaptcha(page);
                if (!result) {
                    console.log('Капча не решена');
                    await this.#browser.close();
                    return;
                }
            }

            let isError = await detailPage.$('h5.error-code');
            if (isError) {
                console.log('Ошибка на странице: ' + (await isError.evaluate(elem => elem.innerHTML)));
                this.#existingAds.push(key);
                await detailPage.close();
                continue;
            }
            await detailPage.waitForSelector('div[data-name="OfferAdded"]');
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
            newAd.photosQty = null;
            newAd.noRealtor = null;
            newAd.adsByPhoneQty = null;
            let costHtml = await detailPage.$eval('span.a10a3f92e9--price_value--lqIK0 span[itemprop="price"]', elem => elem.innerHTML);
            match = costHtml.replace(/\s+/, '').replace('&nbsp;', '').match(/\d+/);
            newAd.cost = match[0];

            console.log('Добавляем новое объявление в базу');
            this.#existingAds.push(key);
            await this.#dataBaseManager.addAds([newAd]);

            await detailPage.close();
        }

        await page.waitForTimeout(2000);
        let reloadSelector = 'button._93444fe79c--button--Cp1dl._93444fe79c--button--IqIpq._93444fe79c--XS--Q3OqJ._93444fe79c--button--OhHnj';
        await page.$eval(reloadSelector, elem => {
            window.scrollTo(0, elem.scrollHeight)
        })
        console.log('Перезагружаем страницу');
        await (await page.$(reloadSelector)).click();
    }

    /**
     * @returns {Browser}
     */
    static async #getBrowser() {
        const oldProxyUrl = 'http://iroge27:hCnUejtHmt@193.38.234.46:59100';
        const newProxyUrl = await proxyChain.anonymizeProxy(oldProxyUrl);

        let args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            // '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36"',
            '--start-maximized',
            "--disable-notifications",
            '--disable-web-security',
            // `--proxy-server=${newProxyUrl}`
        ];

        return await puppeteer.launch({
            headless: false,
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