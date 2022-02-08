export class Advertisement {
    id = null
    uniqueId = null
    time = null
    title = null
    roomsQty = null
    adsByPhoneQty = null
    viewsQty = null
    noRealtor = 0
    cost = null
    telephones = []
    metro = null
    photo = null
    city = null
    siteId = 1

    static getPropsToInsertMap()
    {
        return {
            uniqueId: 'unique_id',
            time: 'time',
            title: 'title',
            roomsQty: 'rooms_qty',
            adsByPhoneQty: 'ads_by_phone_qty',
            viewsQty: 'views_qty',
            noRealtor: 'no_realtor',
            cost: 'cost',
            telephones: 'telephones',
            metro: 'metro',
            photo: 'photo',
            city: 'city',
            siteId: 'site_id',
        };
    }
}