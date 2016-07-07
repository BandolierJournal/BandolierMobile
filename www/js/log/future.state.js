bulletApp.config(function($stateProvider) {

    $stateProvider.state('future', {
        url: '/future/:index',
        templateUrl: 'js/log/log.template.html',
        controller: 'LogCtrl',
        resolve: {
            collections: function(DateFactory, $log) {
                return Collection.fetchAll({ type: 'future' })
                    .then(DateFactory.splitCollections)
                    .catch($log.err);
            },
            last: function($stateParams) {
                return $stateParams.index || null;
            },
            type: () => 'month'
        }
    });

});
