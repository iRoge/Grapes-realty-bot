import Mysql from 'sync-mysql';
import dotenv from 'dotenv';
import {Advertisement} from "./DTOs/Advertisement.js";

dotenv.config();

export class DatabaseManager {
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
            ad.time = row.time;
            ad.uniqueId = row.unique_id;
            ad.adsByPhoneQty = row.ads_by_phone_qty;
            ad.roomsQty = row.rooms_qty;
            ad.city = row.city;
            ad.cost = row.cost;
            ad.metro = row.metro;
            ad.noRealtor = row.no_realtor;
            ad.photo = row.photo;
            ad.telephones = JSON.parse(row.telephones);
            ad.title = row.title;
            ad.siteId = row.site_id;
            ad.viewsQty = row.views_qty;
            data[this.getUniqueKey(row.unique_id, row.site_id)] = ad;
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
                } else if (ad[prop]) {
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

    getUniqueKey(uniqueId, siteId)
    {
        return uniqueId + '_site_' + siteId;
    }
}
