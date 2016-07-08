bulletApp.controller('IndexCtrl', function($scope, collections, bullets, AuthFactory, $ionicNavBarDelegate, DateFactory) {
    $ionicNavBarDelegate.align('left')

    $scope.collections = collections.filter(col => col.type === 'generic');
    let currentMonth = DateFactory.roundDate(DateFactory.today, 'month')
    collections.push({type: 'month', title: currentMonth}) //this is kinda hacky.  could refactor
    $scope.months = _.groupBy(collections.filter(col => col.type === 'month' || col.type === 'month-cal'), i => i.title);

    $scope.deleteCollection = function(collection) {
        collection.delete()
            .then(() => {
                let idx = $scope.collections.indexOf(collection);
                $scope.collections.splice(idx, 1);
                $scope.$evalAsync();
            });
    }
});
