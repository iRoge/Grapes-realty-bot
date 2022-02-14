import puppeteer from "puppeteer";
import axios from 'axios';

const {Browser, Page} = puppeteer;

export class Functions {
    /**
     * @param {Page} page
     * @returns {Promise<boolean>}
     */
    static async dealWithRecaptcha(page) {
        let sitekey = await page.evaluate(() => {
            let iframeSrc = document.querySelector('iframe[title="reCAPTCHA"]').getAttribute('src');
            let urlParams = new URLSearchParams(iframeSrc);
            return urlParams.get('k');
        });
        let data = {
            key: '695355b02869d2f575b6e89201672a71',
            googlekey: sitekey,
            method: 'userrecaptcha',
            pageurl: page.url(),
            json: 1,
        };
        console.log('Sending request to RuCaptcha...');
        let response = await axios.get('https://rucaptcha.com/in.php?' + Functions.serialize(data), {headers: {'Content-Type': 'application/x-www-form-urlencoded'}});

        if (!response.data.status) {
            console.log('При отправке запроса в RuCaptcha произошла ошибка');
            return false;
        }

        data = {
            key: '695355b02869d2f575b6e89201672a71',
            action: 'get',
            id: response.data.request,
            json: 1,
        };
        let result = null;
        while (true) {
            let response = await axios.get('https://rucaptcha.com/res.php?' + Functions.serialize(data), {headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
            if (response.data) {
                if (response.data.status === 1) {
                    await page.evaluate(() => {
                        let textarea = document.querySelector('textarea[id="g-recaptcha-response"]');
                        textarea.style = '';
                    });
                    await page.type('textarea[id="g-recaptcha-response"]', response.data.request, {delay: 5});
                    await page.evaluate((code) => {
                        let textarea = document.querySelector('textarea[id="g-recaptcha-response"]');
                        let input = document.createElement('input');
                        input.setAttribute('type', 'submit');
                        input.setAttribute('id', 'handleCaptcha');
                        input.style.width = 400;
                        input.style.height = 400;
                        input.style.position = 'absolute';
                        input.style.zIndex = 100000;
                        textarea.after(input, textarea);
                    }, response.data.request);
                    await page.click('input[id=handleCaptcha]');
                    await page.waitForTimeout(2500);
                    result = true;
                } else if (response.data.status !== 0) {
                    result = false;
                }
            }
            if (result) {
                console.log('Капча решена');
                return true;
            } else {
                Functions.sleep(500);
            }
        }
    }

    static serialize(obj, prefix)
    {
        var str = [],
            p;
        for (p in obj) {
            if (obj.hasOwnProperty(p)) {
                var k = prefix ? prefix + "[" + p + "]" : p,
                    v = obj[p];
                str.push((v !== null && typeof v === "object") ?
                    serialize(v, k) :
                    encodeURIComponent(k) + "=" + encodeURIComponent(v));
            }
        }
        return str.join("&");
    }

    static isJson(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    static sleep(milliseconds) {
        const date = Date.now();
        let currentDate = null;
        do {
            currentDate = Date.now();
        } while (currentDate - date < milliseconds);
    }
}