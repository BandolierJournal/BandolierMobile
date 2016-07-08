bulletApp.controller('LogCtrl', function($scope, collections, DateFactory, last, type, $rootScope, $stateParams, $ionicNavBarDelegate, $rootScope) {
    // $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    //   $ionicNavBarDelegate.align('left')
    //   $ionicNavBarDelegate.title($scope.title)
    //   $ionicNavBarDelegate.showBar($scope.title)
    //   $rootScope.$digest()
    // })
    const aged = collections[0];
    const future = collections[1];
    let index = aged.length;

    if ($stateParams.index && $stateParams.index.length) {
      index = +$stateParams.index
      if (index < 0) $scope.collections = aged.slice(0, index + 6);
      else navigate()
    } else {
      new6(0);
    }

    function new6(offset) {
        $scope.collections = [];

        DateFactory.display(offset, type).forEach((c) => {
            let use = future.find(el => el.title === c.title) || c;
            $scope.collections.push(use);
        });
    }

    $scope.title = ((type === 'day') ? 'DAILY' : 'FUTURE') + ' LOG';

    $scope.prev3 = function() {
        if (index <= 0) return;
        if (index < 3) {
            $scope.collections = aged.slice(0, index);
            index -= 3;
            $rootScope.$broadcast('pageChange', {index: index, type: type})
        } else {
            index -= 3;
            navigate();
        }
    }

    $scope.next3 = function() {
        index += 3;
        navigate();
    }

    function navigate() {
        $rootScope.$broadcast('pageChange', {index: index, type: type})
        if (index >= aged.length) new6(index - aged.length);
        else $scope.collections = aged.slice(index, index + 3);
    }

});
