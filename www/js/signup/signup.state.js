bulletApp.config(function($stateProvider) {

    $stateProvider.state('signup', {
        url: '/signup',
        templateUrl: 'js/signup/signup.template.html',
        controller: 'signupCtrl'
    });

});
