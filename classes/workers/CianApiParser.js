import {DatabaseManager} from "../DatabaseManager.js";
import {Advertisement} from "../DTOs/Advertisement.js";
import nodeFetch from 'node-fetch';
import {Functions} from "../Functions";
import puppeteer from "puppeteer";


export class CianApiParser {
    #existingAds;
    #dataBaseManager;
    #browser;

    async startParsing() {
        this.#dataBaseManager = await new DatabaseManager;
        this.#existingAds = await this.#getExistingAds();

        console.log('Парсер запущен');
        while (true) {
            try {
                await this.parseResponse();
                console.log('Iteration....');
                await this.sleep(500);
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
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
            'sec-fetch-site': 'same-site',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
            'referer': 'https://www.cian.ru/',
            'origin': 'https://www.cian.ru',
            'cookie': '_CIAN_GK=1c5a7ce6-fbd9-4713-af3f-3735d0e60eda; _gcl_au=1.1.982303988.1643829523; _ga=GA1.2.1997587419.1643829523; uxfb_usertype=searcher; tmr_lvidTS=1643829523064; tmr_lvid=8080b211529c464c80dcb5dcb76179f9; _ym_d=1643829523; _ym_uid=16438295231027092789; uxs_uid=ef837430-845c-11ec-a8a7-51ce581ff762; _fbp=fb.1.1643829523354.1465053188; afUserId=67209984-a052-4372-b2c9-ac34f2a81370-p; sopr_utm=%7B%22utm_source%22%3A+%22vk%22%2C+%22utm_medium%22%3A+%22social%22%7D; cookie_agreement_accepted=1; cf_clearance=6sbnZa9eZgFWDcInYHhOANw6kSeFMZO_70RMwu9BJVk-1643831071-0-150; pview=3; serp_registration_trigger_popup=1; _gid=GA1.2.1474750472.1644666021; AF_SYNC=1644666022349; is_push_declined=true; serp_stalker_banner=1; session_main_town_region_id=1; session_region_id=1; first_visit_time=1644750862075; login_mro_popup=1; _ym_isad=2; __cf_bm=63xTFD7YGluqYPEB63MdB_9pCQ1YnkWRqBe4oOeZ5Sw-1644753390-0-AcBU6y6vkkuXh7HKOAFcb6TDKXbuSQG4BYVwbrks8OgEO4N5YqIGyO9EtHCRPHmREZRTMFvRyun6B3NvNjprflU=; sopr_session=2ab9cb8cb39a4217; _dc_gtm_UA-30374201-1=1; _ym_visorc=w; cto_bundle=_IBkiF9ubXJTaHF6UnQzJTJCT24xV1RBRlFwRHFyWXhrTlBtWSUyQlFvTSUyRnBEOXZkRE5sVkhiM012bXNCbFVuemQ5ZGN2eCUyQiUyRkRORWhxRWhxS2dZcXpYeDVOJTJCTE1KUkpDVThMWVo5cmxZTU91MmdVMUtvYTRKRWElMkZaOVFVMHQ2Ym5ZVmFDZnNDemUyJTJGeiUyQk8zQVhSSTdLbTQxY0hOZ1ElM0QlM0Q; tmr_reqNum=167',
            'content-type': 'text/plain;charset=UTF-8',
            'content-length': '299',
            'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'accept-encoding': 'gzip, deflate, br',
            'accept': '*/*',
        };
        let res = await nodeFetch(
            'https://api.cian.ru/search-offers/v2/search-offers-desktop/', {
                method: 'POST',
                body: JSON.stringify(body),
                headers: headers
            }
        );

        let responseBody = await res.text();
        if (!Functions.isJson(responseBody)) {
            let browser = this.#getBrowser();
            let page = (await browser.pages()).shift();
            await page.goto('https://www.cian.ru/');
            let recaptchaDealt = await Functions.dealWithRecaptcha(page);
            if (recaptchaDealt) {
                throw new Error('Рекапча не была решена');
            }
        }

        let resBody = JSON.parse(responseBody).data;
        if (!resBody) {
            throw new Error('Пришел пустой ответ от сервера cian');
        }



        let ads = resBody.offersSerialized;
        if (!ads || !ads.length) {
            console.log('Новых объявлений нет');
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
            headless: true,
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

    sleep(milliseconds) {
        const date = Date.now();
        let currentDate = null;
        do {
            currentDate = Date.now();
        } while (currentDate - date < milliseconds);
    }
}