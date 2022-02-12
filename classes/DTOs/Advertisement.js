export class Advertisement {
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
    photo = null
    city = null
    siteId = 1
    adAddedDate = null
    createdDate = null
    description = ''
    metroDistance = ''

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
            photo: 'photo',
            metroDistance: 'metro_distance',
            siteId: 'site_id',
            adAddedDate: 'ad_added_date',
            createdDate: 'created_date',
            description: 'description',
        };
    }
}