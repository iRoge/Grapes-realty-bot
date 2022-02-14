import {DatabaseManager} from "../DatabaseManager.js";
import {Advertisement} from "../DTOs/Advertisement.js";
import NodeFetch from 'node-fetch';
import HttpsProxyAgent from 'https-proxy-agent';
import {Functions} from "../Functions.js";
import puppeteer from "puppeteer";
const {Browser} = puppeteer;


export class CianApiParser {
    #existingAds;
    #dataBaseManager;
    #browser;
    countRequests = 0;

    async startParsing() {
        this.#dataBaseManager = await new DatabaseManager;
        this.#existingAds = await this.#getExistingAds();

        console.log('Парсер запущен');
        console.time('Watcher');
        while (true) {
            try {
                await this.parseResponse();
                console.log('Iteration....');
                await Functions.sleep(4000);
            } catch (error) {
                console.log('Какая-то ошибка: ');
                console.log(error);
                break;
            }
        }
        console.log('Количество совершенных запросов: ' + this.countRequests);
        console.timeEnd('Watcher');
    }

    /**
     *
     * @param {Page} page
     * @returns {Promise<void>}
     */
    async parseResponse(page) {
        let body = {
            jsonQuery: {
                engine_version: {
                    type: "term",
                    value: 2
                },
                foot_min: {
                    type: "range",
                    value: {
                        lte: 25
                    }
                },
                for_day: {
                    type: "term",
                    value: "!1"
                },
                is_by_homeowner: {
                    type: "term",
                    value: true
                },
                publish_period: {
                    type: "term",
                    value: 600
                },
                region: {
                    type: "terms",
                    value: [1]
                },
                sort: {
                    type: "term",
                    value: "creation_date_desc"
                },
                _type: "flatrent"
            }
        };
        let headers = {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36"',
            'referer': 'https://www.cian.ru/',
            'origin': 'https://www.cian.ru',
            'content-type': 'text/plain;charset=UTF-8',
            'content-length': '299',
            'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'accept-encoding': 'gzip, deflate, br',
            'accept': '*/*',
        };
        let proxyUrl = 'http://api.scraperapi.com/?api_key=b9ba82b0cb711b6de6f05c9f47095fbf&url=https://api.cian.ru/search-offers/v2/search-offers-desktop/';
        let url = 'https://api.cian.ru/search-offers/v2/search-offers-desktop/';
        let proxy = 'http://iroge27:hCnUejtHmt@193.38.234.46:59100';
        const proxyAgent = new HttpsProxyAgent(proxyUrl);

        let res = await NodeFetch(
            proxyUrl, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: headers,
                // agent: proxyAgent
            }
        );
        this.countRequests++;

        let responseBody = await res.text();
        if (!Functions.isJson(responseBody)) {
            throw new Error('Вылезла капча');
            console.log('Найдена капча');
            let browser = await this.#getBrowser();
            let page = await browser.newPage();
            await page.goto('https://www.cian.ru/');
            let result = await Functions.dealWithRecaptcha(page);
            await page.close();
            if (!result) {
                throw new Error('Не удалось решить капчу');
            } else {
                return null;
            }
        }
        let resBody = JSON.parse(responseBody).data;
        if (!resBody) {
            throw new Error('Пришел пустой ответ от сервера cian');
        }
        let ads = resBody.offersSerialized;
        if (!ads || !ads.length) {
            console.log('Объявлений за период нет');
            return false;
        }
        for (let ad of ads) {
            let key = this.#dataBaseManager.getUniqueKey(ad.cianId, 1);
            if (this.#existingAds.indexOf(key) !== -1) {
                break;
            }

            if (!ad.phones || !ad.phones.length) {
                console.log('Не нашелся телефон в объявлении');
                this.#existingAds.push(key);
                continue;
            }

            let newAd = new Advertisement;
            newAd.uniqueId = ad.cianId;
            let now = new Date();
            newAd.createdDate = now.toISOString().slice(0, 19).replace('T', ' ');
            let addedDate = new Date(ad.addedTimestamp * 1000);
            newAd.adAddedDate = addedDate.toISOString().slice(0, 19).replace('T', ' ');
            let createdDate = new Date(ad.creationDate);
            newAd.adCreatedDate = createdDate.toISOString().slice(0, 19).replace('T', ' ');
            newAd.siteId = 1;
            newAd.url = ad.fullUrl;
            for (let phone of ad.phones) {
                newAd.telephones.push(phone.countryCode + phone.number)
            }
            let metro = ad.geo.undergrounds.shift();
            if (!metro) {
                console.log('Не нашлось метро в объявлении');
                this.#existingAds.push(key);
                continue;
            }
            newAd.metroDistance = metro.time + ' мин. пешком';
            newAd.metro = metro.name;
            newAd.title = (ad.flatType !== 'studio' ? ad.roomsCount + ' комн. квартира' : 'студия') + ' ' + ad.totalArea + ' м²';
            newAd.viewsQty = null;
            newAd.roomsQty = ad.roomsCount;
            newAd.description = ad.description;
            newAd.photosQty = ad.photos.length;
            newAd.noRealtor = null;
            newAd.adsByPhoneQty = null;
            newAd.cost = ad.bargainTerms.priceRur;

            console.log('Добавляем новое объявление в базу');
            this.#existingAds.push(key);
            await this.#dataBaseManager.addAds([newAd]);
        }
    };

    /**
     * @returns {Browser}
     */
    async #getBrowser() {
        if (this.#browser) {
            return this.#browser;
        }

        let args = [
            '--no-sandbox',
            // '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
            '--start-maximized',
            // "--disable-notifications",
            // '--disable-web-security',
            // '--proxy-server=https://203.189.89.153:8080'
        ];

        this.#browser = await puppeteer.launch({
            headless: false,
            args: args,
            defaultViewport: {
                width: 1920,
                height: 1080,
            },
        });

        return this.#browser;
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