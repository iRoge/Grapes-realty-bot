import {DatabaseManager} from "../DatabaseManager.js";
import puppeteer from "puppeteer";
import {Advertisement} from "../DTOs/Advertisement.js";

const {Browser, Page} = puppeteer;

export class AvitoParser {
    #existingAds;
    #dataBaseManager;

    async startParsing() {
        this.#dataBaseManager = await new DatabaseManager;
        this.#existingAds = await this.#getExistingAds();

        while (true) {
            try {
                await this.parsePage();
            } catch (error) {
                console.log('Какая-то неизвестная ошибка: ' + error.message);
            }
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async parsePage() {
        let ads = [];

        for (let ad of ads) {
            let uniqueId = null;

            let key = ad.getUniqueKey();
            if (this.#existingAds.indexOf(key) !== -1) {
                break;
            }
            console.log('Обрабатываем элемент');

            let newAd = new Advertisement;
            newAd.uniqueId = uniqueId;
            let now = new Date();
            newAd.createdDate = now.toISOString().slice(0, 19).replace('T', ' ');
            newAd.siteId = 2;
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
            keysArray.push(ad.getUniqueKey());
        }

        return keysArray;
    }
}