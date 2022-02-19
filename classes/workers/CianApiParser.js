import DatabaseManager from "../DatabaseManager.js";
import Advertisement from "../DTOs/Advertisement.js";
import NodeFetch from 'node-fetch';
import HttpsProxyAgent from 'https-proxy-agent';
import Functions from "../Functions.js";
import puppeteer from "puppeteer";
import proxyChain from "proxy-chain";
import ProxyIsNotValidError from "../errors/ProxyIsNotValidError.js";
import Proxy from "../DTOs/Proxy.js";
const {Browser} = puppeteer;


export default class CianApiParser {
    #existingAds;
    #dataBaseManager;
    #browser;
    #proxies;
    countRequests = 0;
    proxyIterationNumber = 0;

    async startParsing() {
        this.#dataBaseManager = await new DatabaseManager;
        this.#existingAds = await this.#getExistingAds();
        this.#proxies = await this.#dataBaseManager.getProxies();

        console.log('Парсер по API запущен');
        console.time('Watcher');
        while (true) {
            try {
                let proxy = null;
                // let proxy = this.getNextProxyUrl();
                // console.log('Используем прокси ' + proxy.ip);
                await this.parseResponse(proxy);
            } catch (error) {
                if (error instanceof ProxyIsNotValidError) {
                    console.log(error);
                } else {
                    console.log(error);
                }
            }
            let pauseSeconds = 10;
            console.log('Ждем ' + pauseSeconds + ' сек');
            await Functions.sleep(pauseSeconds * 1000);
        }
        console.log('Количество совершенных запросов: ' + this.countRequests);
        console.timeEnd('Watcher');
    }

    /**
     * @returns {Promise<void>}
     * @param {Proxy} proxy
     */
    async parseResponse(proxy = null) {
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
                    value: 300
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
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
            'referer': 'https://www.cian.ru/',
            'origin': 'https://www.cian.ru',
            'content-type': 'text/plain;charset=UTF-8',
            'content-length': '192',
            'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'accept-encoding': 'gzip, deflate, br',
            'accept': '*/*',
            'sec-fetch-site': 'same-site',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
            // ':authority': 'api.cian.ru',
            // ':method': 'POST',
            // ':path': '/search-offers/v2/search-offers-desktop/',
            // ':scheme': 'https',
        };
        let res = null;
        if (proxy) {
            let url = 'https://api.cian.ru/search-offers/v2/search-offers-desktop/';
            const proxyAgent = new HttpsProxyAgent(proxy.getProxyUrl());
            res = await NodeFetch(
                url, {
                    method: 'POST',
                    body: JSON.stringify(body),
                    headers: headers,
                    agent: proxyAgent
                }
            );
        } else {
            let url = 'http://api.scraperapi.com/?api_key=b9ba82b0cb711b6de6f05c9f47095fbf&url=https://api.cian.ru/search-offers/v2/search-offers-desktop/';
            res = await NodeFetch(
                url, {
                    method: 'POST',
                    body: JSON.stringify(body),
                    headers: headers,
                }
            );
        }

        this.countRequests++;

        let responseBody = await res.text();
        if (!Functions.isJson(responseBody)) {
            throw new ProxyIsNotValidError('Ответ не в формате json.');
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
        let newAdFlag = false;
        for (let ad of ads) {
            if (!ad.phones || !ad.phones.length) {
                console.log('Не нашелся телефон в объявлении');
                this.#existingAds.push(key);
                continue;
            }

            let newAd = new Advertisement;
            for (let phone of ad.phones) {
                newAd.telephones.push(phone.countryCode + phone.number)
            }

            newAd.siteId = 1;
            newAd.uniqueId = ad.cianId;

            let key = newAd.getUniqueKey();
            if (this.#existingAds.indexOf(key) !== -1) {
                break;
            }

            if (ad.roomsCount > 3) {
                continue;
            }
            let now = new Date();
            newAd.createdDate = now.toISOString().slice(0, 19).replace('T', ' ');
            let addedDate = new Date(ad.addedTimestamp * 1000);
            newAd.adAddedDate = addedDate.toISOString().slice(0, 19).replace('T', ' ');
            let createdDate = new Date(ad.creationDate);
            newAd.adCreatedDate = createdDate.toISOString().slice(0, 19).replace('T', ' ');

            newAd.url = ad.fullUrl;
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
            newAdFlag = true;
        }

        if (!newAdFlag) {
            console.log('Нет новых объявлений');
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
            keysArray.push(ad.getUniqueKey());
        }

        return keysArray;
    }

    getNextProxyUrl() {
        if (!this.#proxies.length) {
            throw Error('Нет доступных прокси');
        }
        let proxy = this.#proxies[this.proxyIterationNumber];
        this.proxyIterationNumber++;
        if (this.proxyIterationNumber >= this.#proxies.length) {
            this.proxyIterationNumber = 0;
        }
        return proxy;
    }
}