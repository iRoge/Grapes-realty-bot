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
            let captchaBlock = document.querySelector('div.g-recaptcha');
            return captchaBlock.dataset.sitekey;
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

        if (response.data.status) {
            let data = {
                key: '695355b02869d2f575b6e89201672a71',
                action: 'get',
                id: response.data.request,
                json: 1,
            };
            return await new Promise((resolve, reject) => {
                let timer = setInterval(() => {
                    (async () => {
                        let response = await axios.get('https://rucaptcha.com/res.php?' + Functions.serialize(data), {headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
                        if (response.data) {
                            if (response.data.status === 1) {
                                clearInterval(timer);
                                await page.evaluate(() => {
                                    let textarea = document.querySelector('div.g-recaptcha textarea[id="g-recaptcha-response"]');
                                    textarea.style = '';
                                });
                                await page.type('div.g-recaptcha textarea[id="g-recaptcha-response"]', response.data.request, {delay: 15});
                                await page.evaluate((code) => {
                                    let textarea = document.querySelector('div.g-recaptcha textarea[id="g-recaptcha-response"]');
                                    let input = document.createElement('input');
                                    input.setAttribute('type', 'button');
                                    input.setAttribute('id', 'handleCaptcha');
                                    input.setAttribute('onclick', 'handleCaptcha("' + code + '")');
                                    input.style.width = 400;
                                    input.style.height = 400;
                                    input.style.position = 'absolute';
                                    input.style.zIndex = 100000;
                                    textarea.after(input, textarea);
                                    // handleCaptcha(code);
                                }, response.data.request);
                                await page.click('input[id=handleCaptcha]');
                                await resolve();
                            } else if (response.data.status !== 0) {
                                await reject();
                            }
                        }
                    })();
                }, 1000)
            }).then(() => {
                return true;
            }).catch(() => {
                return false;
            });
        } else {
            console.log('При отправке запроса в RuCaptcha произошла ошибка');
            return false;
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
}