    const db = new PouchDB('default');

    db.setSchema([
        {
            singular: 'collection',
            plural: 'collections',
            relations: {
                'bullets': {hasMany: 'bullet'}
            }
        },
        {
            singular: 'collectionShort',
            plural: 'collectionShorts',
            documentType: 'collection'
        },
        {
            singular: 'bullet',
            plural: 'bullets',
            relations: {
                'collections': {hasMany: 'collection'}
            }
        },
        {
            singular: 'bulletShort',
            plural: 'bulletShorts',
            documentType: 'bullet'
        }
    ]);
