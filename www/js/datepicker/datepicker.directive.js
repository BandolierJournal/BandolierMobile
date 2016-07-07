bulletApp.directive('datePicker', function (DateFactory) {
    return {
        restrict: 'E',
        templateUrl: 'js/datepicker/datepicker.template.html',
        link: function (scope) {
            scope.getDates = DateFactory.getChoices;
        }
    };
});
