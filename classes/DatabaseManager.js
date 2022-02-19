import Mysql from 'sync-mysql';
import dotenv from 'dotenv';
import Advertisement from "./DTOs/Advertisement.js";
import Proxy from "./DTOs/Proxy.js";

dotenv.config();

export default class DatabaseManager {
    _connection;
    constructor()
    {
        this._connection = new Mysql({
            host: process.env.HOST,
            database: process.env.DATABASE,
            user: process.env.LOGIN,
            password: process.env.PASSWORD,
        })
    }

    async getAds(siteId = 1, limit = 100)
    {
        let rows = this._connection.query('SELECT * from ads WHERE site_id = ' + siteId + ' LIMIT ' + limit);
        let data = {};
        for (let row of rows) {
            let ad = new Advertisement();
            ad.id = row.id;
            ad.adAddedDate = row.ad_added_date;
            ad.createdDate = row.created_date;
            ad.uniqueId = row.unique_id;
            ad.adsByPhoneQty = row.ads_by_phone_qty;
            ad.roomsQty = row.rooms_qty;
            ad.city = row.city;
            ad.cost = row.cost;
            ad.metro = row.metro;
            ad.noRealtor = row.no_realtor;
            ad.photosQty = row.photos_qty;
            ad.telephones = JSON.parse(row.telephones);
            ad.title = row.title;
            ad.siteId = row.site_id;
            ad.viewsQty = row.views_qty;
            ad.description = row.description;
            data[ad.getUniqueKey()] = ad;
        }
        return data;
    }

    /**
     * @param {Advertisement[]} ads
     * @returns {Promise<*>}
     */
    async addAds(ads)
    {
        let fieldsToInsert = [];
        let propMap = Advertisement.getPropsToInsertMap();
        for (let prop in propMap) {
            fieldsToInsert.push(propMap[prop]);
        }
        let sql = 'INSERT INTO ads (' + fieldsToInsert.join(', ') + ') VALUES ';
        let arValuesToInsert = [];

        for (let ad of ads) {
            let valuesToInsert = [];
            for (let prop in propMap) {
                if (Array.isArray(ad[prop])) {
                    if (ad[prop].length) {
                        valuesToInsert.push("'" + JSON.stringify(ad[prop]) + "'");
                    } else {
                        valuesToInsert.push('null');
                    }
                } else if (ad[prop] !== null) {
                    if ((typeof ad[prop]) === 'string') {
                        valuesToInsert.push("'" + ad[prop] + "'");
                    } else {
                        valuesToInsert.push(ad[prop]);
                    }
                } else {
                    valuesToInsert.push('null');
                }
            }
            arValuesToInsert.push('(' + valuesToInsert.join(', ') + ')');
        }
        sql += arValuesToInsert.join(', ');
        return this._connection.query(sql);
    }

    async getProxies()
    {
        let rows = this._connection.query('SELECT * from proxy WHERE status = 1');
        let data = [];
        for (let row of rows) {
            let proxy = new Proxy();
            proxy.id = row.id;
            proxy.status = row.status;
            proxy.ip = row.ip;
            proxy.port = row.port;
            proxy.protocol = row.protocol;
            proxy.login = row.login;
            proxy.password = row.password;
            proxy.sourceId = row.source_id;
            data.push(proxy);
        }
        return data;
    }

    /**
     * @returns {Promise<*>}
     * @param {Proxy[]} proxies
     */
    async addProxies(proxies)
    {
        let fieldsToInsert = [];
        let propMap = Proxy.getPropsToInsertMap();
        for (let prop in propMap) {
            fieldsToInsert.push(propMap[prop]);
        }
        let sql = 'INSERT INTO ads (' + fieldsToInsert.join(', ') + ') VALUES ';
        let arValuesToInsert = [];

        for (let proxy of proxies) {
            let valuesToInsert = [];
            for (let prop in propMap) {
                if (Array.isArray(proxy[prop])) {
                    if (proxy[prop].length) {
                        valuesToInsert.push("'" + JSON.stringify(proxy[prop]) + "'");
                    } else {
                        valuesToInsert.push('null');
                    }
                } else if (proxy[prop] !== null) {
                    if ((typeof proxy[prop]) === 'string') {
                        valuesToInsert.push("'" + proxy[prop] + "'");
                    } else {
                        valuesToInsert.push(proxy[prop]);
                    }
                } else {
                    valuesToInsert.push('null');
                }
            }
            arValuesToInsert.push('(' + valuesToInsert.join(', ') + ')');
        }
        sql += arValuesToInsert.join(', ');
        return this._connection.query(sql);
    }
}
