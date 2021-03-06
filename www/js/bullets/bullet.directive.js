bulletApp.directive('bullet', function(DateFactory, $timeout, $rootScope) {
    return {
        restrict: 'E',
        templateUrl: 'js/bullets/bullet.template.html',
        scope: {
            bullet: '=',
            removeFn: '&',
            addFn: '&',
        },
        link: function(scope, element, attrs) {

            scope.showButton = 0;
            scope.enableButton = false;
            scope.typeDict = typeDict;
            scope.hideIcon = (attrs.noIcon) ? true : false;

            scope.editable = function() {
                if (!scope.bullet.status) return true;
                return scope.bullet.status === "incomplete" || scope.bullet.status === "new";
            }

            scope.toggleScheduler = function() {
                if (!scope.bullet.date) scope.bullet.date = new Date();
                scope.showScheduler = !scope.showScheduler;
            }

            scope.templateUrl = 'js/bullets/type.template.html';
            scope.datepickerUrl = 'js/bullets/datepicker.template.html';

            scope.selectType = function(b, type) {
                delete scope.bullet.status;
                scope.bullet = new Bullet[type](b);
            }

            scope.showButtonPanel = function(b) {
                return b.status === 'incomplete' &&
                    b.rev &&
                    scope.enableButtons;
            };

            scope.showScheduleButton = function(b) {
                return b.type !== 'Note';
            };

            scope.showMigrateButton = function(b) {
                return b.type === 'Task';
            };

            scope.migrate = function() {
                scope.bullet.migrate()
                    .then(() => scope.$evalAsync());
            };

            scope.options = {
                minMode: 'day'
            }

            scope.schedule = function(mode) {
                scope.bullet.date = DateFactory.roundDate(scope.bullet.date, mode);
                scope.showScheduler = false;
                if (mode === 'month') mode = 'future';
                scope.bullet.schedule(scope.bullet.date, mode)
                    .then(() => {
                        scope.$evalAsync();
                    });
            };

            // function editBullet(e) {
            //     if (scope.bullet.status !== 'migrated') {
            //         if (scope.editable()) {
            //             // cmd-t change to task
            //             delete scope.bullet.status;
            //             if (e.which === 84) return new Bullet.Task(scope.bullet);
            //             // cmd-e change to event
            //             if (e.which === 69) return new Bullet.Event(scope.bullet);
            //             // cmd-n change to note
            //             if (e.which === 78) return new Bullet.Note(scope.bullet);
            //         }
            //         // cmd-d toggle done for tasks
            //         if (e.which === 68 && scope.bullet.type === 'Task') return scope.bullet.toggleDone();
            //         // cmd-x cross out
            //         if (e.which === 88 && scope.bullet.type === 'Task') return scope.bullet.toggleStrike();
            //     }
            //     // cmd-del remove from collection
            //     if (e.which === 8) {
            //         if (scope.bullet.rev) {
            //             e.preventDefault();
            //             scope.removeFn()
            //                 .then(() => {
            //                     scope.$evalAsync();
            //                 });
            //         }
            //     }
            // }
            //
            // element.on('keydown', function(e) {
            //     if (e.which !== 9 && e.which !== 91) {
            //         if (e.which === 13) {
            //             console.log(e);
            //             e.preventDefault();
            //             e.target.blur();
            //         } else if ((OS === 'darwin' && e.metaKey) || (OS !== 'darwin' && e.ctrlKey)) {
            //             let updatedBullet = editBullet(e);
            //             if (updatedBullet) scope.bullet = updatedBullet;
            //         } else if (scope.bullet.status === 'struck' || scope.bullet.status === 'complete') {
            //             if (e.which !== 9) e.preventDefault();
            //         }
            //     }
            // });

            scope.save = function() {
                if (event.relatedTarget && event.relatedTarget.id === 'migrate') return;

                $timeout(function() {
                    if (!scope.bullet.rev) scope.addFn();
                    else scope.bullet.save();
                }, 100);

                $timeout(function() {
                    scope.enableButtons = false;
                }, 300);
            }

        }
    };
});
