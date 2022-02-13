import {DatabaseManager} from "../DatabaseManager.js";
import puppeteer from "puppeteer";
import {Advertisement} from "../DTOs/Advertisement.js";

const {Browser, Page} = puppeteer;

export class AvitoParser {
    #existingAds;
    #browser;
    #dataBaseManager;

    async startParsing() {
        this.#dataBaseManager = await new DatabaseManager;
        this.#browser = await AvitoParser.#getBrowser();
        this.#existingAds = await this.#getExistingAds();

        let page = (await this.#browser.pages()).shift();
        await page.goto('https://www.cian.ru/cat.php?deal_type=rent&engine_version=2&is_by_homeowner=1&offer_type=flat&region=1&sort=creation_date_desc&totime=3600&type=4');
        while (true) {
            try {
                await this.parsePage(page);
            } catch (error) {
                console.log('Какая-то неизвестная ошибка: ' + error.message);
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
            let uniqueId = null;

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
            newAd.telephones = null;
            newAd.metroDistance = null;
            newAd.metro = null;
            newAd.adAddedDate = null;
            newAd.title = null;
            newAd.viewsQty = null;
            newAd.roomsQty = null;
            newAd.description = null;
            newAd.photo = null;
            newAd.noRealtor = null;
            newAd.adsByPhoneQty = null;
            newAd.cost = null;

            console.log('Добавляем новое объявление в базу');
            this.#existingAds.push(key);
            await this.#dataBaseManager.addAds([newAd]);

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
        let existingAds = await this.#dataBaseManager.getAds(2, 100);

        let keysArray = [];
        for (let key in existingAds) {
            let ad = existingAds[key];
            keysArray.push(this.#dataBaseManager.getUniqueKey(ad.uniqueId, ad.siteId));
        }

        return keysArray;
    }
}