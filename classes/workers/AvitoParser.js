import DatabaseManager from "../DatabaseManager.js";
import puppeteer from "puppeteer";
import Advertisement from "../DTOs/Advertisement.js";
import NodeFetch from "node-fetch";
import { parse } from 'node-html-parser';
import RequestError from "../errors/RequestError.js";
import Functions from "../Functions.js";
import fs from "fs";
import Tesseract from 'tesseract.js';

const {Browser, Page} = puppeteer;

export default class AvitoParser {
    #existingAds;
    #dataBaseManager;

    async startParsing() {
        this.#dataBaseManager = await new DatabaseManager;
        this.#existingAds = await this.#getExistingAds();

        console.log('Парсер по API запущен');
        while (true) {
            try {
                await this.parsePage();
            } catch (error) {
                console.log('Какая-то неизвестная ошибка');
                console.log(error);
            }
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async parsePage() {
        let headers = {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
            'content-type': 'text/plain;charset=UTF-8',
            'cache-control': 'max-age=0',
            'if-none-match': 'W/"39baa6-t08JGrRzTxxT+xe4SHRuVec5J4o"',
            'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'accept-encoding': 'gzip, deflate, br',
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'upgrade-insecure-requests': '1',
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

        console.time('Время запроса на авито');
        let url = 'http://api.scraperapi.com/?api_key=b9ba82b0cb711b6de6f05c9f47095fbf&url=https://www.avito.ru/moskva/kvartiry/sdam-ASgBAgICAUSSA8gQ?f=ASgBAQICAUSSA8gQAUDMCESSWZBZjlmMWQ&s=104&user=1';
        let res = await NodeFetch(
            url, {
                method: 'GET',
                headers: headers,
            }
        );
        console.timeEnd('Время запроса на авито');

        let body = await res.text();
        let htmlDOM = parse(body);
        let ads = htmlDOM.querySelectorAll('div[data-marker="item"]');
        for (let ad of ads) {
            let uniqueId = ad.getAttribute('data-item-id');
            let url = 'https://www.avito.ru/web/1/items/phone/' + uniqueId + '?h=36&searchHash=hiavfo0pb8r13fqz3phjxr061i43508&vsrc=s';
            let res = await NodeFetch(
                url, {
                    method: 'GET',
                    headers: headers,
                }
            );
            let body = await res.text();
            if (!Functions.isJson(body)) {
                throw new RequestError('Ошибка при запросе изображения: ' + res)
            }
            let imageInfo = JSON.parse(body);
            if (!imageInfo.hasOwnProperty('image64')) {
                throw new RequestError('Ошибка при запросе изображения: ' + res)
            }
            fs.writeFileSync('1.png', Buffer.from(imageInfo['image64'].replace('data:image/png;base64,', ''), 'base64'));
            let phone = await this.recognizeImage(fs.readFileSync('1.png'), 'rus');
            fs.rmSync('1.png');
            phone = phone.replace(/\s/g, '').replace(/-/g, '').replace('8', '7');
            let newAd = new Advertisement;
            newAd.uniqueId = uniqueId;
            newAd.telephones.push(phone);
            newAd.siteId = 2;
            if (phone.length !== 11) {
                console.log('Некорректный номер телефона: ' + phone);
                continue;
            }
            let key = newAd.getUniqueKey();
            if (this.#existingAds.indexOf(key) !== -1) {
              return;
            }
            let now = new Date();
            newAd.createdDate = now.toISOString().slice(0, 19).replace('T', ' ');
            newAd.adAddedDate = null;
            newAd.adCreatedDate = null;
            let geoBlock = ad.querySelector('div.geo-georeferences-SEtee');
            let match = geoBlock.querySelector('span:nth-child(3)').innerText.match(/\d+.+(км|м)$/);
            newAd.metroDistance = match[0].replace(/ /, ' ');
            newAd.metro = geoBlock.querySelector('span:nth-child(2)').innerText;
            newAd.title = ad.querySelector('h3[itemprop="name"]').innerHTML.replace(/ /, ' ');
            newAd.url = 'https://www.avito.ru' + ad.querySelector('a.iva-item-sliderLink-uLz1v').getAttribute('href');
            newAd.viewsQty = null;
            newAd.roomsQty = null;
            newAd.description = ad.querySelector('div.iva-item-text-Ge6dR.iva-item-description-FDgK4').innerHTML;
            newAd.photosQty = null;
            newAd.noRealtor = null;
            newAd.adsByPhoneQty = null;
            match = ad.querySelector('span.price-text-_YGDY').innerHTML.replace(/\s+/, '').replace('&nbsp;', '').match(/\d+/);
            newAd.cost = match[0];

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

    async recognizeImage(file, lang) {
        return await Tesseract.recognize(file, lang).then(({ data: {text }}) => {
            return text;
        })
    }
}