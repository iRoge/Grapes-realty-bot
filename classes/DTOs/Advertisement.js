export default class Advertisement {
    id = null
    uniqueId = null
    title = ''
    roomsQty = null
    adsByPhoneQty = null
    viewsQty = null
    noRealtor = 0
    cost = null
    telephones = []
    metro = null
    photosQty = null
    city = null
    siteId = 1
    adAddedDate = null
    adCreatedDate = null
    createdDate = null
    description = ''
    metroDistance = ''
    url = ''

    getUniqueKey()
    {
        return this.uniqueId + '_site_' + this.siteId + '_phones_' + this.telephones.join('|');
    }

    static getPropsToInsertMap()
    {
        return {
            uniqueId: 'unique_id',
            title: 'title',
            roomsQty: 'rooms_qty',
            adsByPhoneQty: 'ads_by_phone_qty',
            viewsQty: 'views_qty',
            noRealtor: 'no_realtor',
            cost: 'cost',
            telephones: 'telephones',
            metro: 'metro',
            photosQty: 'photos_qty',
            metroDistance: 'metro_distance',
            siteId: 'site_id',
            adAddedDate: 'ad_added_date',
            adCreatedDate: 'ad_created_date',
            createdDate: 'created_date',
            description: 'description',
            url: 'url'
        };
    }
}