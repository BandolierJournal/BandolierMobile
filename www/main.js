bulletApp.directive('contenteditable', function ($sanitize) {
  return {
    restrict: 'A',
    require: '?ngModel',
    link: function (scope, element, attrs, ngModel) {
      if (!ngModel) return;
      function read() {
        ngModel.$setViewValue(element.html());
      }
      ngModel.$render = function () {
        var sanitary = $sanitize(ngModel.$viewValue || '');
        element.html(sanitary);
      };
      element.bind('blur keyup change', function () {
        scope.$apply(read);
      });
    }
  };
});


bulletApp.directive('eatClick', function () {
  return {
    restrict: 'A',
    link: function (scope, element) {
      element.on('click', function () {
        return false;
      });
    }
  };
});

bulletApp.factory('currentStates', function ($rootScope) {
  var currentStates = {
    daily: null,
    month: null,
    future: null,
    generic: null,
    genericTitle: false
  }
  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    currentStates[toState.name] = toParams
    // These are useful for testing
    // console.log('ts', toState);
    // console.log('tp', toParams);
    // console.log('fs', fromState);
    // console.log('fp', fromParams);
  });

  $rootScope.$on('pageChange', function(event, args){
    if (args.type === 'month') currentStates.future = {index: args.index};
    if (args.type === 'day') currentStates.daily = {index: args.index};
  });

  //This console logs if there are errors in a state change
  $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams){
    console.log('err', event);
    console.log('ts', toState);
    console.log('tp', toParams);
    console.log('fs', fromState);
    console.log('fp', fromParams);
  });


  return currentStates
})

bulletApp.factory('DateFactory', function () {
    let today = moment().startOf('day').toISOString(); // TODO: make this a function (so today is always up to date)
    let yesterday = moment(today).subtract(1, 'days').toISOString();
    let thisMonth = moment().startOf('month').toISOString();

    function splitCollections(collections) {
        if (!collections.length) return [
            [],
            []
        ];
        let last = (collections[0].type === "day") ? yesterday : lastMonth();
        let split = _.partition(collections, function (c) {
            return c.title < last;
        })
        let aged = split[0].sort(chronoSort);
        let future = split[1];
        return [aged, future];
    }

    function chronoSort(a, b) {
        return new Date(a.title) - new Date(b.title);
    }

    function roundDate(date, type) {
        type = type || 'day'; // or month
        return moment(date).startOf(type).toISOString();
    }

    function display(offset, type) { //offset from today
        let display = [];
        let current = (type === 'day') ? today : thisMonth;
        for (let i = 1; i > -5; i--) {
            display.push(moment(current).subtract(i - offset, type + 's').toISOString());
        }
        if (type === 'month') type = 'future';
        return display.map((e, index) => new Collection({
            title: e,
            type: type,
            id: moment().add(index, 'milliseconds').toISOString()
        }));
    }


    function monthCal(month) {
        month = new Date(month);
        let day = month;
        let dayArray = [];
        while (day.getMonth() == month.getMonth()) {
            dayArray.push(day.toISOString());
            day = moment(day).add(1, 'days').toISOString();
            day = new Date(day);
        }
        return dayArray;
    }

    function getChoices(input) {
        let [month, day, year] = input.split(' ');
        let choices = [];
        if (!day) choices = moment.months()
        else if (!year) {
            for (let y of nextNYears(10)) {
                choices.push(`${month} ${y}`);
            }
            choices = [
                ...monthCal(moment().month(month).startOf('month'))
                .map(d => `${month} ${moment(d).date()}`),
                ...choices
            ];
        } else {
            for (let y of nextNYears(10)) {
                choices.push(`${month} ${day} ${y}`);
            }
        }
        return choices;
    }

    function convertDate(dateInput) {
        let [month, day, year] = dateInput.split(' ');
        let date = moment().month(month);
        let type = 'day';

        if(!year) {
            if(day < 32) date = date.date(day);
            else [date, type] = [roundDate(date.year(day), 'month'), 'future']
        } else date = date.date(day).year(year);
        return [roundDate(date), type];
    }

    function getWeekday(date) {
        let weekday = moment(date).isoWeekday();
        weekday = moment().isoWeekday(weekday).format('dddd')
        return weekday;
    }

    function lastMonth(currentMonth) {
        currentMonth = currentMonth || thisMonth
        return moment(currentMonth).subtract(1, 'month').toISOString()
    }

    function nextMonth(currentMonth) {
        currentMonth = currentMonth || thisMonth
        return moment(currentMonth).add(1, 'month').toISOString()
    }

    function* nextNYears(n) {
        let i = 0;
        const thisYear = moment(thisMonth).year();
        while (i < n) {
            yield thisYear + i;
            i++;
        }
    }


    return {
        display: display,
        roundDate: roundDate,
        monthCal: monthCal,
        splitCollections: splitCollections,
        getChoices: getChoices,
        convertDate: convertDate,
        today: today,
        thisMonth: thisMonth,
        lastMonth: lastMonth,
        nextMonth: nextMonth,
        getWeekday: getWeekday,
        nextNYears: nextNYears
    }
})

bulletApp.filter('displayType', function () {
  return function(input) {
    var output;
    switch(input) {
      case 'day':
        output = 'Daily Log';
        break;
      case 'month':
        output = 'Monthly Tracker';
        break;
      case 'month-cal':
        output = 'Monthly Tracker ';
        break;
      case 'future':
        output = 'Future Log';
        break;
      case 'generic':
        output = 'Custom';
        break;
      default:
        output = '';
        break;
    }
    return output
  }
})

bulletApp.filter('slice', function() {
  return function(arr, start, end) {
    return (arr || []).slice(start, end);
  };
});
bulletApp.filter('stateName', function () {
  return function(input) {
    var output;
    switch(input) {
      case 'day':
        output = 'daily';
        break;
      case 'month':
        output = 'month';
        break;
      case 'month-cal':
        output = 'month';
        break;
      case 'future':
        output = 'future';
        break;
      case 'generic':
        output = 'generic';
        break;
      default:
        output = '';
        break;
    }
    return output
  }
})

bulletApp.directive('addCollection', function($state, $filter) {
    return {
        restrict: 'E',
        templateUrl: 'js/add-collection/add-collection-template.html',
        scope: {
            collectionType: '@'
        },
        link: function(scope) {
            scope.collectionType = scope.collectionType || 'generic';
            // TODO: Add validations to create collections for day, month, etc.
            // ^^ Incorporate this into Sabrina's date validations
            scope.createCollection = function(collectionName) {
                new Collection(collectionName, scope.collectionType)
                    .save()
                    .then(collection => $state.go($filter('stateName')(scope.collectionType), { id: collection.id }))
                    .then(() => {
                        scope.collectionName = null;
                    })
            }

            scope.templateUrl = 'js/add-collection/collection-form.html';
        }
    }
})

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

/*jshint esversion: 6*/
bulletApp.directive('bulletIcon', function() {
    return {
        restrict: 'E',
        templateUrl: 'js/bullets/icon.template.html',
        scope: {
            bullet: '='
        },
        link: function(scope, element) {

            scope.iconType = function() {
                let type;
                if (!scope.bullet.status) type = scope.bullet.type;
                else type = scope.bullet.status === 'incomplete' ? scope.bullet.type : scope.bullet.status;
                return typeDict[type];
            };

            scope.toggleDone = function() {
                if (scope.bullet.type === "Task") {
                    scope.bullet.toggleDone();
                    scope.bullet.save();
                }
            };

        }
    };
});

/*jshint esversion: 6*/

bulletApp.directive('collection', function($log, $rootScope, currentStates, DateFactory){
    return {
        restrict: 'E',
        templateUrl: 'js/collections/collection.template.html',
        scope: {
            collection: '=',
            noAdd: '=',
            monthTitle: '=',
            noTitle: '='
        },
        link: function(scope) {
            scope.formattedTitle = scope.monthTitle ? formatTitle({title: scope.monthTitle, type: 'month'}) : formatTitle(scope.collection);
            
            scope.newBullet = new Bullet.Task({status: 'new'});

            function formatTitle(collection) {
                switch(collection.type) {
                    case 'month':
                        return 'Log'; //moment(collection.title).format('MMMM')+' Log';
                        break;
                    case 'future':
                        return moment(collection.title).format('MMM YYYY').toUpperCase();
                        break;
                    case 'day':
                        return DateFactory.getWeekday(collection.title)+', '+moment(collection.title).format('MMMM D');
                        break;
                    case 'month-cal':
                        return moment(collection.title).format('MMMM')+' Calendar';
                        break;
                    default:
                        return collection.title;
                }

            }

            /**********************************************************
            * This function will remove the bullet from the collection
            * and then make sure the bullet is also removed from the
            * local bullets array.
            **********************************************************/
            scope.removeBullet = function(bullet) {
                return scope.collection.removeBullet(bullet)
                .then(function(){
                  if (bullet.id) {
                    scope.collection.bullets = scope.collection.bullets.filter(b => b.id !== bullet.id);
                  }
                })
                .catch($log.err);
            };

            scope.addBullet = function(bullet) {
                if (bullet.content && bullet.content.length > 0) {
                  return scope.collection.addBullet(bullet)
                  .then(function(){
                      scope.newBullet = new Bullet.Task({status: 'new'})
                      scope.$evalAsync()
                  })
                  .catch($log.err);
              };
            }
        }
    };
});

bulletApp.directive('datePicker', function (DateFactory) {
    return {
        restrict: 'E',
        templateUrl: 'js/datepicker/datepicker.template.html',
        link: function (scope) {
            scope.getDates = DateFactory.getChoices;
        }
    };
});

bulletApp.directive('footer', function(currentStates, $state) {
    return {
        restrict: 'E',
        templateUrl: 'js/footer/footer.template.html',
        link: function(scope) {
            scope.currentStates = currentStates;
            scope.lastMonth = function() {
                if (currentStates.month) $state.go('month', currentStates.month)
                else $state.go('month', { monthString: moment().startOf('month').toISOString() }) //DateFactory.thisMonth.toISOString()
            };
            scope.lastDaily = function() {
                $state.go('daily', currentStates.daily)
            };
            scope.lastFuture = function() {
                $state.go('future', currentStates.future)
            };
            scope.lastGeneric = function() {
                $state.go('generic', currentStates.generic)
            };
        }
    };
});

bulletApp.controller('GenericCtrl', function($scope, collection, $state) {
    if (collection.type === 'month' || collection.type === 'month-cal') {
    	console.log(collection);
    	$state.go('month', { monthString: collection.title });
    }
    $scope.collection = collection;
});

bulletApp.config(function ($stateProvider) {

  $stateProvider.state('generic', {
    url: '/generic/:id',
    templateUrl: 'js/generic/generic.template.html',
    controller: 'GenericCtrl',
    resolve: {
        collection: function($stateParams, currentStates) {
            return Collection.findOrReturn({id: $stateParams.id})
                .then(c => {
                    currentStates.genericTitle = c[0].title
                    return c[0];
                });
        }
    }
  });

});

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

bulletApp.config(function ($stateProvider) {

  $stateProvider.state('index', {
    url: '/index',
    templateUrl: 'js/index/index.template.html',
    controller: 'IndexCtrl',
    resolve: {
        collections: function() {
            return Collection.fetchAll();
        },
        bullets: function() {
            return Bullet.fetchAll('event');
        }
    }
  });

});

bulletApp.config(function($stateProvider) {

    $stateProvider.state('daily', {
        url: '/daily/:index',
        templateUrl: 'js/log/log.template.html',
        controller: 'LogCtrl',
        resolve: {
            collections: function(DateFactory) {
                return Collection.fetchAll({ type: 'day' })
                    .then(DateFactory.splitCollections);
            },
            last: function($stateParams) {
                return $stateParams.index || null;
            },
            type: () => 'day'
        }
    });

});

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

/*jshint esversion: 6*/
bulletApp.directive('monthCal', function($log) {
    return {
        restrict: 'E',
        templateUrl: 'js/month-cal/month.cal.template.html',
        scope: {
            collection: '=',
            days: '=',
        },
        link: function(scope) {
            scope.formattedTitle = 'Calendar'; //moment(scope.collection.title).format('MMMM YYYY').toUpperCase();

            generateBulletList()

            function generateBulletList () {
              scope.bulletList = scope.days.map(day => {
                  return scope.collection.bullets.find(bullet => bullet.date === day) || new Bullet.Task({
                      date: day
                  });
              })
            }

            scope.removeBullet = function(bullet) {
                return scope.collection.removeBullet(bullet)
                .then(() => {
                  if (bullet.id) {
                    generateBulletList()
                  }
                  scope.$evalAsync()
                })
                .catch($log.err);
            };

            scope.addBullet = function(bullet) {
                if (bullet.content && bullet.content.length > 0) {
                    scope.collection.addBullet(bullet);
                };
            }
        }
    };
});

/*jshint esversion: 6*/

bulletApp.controller('MonthlyTrackerCtrl', function ($scope, collections, DateFactory, month, $state) {

    $scope.daysInMonth = DateFactory.monthCal(month);
    $scope.month = month;
    $scope.log = collections.find(i => i.type === "month") || new Collection(month, 'month');
    $scope.cal = collections.find(i => i.type === "month-cal") || new Collection(month, 'month-cal');
    $scope.future = collections.find(i => i.type === "future") || new Collection(month, 'future');

    $scope.nextMonth = function() {
      $state.go($state.current, {monthString: DateFactory.nextMonth($scope.month)})
    }
    $scope.lastMonth = function() {
      $state.go($state.current, {monthString: DateFactory.lastMonth($scope.month)})
    }
});

bulletApp.config(function($stateProvider) {
  $stateProvider.state('month', {
    url: '/month/:monthString',
    templateUrl: 'js/monthlytracker/monthlytracker.template.html',
    controller: 'MonthlyTrackerCtrl',
    resolve: {
      collections: function($stateParams, DateFactory) {
        const monthString = $stateParams.monthString || DateFactory.roundMonth(new Date).toISOString();
        return Collection.fetchAll({title: monthString});
      },
      month: function($stateParams, DateFactory) {
        return $stateParams.monthString || DateFactory.thisMonth;
      }
    }
  })
})

bulletApp.directive('refresh', function($state, $rootScope, AuthFactory){
    return {
        restrict: 'A',
        link: function(scope, element) {

            remoteDB.getSession()
            .then(res => {
                const username = res.userCtx.name;
                if(username) {
                    $rootScope.$apply(function(){
                        $rootScope.user = username;
                    });
                    AuthFactory.syncDB(username)
                }
            })
            .catch(console.error.bind(console))

            scope.syncing = function() {
                return $rootScope.sync;
            };

            scope.login = function() {
                if(!$rootScope.user) $state.go('signup');
            };
        }
    };
});

bulletApp.directive('searchBar', function(currentStates, $state) {
    return {
        restrict: 'E',
        templateUrl: 'js/search/search.template.html',
        link: function(scope) {
            scope.getBullets = function(search) {
                return Bullet.fetchAll(search);
            }
            scope.go = function(item) {
                if (item.collections.length) $state.go('generic', {id: item.collections[0]});
                else $state.go('index');
            }

        }
    };
});

/*jshint node:true, esversion:6*/
bulletApp.factory('AuthFactory', function ($state, $rootScope, $timeout) {

    const Auth = {};

    function createUserDB(user, verb) {
        let username = user.email.split('@')[0];
        return remoteDB[verb](username, user.password)
            .then(res => {
                console.log(res);
                return verb === 'signup' ? Auth.login(user) : res;
            })
            .then(res => {
                $rootScope.$apply(function(){
                    $rootScope.user = res.name;
                });
                console.log(Auth.syncDB(username));
                $state.go('index')
            })
            .catch(err => console.error("Couldn't signin: ", err));
    }

    Auth.syncDB = function(username) {
        remoteDB = new PouchDB(remoteDBAddress + userDBUrl(username), {
            skipSetup: true
        });
        return db.sync(remoteDB, {
                live: true,
                retry: true
            })
            .on('active', function () {
                $rootScope.$apply(function () {
                    $rootScope.sync = true;
                })
            })
            .on('paused', function () {
                $timeout(function() {
                    $rootScope.sync = false;
                }, 500);
            });
    }

    Auth.login = function (user) {
        return createUserDB(user, 'login');
    }

    Auth.signup = function (user) {
        return createUserDB(user, 'signup');
    }

    return Auth;
});

bulletApp.controller('signupCtrl', function($scope, AuthFactory){
    angular.extend($scope, AuthFactory);
});

bulletApp.config(function($stateProvider) {

    $stateProvider.state('signup', {
        url: '/signup',
        templateUrl: 'js/signup/signup.template.html',
        controller: 'signupCtrl'
    });

});

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// let db = require('./models')('bullet', {auto_compaction: true});
// let Collection = require('./models/collection')(db);
// let Bullet = require('./models/bullet')(db);
const remoteDBAddress = '/db';

const typeDict = {
    "Task": "fa-circle-o",
    "Event": "fa-first-order",
    "Note": "fa-long-arrow-right",
    "incomplete": "fa-circle-o",
    "complete": "fa-check-circle-o", //fa-check-square-o"
    "migrated": "fa-sign-out",
    "scheduled": "fa-angle-double-left",
    "struck": "strikethrough"
};

function userDBUrl(username){
    return `userdb-${username.toHex()}`;
}

String.prototype.toHex = function () {
    return this.split('').map(c => c.charCodeAt(0).toString(16)).join('');
};

let remoteDB = new PouchDB(remoteDBAddress);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl91dGlscy9jb250ZW50ZWRpdGFibGUuZGlyZWN0aXZlLmpzIiwiX3V0aWxzL2N1cnJlbnRzdGF0ZXMuZmFjdG9yeS5qcyIsIl91dGlscy9kYXRlLmZhY3RvcnkuanMiLCJfdXRpbHMvZGlzcGxheS50eXBlLmZpbHRlci5qcyIsIl91dGlscy9zbGljZS5maWx0ZXIuanMiLCJfdXRpbHMvc3RhdGUubmFtZS5maWx0ZXIuanMiLCJhZGQtY29sbGVjdGlvbi9hZGQtY29sbGVjdGlvbi1kaXJlY3RpdmUuanMiLCJidWxsZXRzL2J1bGxldC5kaXJlY3RpdmUuanMiLCJidWxsZXRzL2ljb24uZGlyZWN0aXZlLmpzIiwiY29sbGVjdGlvbnMvY29sbGVjdGlvbi5kaXJlY3RpdmUuanMiLCJkYXRlcGlja2VyL2RhdGVwaWNrZXIuZGlyZWN0aXZlLmpzIiwiZm9vdGVyL2Zvb3Rlci5kaXJlY3RpdmUuanMiLCJnZW5lcmljL2dlbmVyaWMuY29udHJvbGxlci5qcyIsImdlbmVyaWMvZ2VuZXJpYy5zdGF0ZS5qcyIsImluZGV4L2luZGV4LmNvbnRyb2xsZXIuanMiLCJpbmRleC9pbmRleC5zdGF0ZS5qcyIsImxvZy9kYWlseS5zdGF0ZS5qcyIsImxvZy9mdXR1cmUuc3RhdGUuanMiLCJsb2cvbG9nLmNvbnRyb2xsZXIuanMiLCJtb250aC1jYWwvbW9udGguY2FsLmRpcmVjdGl2ZS5qcyIsIm1vbnRobHl0cmFja2VyL21vbnRobHl0cmFja2VyLmNvbnRyb2xsZXIuanMiLCJtb250aGx5dHJhY2tlci9tb250aGx5dHJhY2tlci5zdGF0ZS5qcyIsInJlZnJlc2gvcmVmcmVzaFN0YXR1cy5kaXJlY3RpdmUuanMiLCJzZWFyY2gvc2VhcmNoLmRpcmVjdGl2ZS5qcyIsInNpZ251cC9hdXRoLmZhY3RvcnkuanMiLCJzaWdudXAvc2lnbnVwLmNvbnRyb2xsZXIuanMiLCJzaWdudXAvc2lnbnVwLnN0YXRlLmpzIiwicmVuZGVyZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJidWxsZXRBcHAuZGlyZWN0aXZlKCdjb250ZW50ZWRpdGFibGUnLCBmdW5jdGlvbiAoJHNhbml0aXplKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICByZXF1aXJlOiAnP25nTW9kZWwnLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIG5nTW9kZWwpIHtcbiAgICAgIGlmICghbmdNb2RlbCkgcmV0dXJuO1xuICAgICAgZnVuY3Rpb24gcmVhZCgpIHtcbiAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKGVsZW1lbnQuaHRtbCgpKTtcbiAgICAgIH1cbiAgICAgIG5nTW9kZWwuJHJlbmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNhbml0YXJ5ID0gJHNhbml0aXplKG5nTW9kZWwuJHZpZXdWYWx1ZSB8fCAnJyk7XG4gICAgICAgIGVsZW1lbnQuaHRtbChzYW5pdGFyeSk7XG4gICAgICB9O1xuICAgICAgZWxlbWVudC5iaW5kKCdibHVyIGtleXVwIGNoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2NvcGUuJGFwcGx5KHJlYWQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSk7XG5cblxuYnVsbGV0QXBwLmRpcmVjdGl2ZSgnZWF0Q2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsImJ1bGxldEFwcC5mYWN0b3J5KCdjdXJyZW50U3RhdGVzJywgZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgdmFyIGN1cnJlbnRTdGF0ZXMgPSB7XG4gICAgZGFpbHk6IG51bGwsXG4gICAgbW9udGg6IG51bGwsXG4gICAgZnV0dXJlOiBudWxsLFxuICAgIGdlbmVyaWM6IG51bGwsXG4gICAgZ2VuZXJpY1RpdGxlOiBmYWxzZVxuICB9XG4gICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24oZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMpe1xuICAgIGN1cnJlbnRTdGF0ZXNbdG9TdGF0ZS5uYW1lXSA9IHRvUGFyYW1zXG4gICAgLy8gVGhlc2UgYXJlIHVzZWZ1bCBmb3IgdGVzdGluZ1xuICAgIC8vIGNvbnNvbGUubG9nKCd0cycsIHRvU3RhdGUpO1xuICAgIC8vIGNvbnNvbGUubG9nKCd0cCcsIHRvUGFyYW1zKTtcbiAgICAvLyBjb25zb2xlLmxvZygnZnMnLCBmcm9tU3RhdGUpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdmcCcsIGZyb21QYXJhbXMpO1xuICB9KTtcblxuICAkcm9vdFNjb3BlLiRvbigncGFnZUNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50LCBhcmdzKXtcbiAgICBpZiAoYXJncy50eXBlID09PSAnbW9udGgnKSBjdXJyZW50U3RhdGVzLmZ1dHVyZSA9IHtpbmRleDogYXJncy5pbmRleH07XG4gICAgaWYgKGFyZ3MudHlwZSA9PT0gJ2RheScpIGN1cnJlbnRTdGF0ZXMuZGFpbHkgPSB7aW5kZXg6IGFyZ3MuaW5kZXh9O1xuICB9KTtcblxuICAvL1RoaXMgY29uc29sZSBsb2dzIGlmIHRoZXJlIGFyZSBlcnJvcnMgaW4gYSBzdGF0ZSBjaGFuZ2VcbiAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24oZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMpe1xuICAgIGNvbnNvbGUubG9nKCdlcnInLCBldmVudCk7XG4gICAgY29uc29sZS5sb2coJ3RzJywgdG9TdGF0ZSk7XG4gICAgY29uc29sZS5sb2coJ3RwJywgdG9QYXJhbXMpO1xuICAgIGNvbnNvbGUubG9nKCdmcycsIGZyb21TdGF0ZSk7XG4gICAgY29uc29sZS5sb2coJ2ZwJywgZnJvbVBhcmFtcyk7XG4gIH0pO1xuXG5cbiAgcmV0dXJuIGN1cnJlbnRTdGF0ZXNcbn0pXG4iLCJidWxsZXRBcHAuZmFjdG9yeSgnRGF0ZUZhY3RvcnknLCBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IHRvZGF5ID0gbW9tZW50KCkuc3RhcnRPZignZGF5JykudG9JU09TdHJpbmcoKTsgLy8gVE9ETzogbWFrZSB0aGlzIGEgZnVuY3Rpb24gKHNvIHRvZGF5IGlzIGFsd2F5cyB1cCB0byBkYXRlKVxuICAgIGxldCB5ZXN0ZXJkYXkgPSBtb21lbnQodG9kYXkpLnN1YnRyYWN0KDEsICdkYXlzJykudG9JU09TdHJpbmcoKTtcbiAgICBsZXQgdGhpc01vbnRoID0gbW9tZW50KCkuc3RhcnRPZignbW9udGgnKS50b0lTT1N0cmluZygpO1xuXG4gICAgZnVuY3Rpb24gc3BsaXRDb2xsZWN0aW9ucyhjb2xsZWN0aW9ucykge1xuICAgICAgICBpZiAoIWNvbGxlY3Rpb25zLmxlbmd0aCkgcmV0dXJuIFtcbiAgICAgICAgICAgIFtdLFxuICAgICAgICAgICAgW11cbiAgICAgICAgXTtcbiAgICAgICAgbGV0IGxhc3QgPSAoY29sbGVjdGlvbnNbMF0udHlwZSA9PT0gXCJkYXlcIikgPyB5ZXN0ZXJkYXkgOiBsYXN0TW9udGgoKTtcbiAgICAgICAgbGV0IHNwbGl0ID0gXy5wYXJ0aXRpb24oY29sbGVjdGlvbnMsIGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgICByZXR1cm4gYy50aXRsZSA8IGxhc3Q7XG4gICAgICAgIH0pXG4gICAgICAgIGxldCBhZ2VkID0gc3BsaXRbMF0uc29ydChjaHJvbm9Tb3J0KTtcbiAgICAgICAgbGV0IGZ1dHVyZSA9IHNwbGl0WzFdO1xuICAgICAgICByZXR1cm4gW2FnZWQsIGZ1dHVyZV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hyb25vU29ydChhLCBiKSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZShhLnRpdGxlKSAtIG5ldyBEYXRlKGIudGl0bGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJvdW5kRGF0ZShkYXRlLCB0eXBlKSB7XG4gICAgICAgIHR5cGUgPSB0eXBlIHx8ICdkYXknOyAvLyBvciBtb250aFxuICAgICAgICByZXR1cm4gbW9tZW50KGRhdGUpLnN0YXJ0T2YodHlwZSkudG9JU09TdHJpbmcoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXNwbGF5KG9mZnNldCwgdHlwZSkgeyAvL29mZnNldCBmcm9tIHRvZGF5XG4gICAgICAgIGxldCBkaXNwbGF5ID0gW107XG4gICAgICAgIGxldCBjdXJyZW50ID0gKHR5cGUgPT09ICdkYXknKSA/IHRvZGF5IDogdGhpc01vbnRoO1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA+IC01OyBpLS0pIHtcbiAgICAgICAgICAgIGRpc3BsYXkucHVzaChtb21lbnQoY3VycmVudCkuc3VidHJhY3QoaSAtIG9mZnNldCwgdHlwZSArICdzJykudG9JU09TdHJpbmcoKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdtb250aCcpIHR5cGUgPSAnZnV0dXJlJztcbiAgICAgICAgcmV0dXJuIGRpc3BsYXkubWFwKChlLCBpbmRleCkgPT4gbmV3IENvbGxlY3Rpb24oe1xuICAgICAgICAgICAgdGl0bGU6IGUsXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgaWQ6IG1vbWVudCgpLmFkZChpbmRleCwgJ21pbGxpc2Vjb25kcycpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgfSkpO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gbW9udGhDYWwobW9udGgpIHtcbiAgICAgICAgbW9udGggPSBuZXcgRGF0ZShtb250aCk7XG4gICAgICAgIGxldCBkYXkgPSBtb250aDtcbiAgICAgICAgbGV0IGRheUFycmF5ID0gW107XG4gICAgICAgIHdoaWxlIChkYXkuZ2V0TW9udGgoKSA9PSBtb250aC5nZXRNb250aCgpKSB7XG4gICAgICAgICAgICBkYXlBcnJheS5wdXNoKGRheS50b0lTT1N0cmluZygpKTtcbiAgICAgICAgICAgIGRheSA9IG1vbWVudChkYXkpLmFkZCgxLCAnZGF5cycpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBkYXkgPSBuZXcgRGF0ZShkYXkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXlBcnJheTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRDaG9pY2VzKGlucHV0KSB7XG4gICAgICAgIGxldCBbbW9udGgsIGRheSwgeWVhcl0gPSBpbnB1dC5zcGxpdCgnICcpO1xuICAgICAgICBsZXQgY2hvaWNlcyA9IFtdO1xuICAgICAgICBpZiAoIWRheSkgY2hvaWNlcyA9IG1vbWVudC5tb250aHMoKVxuICAgICAgICBlbHNlIGlmICgheWVhcikge1xuICAgICAgICAgICAgZm9yIChsZXQgeSBvZiBuZXh0TlllYXJzKDEwKSkge1xuICAgICAgICAgICAgICAgIGNob2ljZXMucHVzaChgJHttb250aH0gJHt5fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2hvaWNlcyA9IFtcbiAgICAgICAgICAgICAgICAuLi5tb250aENhbChtb21lbnQoKS5tb250aChtb250aCkuc3RhcnRPZignbW9udGgnKSlcbiAgICAgICAgICAgICAgICAubWFwKGQgPT4gYCR7bW9udGh9ICR7bW9tZW50KGQpLmRhdGUoKX1gKSxcbiAgICAgICAgICAgICAgICAuLi5jaG9pY2VzXG4gICAgICAgICAgICBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChsZXQgeSBvZiBuZXh0TlllYXJzKDEwKSkge1xuICAgICAgICAgICAgICAgIGNob2ljZXMucHVzaChgJHttb250aH0gJHtkYXl9ICR7eX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2hvaWNlcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb252ZXJ0RGF0ZShkYXRlSW5wdXQpIHtcbiAgICAgICAgbGV0IFttb250aCwgZGF5LCB5ZWFyXSA9IGRhdGVJbnB1dC5zcGxpdCgnICcpO1xuICAgICAgICBsZXQgZGF0ZSA9IG1vbWVudCgpLm1vbnRoKG1vbnRoKTtcbiAgICAgICAgbGV0IHR5cGUgPSAnZGF5JztcblxuICAgICAgICBpZigheWVhcikge1xuICAgICAgICAgICAgaWYoZGF5IDwgMzIpIGRhdGUgPSBkYXRlLmRhdGUoZGF5KTtcbiAgICAgICAgICAgIGVsc2UgW2RhdGUsIHR5cGVdID0gW3JvdW5kRGF0ZShkYXRlLnllYXIoZGF5KSwgJ21vbnRoJyksICdmdXR1cmUnXVxuICAgICAgICB9IGVsc2UgZGF0ZSA9IGRhdGUuZGF0ZShkYXkpLnllYXIoeWVhcik7XG4gICAgICAgIHJldHVybiBbcm91bmREYXRlKGRhdGUpLCB0eXBlXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRXZWVrZGF5KGRhdGUpIHtcbiAgICAgICAgbGV0IHdlZWtkYXkgPSBtb21lbnQoZGF0ZSkuaXNvV2Vla2RheSgpO1xuICAgICAgICB3ZWVrZGF5ID0gbW9tZW50KCkuaXNvV2Vla2RheSh3ZWVrZGF5KS5mb3JtYXQoJ2RkZGQnKVxuICAgICAgICByZXR1cm4gd2Vla2RheTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsYXN0TW9udGgoY3VycmVudE1vbnRoKSB7XG4gICAgICAgIGN1cnJlbnRNb250aCA9IGN1cnJlbnRNb250aCB8fCB0aGlzTW9udGhcbiAgICAgICAgcmV0dXJuIG1vbWVudChjdXJyZW50TW9udGgpLnN1YnRyYWN0KDEsICdtb250aCcpLnRvSVNPU3RyaW5nKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0TW9udGgoY3VycmVudE1vbnRoKSB7XG4gICAgICAgIGN1cnJlbnRNb250aCA9IGN1cnJlbnRNb250aCB8fCB0aGlzTW9udGhcbiAgICAgICAgcmV0dXJuIG1vbWVudChjdXJyZW50TW9udGgpLmFkZCgxLCAnbW9udGgnKS50b0lTT1N0cmluZygpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24qIG5leHROWWVhcnMobikge1xuICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgIGNvbnN0IHRoaXNZZWFyID0gbW9tZW50KHRoaXNNb250aCkueWVhcigpO1xuICAgICAgICB3aGlsZSAoaSA8IG4pIHtcbiAgICAgICAgICAgIHlpZWxkIHRoaXNZZWFyICsgaTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZGlzcGxheTogZGlzcGxheSxcbiAgICAgICAgcm91bmREYXRlOiByb3VuZERhdGUsXG4gICAgICAgIG1vbnRoQ2FsOiBtb250aENhbCxcbiAgICAgICAgc3BsaXRDb2xsZWN0aW9uczogc3BsaXRDb2xsZWN0aW9ucyxcbiAgICAgICAgZ2V0Q2hvaWNlczogZ2V0Q2hvaWNlcyxcbiAgICAgICAgY29udmVydERhdGU6IGNvbnZlcnREYXRlLFxuICAgICAgICB0b2RheTogdG9kYXksXG4gICAgICAgIHRoaXNNb250aDogdGhpc01vbnRoLFxuICAgICAgICBsYXN0TW9udGg6IGxhc3RNb250aCxcbiAgICAgICAgbmV4dE1vbnRoOiBuZXh0TW9udGgsXG4gICAgICAgIGdldFdlZWtkYXk6IGdldFdlZWtkYXksXG4gICAgICAgIG5leHROWWVhcnM6IG5leHROWWVhcnNcbiAgICB9XG59KVxuIiwiYnVsbGV0QXBwLmZpbHRlcignZGlzcGxheVR5cGUnLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuICAgIHZhciBvdXRwdXQ7XG4gICAgc3dpdGNoKGlucHV0KSB7XG4gICAgICBjYXNlICdkYXknOlxuICAgICAgICBvdXRwdXQgPSAnRGFpbHkgTG9nJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdtb250aCc6XG4gICAgICAgIG91dHB1dCA9ICdNb250aGx5IFRyYWNrZXInO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ21vbnRoLWNhbCc6XG4gICAgICAgIG91dHB1dCA9ICdNb250aGx5IFRyYWNrZXIgJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdmdXR1cmUnOlxuICAgICAgICBvdXRwdXQgPSAnRnV0dXJlIExvZyc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZ2VuZXJpYyc6XG4gICAgICAgIG91dHB1dCA9ICdDdXN0b20nO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG91dHB1dCA9ICcnO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dFxuICB9XG59KVxuIiwiYnVsbGV0QXBwLmZpbHRlcignc2xpY2UnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGFyciwgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoYXJyIHx8IFtdKS5zbGljZShzdGFydCwgZW5kKTtcbiAgfTtcbn0pOyIsImJ1bGxldEFwcC5maWx0ZXIoJ3N0YXRlTmFtZScsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgdmFyIG91dHB1dDtcbiAgICBzd2l0Y2goaW5wdXQpIHtcbiAgICAgIGNhc2UgJ2RheSc6XG4gICAgICAgIG91dHB1dCA9ICdkYWlseSc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbW9udGgnOlxuICAgICAgICBvdXRwdXQgPSAnbW9udGgnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ21vbnRoLWNhbCc6XG4gICAgICAgIG91dHB1dCA9ICdtb250aCc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZnV0dXJlJzpcbiAgICAgICAgb3V0cHV0ID0gJ2Z1dHVyZSc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZ2VuZXJpYyc6XG4gICAgICAgIG91dHB1dCA9ICdnZW5lcmljJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBvdXRwdXQgPSAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXRcbiAgfVxufSlcbiIsImJ1bGxldEFwcC5kaXJlY3RpdmUoJ2FkZENvbGxlY3Rpb24nLCBmdW5jdGlvbigkc3RhdGUsICRmaWx0ZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2FkZC1jb2xsZWN0aW9uL2FkZC1jb2xsZWN0aW9uLXRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgY29sbGVjdGlvblR5cGU6ICdAJ1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuY29sbGVjdGlvblR5cGUgPSBzY29wZS5jb2xsZWN0aW9uVHlwZSB8fCAnZ2VuZXJpYyc7XG4gICAgICAgICAgICAvLyBUT0RPOiBBZGQgdmFsaWRhdGlvbnMgdG8gY3JlYXRlIGNvbGxlY3Rpb25zIGZvciBkYXksIG1vbnRoLCBldGMuXG4gICAgICAgICAgICAvLyBeXiBJbmNvcnBvcmF0ZSB0aGlzIGludG8gU2FicmluYSdzIGRhdGUgdmFsaWRhdGlvbnNcbiAgICAgICAgICAgIHNjb3BlLmNyZWF0ZUNvbGxlY3Rpb24gPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSkge1xuICAgICAgICAgICAgICAgIG5ldyBDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lLCBzY29wZS5jb2xsZWN0aW9uVHlwZSlcbiAgICAgICAgICAgICAgICAgICAgLnNhdmUoKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihjb2xsZWN0aW9uID0+ICRzdGF0ZS5nbygkZmlsdGVyKCdzdGF0ZU5hbWUnKShzY29wZS5jb2xsZWN0aW9uVHlwZSksIHsgaWQ6IGNvbGxlY3Rpb24uaWQgfSkpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmNvbGxlY3Rpb25OYW1lID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUudGVtcGxhdGVVcmwgPSAnanMvYWRkLWNvbGxlY3Rpb24vY29sbGVjdGlvbi1mb3JtLmh0bWwnO1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImJ1bGxldEFwcC5kaXJlY3RpdmUoJ2J1bGxldCcsIGZ1bmN0aW9uKERhdGVGYWN0b3J5LCAkdGltZW91dCwgJHJvb3RTY29wZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYnVsbGV0cy9idWxsZXQudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBidWxsZXQ6ICc9JyxcbiAgICAgICAgICAgIHJlbW92ZUZuOiAnJicsXG4gICAgICAgICAgICBhZGRGbjogJyYnLFxuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblxuICAgICAgICAgICAgc2NvcGUuc2hvd0J1dHRvbiA9IDA7XG4gICAgICAgICAgICBzY29wZS5lbmFibGVCdXR0b24gPSBmYWxzZTtcbiAgICAgICAgICAgIHNjb3BlLnR5cGVEaWN0ID0gdHlwZURpY3Q7XG4gICAgICAgICAgICBzY29wZS5oaWRlSWNvbiA9IChhdHRycy5ub0ljb24pID8gdHJ1ZSA6IGZhbHNlO1xuXG4gICAgICAgICAgICBzY29wZS5lZGl0YWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghc2NvcGUuYnVsbGV0LnN0YXR1cykgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlLmJ1bGxldC5zdGF0dXMgPT09IFwiaW5jb21wbGV0ZVwiIHx8IHNjb3BlLmJ1bGxldC5zdGF0dXMgPT09IFwibmV3XCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnRvZ2dsZVNjaGVkdWxlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghc2NvcGUuYnVsbGV0LmRhdGUpIHNjb3BlLmJ1bGxldC5kYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93U2NoZWR1bGVyID0gIXNjb3BlLnNob3dTY2hlZHVsZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnRlbXBsYXRlVXJsID0gJ2pzL2J1bGxldHMvdHlwZS50ZW1wbGF0ZS5odG1sJztcbiAgICAgICAgICAgIHNjb3BlLmRhdGVwaWNrZXJVcmwgPSAnanMvYnVsbGV0cy9kYXRlcGlja2VyLnRlbXBsYXRlLmh0bWwnO1xuXG4gICAgICAgICAgICBzY29wZS5zZWxlY3RUeXBlID0gZnVuY3Rpb24oYiwgdHlwZSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5idWxsZXQuc3RhdHVzO1xuICAgICAgICAgICAgICAgIHNjb3BlLmJ1bGxldCA9IG5ldyBCdWxsZXRbdHlwZV0oYik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnNob3dCdXR0b25QYW5lbCA9IGZ1bmN0aW9uKGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYi5zdGF0dXMgPT09ICdpbmNvbXBsZXRlJyAmJlxuICAgICAgICAgICAgICAgICAgICBiLnJldiAmJlxuICAgICAgICAgICAgICAgICAgICBzY29wZS5lbmFibGVCdXR0b25zO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUuc2hvd1NjaGVkdWxlQnV0dG9uID0gZnVuY3Rpb24oYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBiLnR5cGUgIT09ICdOb3RlJztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLnNob3dNaWdyYXRlQnV0dG9uID0gZnVuY3Rpb24oYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBiLnR5cGUgPT09ICdUYXNrJztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLm1pZ3JhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5idWxsZXQubWlncmF0ZSgpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHNjb3BlLiRldmFsQXN5bmMoKSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5vcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG1pbk1vZGU6ICdkYXknXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnNjaGVkdWxlID0gZnVuY3Rpb24obW9kZSkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmJ1bGxldC5kYXRlID0gRGF0ZUZhY3Rvcnkucm91bmREYXRlKHNjb3BlLmJ1bGxldC5kYXRlLCBtb2RlKTtcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93U2NoZWR1bGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGUgPT09ICdtb250aCcpIG1vZGUgPSAnZnV0dXJlJztcbiAgICAgICAgICAgICAgICBzY29wZS5idWxsZXQuc2NoZWR1bGUoc2NvcGUuYnVsbGV0LmRhdGUsIG1vZGUpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBmdW5jdGlvbiBlZGl0QnVsbGV0KGUpIHtcbiAgICAgICAgICAgIC8vICAgICBpZiAoc2NvcGUuYnVsbGV0LnN0YXR1cyAhPT0gJ21pZ3JhdGVkJykge1xuICAgICAgICAgICAgLy8gICAgICAgICBpZiAoc2NvcGUuZWRpdGFibGUoKSkge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gY21kLXQgY2hhbmdlIHRvIHRhc2tcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5idWxsZXQuc3RhdHVzO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDg0KSByZXR1cm4gbmV3IEJ1bGxldC5UYXNrKHNjb3BlLmJ1bGxldCk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBjbWQtZSBjaGFuZ2UgdG8gZXZlbnRcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIGlmIChlLndoaWNoID09PSA2OSkgcmV0dXJuIG5ldyBCdWxsZXQuRXZlbnQoc2NvcGUuYnVsbGV0KTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIGNtZC1uIGNoYW5nZSB0byBub3RlXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gNzgpIHJldHVybiBuZXcgQnVsbGV0Lk5vdGUoc2NvcGUuYnVsbGV0KTtcbiAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgICAgICAvLyBjbWQtZCB0b2dnbGUgZG9uZSBmb3IgdGFza3NcbiAgICAgICAgICAgIC8vICAgICAgICAgaWYgKGUud2hpY2ggPT09IDY4ICYmIHNjb3BlLmJ1bGxldC50eXBlID09PSAnVGFzaycpIHJldHVybiBzY29wZS5idWxsZXQudG9nZ2xlRG9uZSgpO1xuICAgICAgICAgICAgLy8gICAgICAgICAvLyBjbWQteCBjcm9zcyBvdXRcbiAgICAgICAgICAgIC8vICAgICAgICAgaWYgKGUud2hpY2ggPT09IDg4ICYmIHNjb3BlLmJ1bGxldC50eXBlID09PSAnVGFzaycpIHJldHVybiBzY29wZS5idWxsZXQudG9nZ2xlU3RyaWtlKCk7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gICAgIC8vIGNtZC1kZWwgcmVtb3ZlIGZyb20gY29sbGVjdGlvblxuICAgICAgICAgICAgLy8gICAgIGlmIChlLndoaWNoID09PSA4KSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIGlmIChzY29wZS5idWxsZXQucmV2KSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBzY29wZS5yZW1vdmVGbigpXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICBzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gZWxlbWVudC5vbigna2V5ZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIC8vICAgICBpZiAoZS53aGljaCAhPT0gOSAmJiBlLndoaWNoICE9PSA5MSkge1xuICAgICAgICAgICAgLy8gICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgZS50YXJnZXQuYmx1cigpO1xuICAgICAgICAgICAgLy8gICAgICAgICB9IGVsc2UgaWYgKChPUyA9PT0gJ2RhcndpbicgJiYgZS5tZXRhS2V5KSB8fCAoT1MgIT09ICdkYXJ3aW4nICYmIGUuY3RybEtleSkpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIGxldCB1cGRhdGVkQnVsbGV0ID0gZWRpdEJ1bGxldChlKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIGlmICh1cGRhdGVkQnVsbGV0KSBzY29wZS5idWxsZXQgPSB1cGRhdGVkQnVsbGV0O1xuICAgICAgICAgICAgLy8gICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLmJ1bGxldC5zdGF0dXMgPT09ICdzdHJ1Y2snIHx8IHNjb3BlLmJ1bGxldC5zdGF0dXMgPT09ICdjb21wbGV0ZScpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIGlmIChlLndoaWNoICE9PSA5KSBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyB9KTtcblxuICAgICAgICAgICAgc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmIChldmVudC5yZWxhdGVkVGFyZ2V0ICYmIGV2ZW50LnJlbGF0ZWRUYXJnZXQuaWQgPT09ICdtaWdyYXRlJykgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUuYnVsbGV0LnJldikgc2NvcGUuYWRkRm4oKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBzY29wZS5idWxsZXQuc2F2ZSgpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG5cbiAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZW5hYmxlQnV0dG9ucyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0sIDMwMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH07XG59KTtcbiIsIi8qanNoaW50IGVzdmVyc2lvbjogNiovXG5idWxsZXRBcHAuZGlyZWN0aXZlKCdidWxsZXRJY29uJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9idWxsZXRzL2ljb24udGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBidWxsZXQ6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuXG4gICAgICAgICAgICBzY29wZS5pY29uVHlwZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGxldCB0eXBlO1xuICAgICAgICAgICAgICAgIGlmICghc2NvcGUuYnVsbGV0LnN0YXR1cykgdHlwZSA9IHNjb3BlLmJ1bGxldC50eXBlO1xuICAgICAgICAgICAgICAgIGVsc2UgdHlwZSA9IHNjb3BlLmJ1bGxldC5zdGF0dXMgPT09ICdpbmNvbXBsZXRlJyA/IHNjb3BlLmJ1bGxldC50eXBlIDogc2NvcGUuYnVsbGV0LnN0YXR1cztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZURpY3RbdHlwZV07XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS50b2dnbGVEb25lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNjb3BlLmJ1bGxldC50eXBlID09PSBcIlRhc2tcIikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5idWxsZXQudG9nZ2xlRG9uZSgpO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5idWxsZXQuc2F2ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgfVxuICAgIH07XG59KTtcbiIsIi8qanNoaW50IGVzdmVyc2lvbjogNiovXG5cbmJ1bGxldEFwcC5kaXJlY3RpdmUoJ2NvbGxlY3Rpb24nLCBmdW5jdGlvbigkbG9nLCAkcm9vdFNjb3BlLCBjdXJyZW50U3RhdGVzLCBEYXRlRmFjdG9yeSl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb2xsZWN0aW9ucy9jb2xsZWN0aW9uLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogJz0nLFxuICAgICAgICAgICAgbm9BZGQ6ICc9JyxcbiAgICAgICAgICAgIG1vbnRoVGl0bGU6ICc9JyxcbiAgICAgICAgICAgIG5vVGl0bGU6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZm9ybWF0dGVkVGl0bGUgPSBzY29wZS5tb250aFRpdGxlID8gZm9ybWF0VGl0bGUoe3RpdGxlOiBzY29wZS5tb250aFRpdGxlLCB0eXBlOiAnbW9udGgnfSkgOiBmb3JtYXRUaXRsZShzY29wZS5jb2xsZWN0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2NvcGUubmV3QnVsbGV0ID0gbmV3IEJ1bGxldC5UYXNrKHtzdGF0dXM6ICduZXcnfSk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGZvcm1hdFRpdGxlKGNvbGxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2goY29sbGVjdGlvbi50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21vbnRoJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnTG9nJzsgLy9tb21lbnQoY29sbGVjdGlvbi50aXRsZSkuZm9ybWF0KCdNTU1NJykrJyBMb2cnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Z1dHVyZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbW9tZW50KGNvbGxlY3Rpb24udGl0bGUpLmZvcm1hdCgnTU1NIFlZWVknKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RheSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRGF0ZUZhY3RvcnkuZ2V0V2Vla2RheShjb2xsZWN0aW9uLnRpdGxlKSsnLCAnK21vbWVudChjb2xsZWN0aW9uLnRpdGxlKS5mb3JtYXQoJ01NTU0gRCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21vbnRoLWNhbCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbW9tZW50KGNvbGxlY3Rpb24udGl0bGUpLmZvcm1hdCgnTU1NTScpKycgQ2FsZW5kYXInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29sbGVjdGlvbi50aXRsZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgICAgICogVGhpcyBmdW5jdGlvbiB3aWxsIHJlbW92ZSB0aGUgYnVsbGV0IGZyb20gdGhlIGNvbGxlY3Rpb25cbiAgICAgICAgICAgICogYW5kIHRoZW4gbWFrZSBzdXJlIHRoZSBidWxsZXQgaXMgYWxzbyByZW1vdmVkIGZyb20gdGhlXG4gICAgICAgICAgICAqIGxvY2FsIGJ1bGxldHMgYXJyYXkuXG4gICAgICAgICAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuICAgICAgICAgICAgc2NvcGUucmVtb3ZlQnVsbGV0ID0gZnVuY3Rpb24oYnVsbGV0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlLmNvbGxlY3Rpb24ucmVtb3ZlQnVsbGV0KGJ1bGxldClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgaWYgKGJ1bGxldC5pZCkge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5jb2xsZWN0aW9uLmJ1bGxldHMgPSBzY29wZS5jb2xsZWN0aW9uLmJ1bGxldHMuZmlsdGVyKGIgPT4gYi5pZCAhPT0gYnVsbGV0LmlkKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycik7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5hZGRCdWxsZXQgPSBmdW5jdGlvbihidWxsZXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoYnVsbGV0LmNvbnRlbnQgJiYgYnVsbGV0LmNvbnRlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlLmNvbGxlY3Rpb24uYWRkQnVsbGV0KGJ1bGxldClcbiAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgc2NvcGUubmV3QnVsbGV0ID0gbmV3IEJ1bGxldC5UYXNrKHtzdGF0dXM6ICduZXcnfSlcbiAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kZXZhbEFzeW5jKClcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAuY2F0Y2goJGxvZy5lcnIpO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiYnVsbGV0QXBwLmRpcmVjdGl2ZSgnZGF0ZVBpY2tlcicsIGZ1bmN0aW9uIChEYXRlRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZGF0ZXBpY2tlci9kYXRlcGlja2VyLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdldERhdGVzID0gRGF0ZUZhY3RvcnkuZ2V0Q2hvaWNlcztcbiAgICAgICAgfVxuICAgIH07XG59KTtcbiIsImJ1bGxldEFwcC5kaXJlY3RpdmUoJ2Zvb3RlcicsIGZ1bmN0aW9uKGN1cnJlbnRTdGF0ZXMsICRzdGF0ZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZm9vdGVyL2Zvb3Rlci50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRTdGF0ZXMgPSBjdXJyZW50U3RhdGVzO1xuICAgICAgICAgICAgc2NvcGUubGFzdE1vbnRoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRTdGF0ZXMubW9udGgpICRzdGF0ZS5nbygnbW9udGgnLCBjdXJyZW50U3RhdGVzLm1vbnRoKVxuICAgICAgICAgICAgICAgIGVsc2UgJHN0YXRlLmdvKCdtb250aCcsIHsgbW9udGhTdHJpbmc6IG1vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJykudG9JU09TdHJpbmcoKSB9KSAvL0RhdGVGYWN0b3J5LnRoaXNNb250aC50b0lTT1N0cmluZygpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUubGFzdERhaWx5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdkYWlseScsIGN1cnJlbnRTdGF0ZXMuZGFpbHkpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUubGFzdEZ1dHVyZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZnV0dXJlJywgY3VycmVudFN0YXRlcy5mdXR1cmUpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUubGFzdEdlbmVyaWMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2dlbmVyaWMnLCBjdXJyZW50U3RhdGVzLmdlbmVyaWMpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiYnVsbGV0QXBwLmNvbnRyb2xsZXIoJ0dlbmVyaWNDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBjb2xsZWN0aW9uLCAkc3RhdGUpIHtcbiAgICBpZiAoY29sbGVjdGlvbi50eXBlID09PSAnbW9udGgnIHx8IGNvbGxlY3Rpb24udHlwZSA9PT0gJ21vbnRoLWNhbCcpIHtcbiAgICBcdGNvbnNvbGUubG9nKGNvbGxlY3Rpb24pO1xuICAgIFx0JHN0YXRlLmdvKCdtb250aCcsIHsgbW9udGhTdHJpbmc6IGNvbGxlY3Rpb24udGl0bGUgfSk7XG4gICAgfVxuICAgICRzY29wZS5jb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcbn0pO1xuIiwiYnVsbGV0QXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZ2VuZXJpYycsIHtcbiAgICB1cmw6ICcvZ2VuZXJpYy86aWQnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvZ2VuZXJpYy9nZW5lcmljLnRlbXBsYXRlLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6ICdHZW5lcmljQ3RybCcsXG4gICAgcmVzb2x2ZToge1xuICAgICAgICBjb2xsZWN0aW9uOiBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIGN1cnJlbnRTdGF0ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBDb2xsZWN0aW9uLmZpbmRPclJldHVybih7aWQ6ICRzdGF0ZVBhcmFtcy5pZH0pXG4gICAgICAgICAgICAgICAgLnRoZW4oYyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTdGF0ZXMuZ2VuZXJpY1RpdGxlID0gY1swXS50aXRsZVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY1swXTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbn0pO1xuIiwiYnVsbGV0QXBwLmNvbnRyb2xsZXIoJ0luZGV4Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgY29sbGVjdGlvbnMsIGJ1bGxldHMsIEF1dGhGYWN0b3J5LCAkaW9uaWNOYXZCYXJEZWxlZ2F0ZSwgRGF0ZUZhY3RvcnkpIHtcbiAgICAkaW9uaWNOYXZCYXJEZWxlZ2F0ZS5hbGlnbignbGVmdCcpXG5cbiAgICAkc2NvcGUuY29sbGVjdGlvbnMgPSBjb2xsZWN0aW9ucy5maWx0ZXIoY29sID0+IGNvbC50eXBlID09PSAnZ2VuZXJpYycpO1xuICAgIGxldCBjdXJyZW50TW9udGggPSBEYXRlRmFjdG9yeS5yb3VuZERhdGUoRGF0ZUZhY3RvcnkudG9kYXksICdtb250aCcpXG4gICAgY29sbGVjdGlvbnMucHVzaCh7dHlwZTogJ21vbnRoJywgdGl0bGU6IGN1cnJlbnRNb250aH0pIC8vdGhpcyBpcyBraW5kYSBoYWNreS4gIGNvdWxkIHJlZmFjdG9yXG4gICAgJHNjb3BlLm1vbnRocyA9IF8uZ3JvdXBCeShjb2xsZWN0aW9ucy5maWx0ZXIoY29sID0+IGNvbC50eXBlID09PSAnbW9udGgnIHx8IGNvbC50eXBlID09PSAnbW9udGgtY2FsJyksIGkgPT4gaS50aXRsZSk7XG5cbiAgICAkc2NvcGUuZGVsZXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24pIHtcbiAgICAgICAgY29sbGVjdGlvbi5kZWxldGUoKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBpZHggPSAkc2NvcGUuY29sbGVjdGlvbnMuaW5kZXhPZihjb2xsZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29sbGVjdGlvbnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbn0pO1xuIiwiYnVsbGV0QXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaW5kZXgnLCB7XG4gICAgdXJsOiAnL2luZGV4JyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL2luZGV4L2luZGV4LnRlbXBsYXRlLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6ICdJbmRleEN0cmwnLFxuICAgIHJlc29sdmU6IHtcbiAgICAgICAgY29sbGVjdGlvbnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIENvbGxlY3Rpb24uZmV0Y2hBbGwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgYnVsbGV0czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gQnVsbGV0LmZldGNoQWxsKCdldmVudCcpO1xuICAgICAgICB9XG4gICAgfVxuICB9KTtcblxufSk7XG4iLCJidWxsZXRBcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZGFpbHknLCB7XG4gICAgICAgIHVybDogJy9kYWlseS86aW5kZXgnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZy9sb2cudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgY29sbGVjdGlvbnM6IGZ1bmN0aW9uKERhdGVGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIENvbGxlY3Rpb24uZmV0Y2hBbGwoeyB0eXBlOiAnZGF5JyB9KVxuICAgICAgICAgICAgICAgICAgICAudGhlbihEYXRlRmFjdG9yeS5zcGxpdENvbGxlY3Rpb25zKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsYXN0OiBmdW5jdGlvbigkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHN0YXRlUGFyYW1zLmluZGV4IHx8IG51bGw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdHlwZTogKCkgPT4gJ2RheSdcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcbiIsImJ1bGxldEFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdmdXR1cmUnLCB7XG4gICAgICAgIHVybDogJy9mdXR1cmUvOmluZGV4JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2cvbG9nLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9nQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb25zOiBmdW5jdGlvbihEYXRlRmFjdG9yeSwgJGxvZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBDb2xsZWN0aW9uLmZldGNoQWxsKHsgdHlwZTogJ2Z1dHVyZScgfSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oRGF0ZUZhY3Rvcnkuc3BsaXRDb2xsZWN0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKCRsb2cuZXJyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsYXN0OiBmdW5jdGlvbigkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHN0YXRlUGFyYW1zLmluZGV4IHx8IG51bGw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdHlwZTogKCkgPT4gJ21vbnRoJ1xuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuIiwiYnVsbGV0QXBwLmNvbnRyb2xsZXIoJ0xvZ0N0cmwnLCBmdW5jdGlvbigkc2NvcGUsIGNvbGxlY3Rpb25zLCBEYXRlRmFjdG9yeSwgbGFzdCwgdHlwZSwgJHJvb3RTY29wZSwgJHN0YXRlUGFyYW1zLCAkaW9uaWNOYXZCYXJEZWxlZ2F0ZSwgJHJvb3RTY29wZSkge1xuICAgIC8vICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24oZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMpe1xuICAgIC8vICAgJGlvbmljTmF2QmFyRGVsZWdhdGUuYWxpZ24oJ2xlZnQnKVxuICAgIC8vICAgJGlvbmljTmF2QmFyRGVsZWdhdGUudGl0bGUoJHNjb3BlLnRpdGxlKVxuICAgIC8vICAgJGlvbmljTmF2QmFyRGVsZWdhdGUuc2hvd0Jhcigkc2NvcGUudGl0bGUpXG4gICAgLy8gICAkcm9vdFNjb3BlLiRkaWdlc3QoKVxuICAgIC8vIH0pXG4gICAgY29uc3QgYWdlZCA9IGNvbGxlY3Rpb25zWzBdO1xuICAgIGNvbnN0IGZ1dHVyZSA9IGNvbGxlY3Rpb25zWzFdO1xuICAgIGxldCBpbmRleCA9IGFnZWQubGVuZ3RoO1xuXG4gICAgaWYgKCRzdGF0ZVBhcmFtcy5pbmRleCAmJiAkc3RhdGVQYXJhbXMuaW5kZXgubGVuZ3RoKSB7XG4gICAgICBpbmRleCA9ICskc3RhdGVQYXJhbXMuaW5kZXhcbiAgICAgIGlmIChpbmRleCA8IDApICRzY29wZS5jb2xsZWN0aW9ucyA9IGFnZWQuc2xpY2UoMCwgaW5kZXggKyA2KTtcbiAgICAgIGVsc2UgbmF2aWdhdGUoKVxuICAgIH0gZWxzZSB7XG4gICAgICBuZXc2KDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5ldzYob2Zmc2V0KSB7XG4gICAgICAgICRzY29wZS5jb2xsZWN0aW9ucyA9IFtdO1xuXG4gICAgICAgIERhdGVGYWN0b3J5LmRpc3BsYXkob2Zmc2V0LCB0eXBlKS5mb3JFYWNoKChjKSA9PiB7XG4gICAgICAgICAgICBsZXQgdXNlID0gZnV0dXJlLmZpbmQoZWwgPT4gZWwudGl0bGUgPT09IGMudGl0bGUpIHx8IGM7XG4gICAgICAgICAgICAkc2NvcGUuY29sbGVjdGlvbnMucHVzaCh1c2UpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAkc2NvcGUudGl0bGUgPSAoKHR5cGUgPT09ICdkYXknKSA/ICdEQUlMWScgOiAnRlVUVVJFJykgKyAnIExPRyc7XG5cbiAgICAkc2NvcGUucHJldjMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGluZGV4IDw9IDApIHJldHVybjtcbiAgICAgICAgaWYgKGluZGV4IDwgMykge1xuICAgICAgICAgICAgJHNjb3BlLmNvbGxlY3Rpb25zID0gYWdlZC5zbGljZSgwLCBpbmRleCk7XG4gICAgICAgICAgICBpbmRleCAtPSAzO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdwYWdlQ2hhbmdlJywge2luZGV4OiBpbmRleCwgdHlwZTogdHlwZX0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmRleCAtPSAzO1xuICAgICAgICAgICAgbmF2aWdhdGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgICRzY29wZS5uZXh0MyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICBuYXZpZ2F0ZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5hdmlnYXRlKCkge1xuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3BhZ2VDaGFuZ2UnLCB7aW5kZXg6IGluZGV4LCB0eXBlOiB0eXBlfSlcbiAgICAgICAgaWYgKGluZGV4ID49IGFnZWQubGVuZ3RoKSBuZXc2KGluZGV4IC0gYWdlZC5sZW5ndGgpO1xuICAgICAgICBlbHNlICRzY29wZS5jb2xsZWN0aW9ucyA9IGFnZWQuc2xpY2UoaW5kZXgsIGluZGV4ICsgMyk7XG4gICAgfVxuXG59KTtcbiIsIi8qanNoaW50IGVzdmVyc2lvbjogNiovXG5idWxsZXRBcHAuZGlyZWN0aXZlKCdtb250aENhbCcsIGZ1bmN0aW9uKCRsb2cpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL21vbnRoLWNhbC9tb250aC5jYWwudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiAnPScsXG4gICAgICAgICAgICBkYXlzOiAnPScsXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5mb3JtYXR0ZWRUaXRsZSA9ICdDYWxlbmRhcic7IC8vbW9tZW50KHNjb3BlLmNvbGxlY3Rpb24udGl0bGUpLmZvcm1hdCgnTU1NTSBZWVlZJykudG9VcHBlckNhc2UoKTtcblxuICAgICAgICAgICAgZ2VuZXJhdGVCdWxsZXRMaXN0KClcblxuICAgICAgICAgICAgZnVuY3Rpb24gZ2VuZXJhdGVCdWxsZXRMaXN0ICgpIHtcbiAgICAgICAgICAgICAgc2NvcGUuYnVsbGV0TGlzdCA9IHNjb3BlLmRheXMubWFwKGRheSA9PiB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuY29sbGVjdGlvbi5idWxsZXRzLmZpbmQoYnVsbGV0ID0+IGJ1bGxldC5kYXRlID09PSBkYXkpIHx8IG5ldyBCdWxsZXQuVGFzayh7XG4gICAgICAgICAgICAgICAgICAgICAgZGF0ZTogZGF5XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUucmVtb3ZlQnVsbGV0ID0gZnVuY3Rpb24oYnVsbGV0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlLmNvbGxlY3Rpb24ucmVtb3ZlQnVsbGV0KGJ1bGxldClcbiAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoYnVsbGV0LmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnVsbGV0TGlzdCgpXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBzY29wZS4kZXZhbEFzeW5jKClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycik7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5hZGRCdWxsZXQgPSBmdW5jdGlvbihidWxsZXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoYnVsbGV0LmNvbnRlbnQgJiYgYnVsbGV0LmNvbnRlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5jb2xsZWN0aW9uLmFkZEJ1bGxldChidWxsZXQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCIvKmpzaGludCBlc3ZlcnNpb246IDYqL1xuXG5idWxsZXRBcHAuY29udHJvbGxlcignTW9udGhseVRyYWNrZXJDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgY29sbGVjdGlvbnMsIERhdGVGYWN0b3J5LCBtb250aCwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUuZGF5c0luTW9udGggPSBEYXRlRmFjdG9yeS5tb250aENhbChtb250aCk7XG4gICAgJHNjb3BlLm1vbnRoID0gbW9udGg7XG4gICAgJHNjb3BlLmxvZyA9IGNvbGxlY3Rpb25zLmZpbmQoaSA9PiBpLnR5cGUgPT09IFwibW9udGhcIikgfHwgbmV3IENvbGxlY3Rpb24obW9udGgsICdtb250aCcpO1xuICAgICRzY29wZS5jYWwgPSBjb2xsZWN0aW9ucy5maW5kKGkgPT4gaS50eXBlID09PSBcIm1vbnRoLWNhbFwiKSB8fCBuZXcgQ29sbGVjdGlvbihtb250aCwgJ21vbnRoLWNhbCcpO1xuICAgICRzY29wZS5mdXR1cmUgPSBjb2xsZWN0aW9ucy5maW5kKGkgPT4gaS50eXBlID09PSBcImZ1dHVyZVwiKSB8fCBuZXcgQ29sbGVjdGlvbihtb250aCwgJ2Z1dHVyZScpO1xuXG4gICAgJHNjb3BlLm5leHRNb250aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHN0YXRlLmdvKCRzdGF0ZS5jdXJyZW50LCB7bW9udGhTdHJpbmc6IERhdGVGYWN0b3J5Lm5leHRNb250aCgkc2NvcGUubW9udGgpfSlcbiAgICB9XG4gICAgJHNjb3BlLmxhc3RNb250aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHN0YXRlLmdvKCRzdGF0ZS5jdXJyZW50LCB7bW9udGhTdHJpbmc6IERhdGVGYWN0b3J5Lmxhc3RNb250aCgkc2NvcGUubW9udGgpfSlcbiAgICB9XG59KTtcbiIsImJ1bGxldEFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21vbnRoJywge1xuICAgIHVybDogJy9tb250aC86bW9udGhTdHJpbmcnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvbW9udGhseXRyYWNrZXIvbW9udGhseXRyYWNrZXIudGVtcGxhdGUuaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ01vbnRobHlUcmFja2VyQ3RybCcsXG4gICAgcmVzb2x2ZToge1xuICAgICAgY29sbGVjdGlvbnM6IGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgRGF0ZUZhY3RvcnkpIHtcbiAgICAgICAgY29uc3QgbW9udGhTdHJpbmcgPSAkc3RhdGVQYXJhbXMubW9udGhTdHJpbmcgfHwgRGF0ZUZhY3Rvcnkucm91bmRNb250aChuZXcgRGF0ZSkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgcmV0dXJuIENvbGxlY3Rpb24uZmV0Y2hBbGwoe3RpdGxlOiBtb250aFN0cmluZ30pO1xuICAgICAgfSxcbiAgICAgIG1vbnRoOiBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIERhdGVGYWN0b3J5KSB7XG4gICAgICAgIHJldHVybiAkc3RhdGVQYXJhbXMubW9udGhTdHJpbmcgfHwgRGF0ZUZhY3RvcnkudGhpc01vbnRoO1xuICAgICAgfVxuICAgIH1cbiAgfSlcbn0pXG4iLCJidWxsZXRBcHAuZGlyZWN0aXZlKCdyZWZyZXNoJywgZnVuY3Rpb24oJHN0YXRlLCAkcm9vdFNjb3BlLCBBdXRoRmFjdG9yeSl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcblxuICAgICAgICAgICAgcmVtb3RlREIuZ2V0U2Vzc2lvbigpXG4gICAgICAgICAgICAudGhlbihyZXMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJuYW1lID0gcmVzLnVzZXJDdHgubmFtZTtcbiAgICAgICAgICAgICAgICBpZih1c2VybmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRhcHBseShmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gdXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBBdXRoRmFjdG9yeS5zeW5jREIodXNlcm5hbWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChjb25zb2xlLmVycm9yLmJpbmQoY29uc29sZSkpXG5cbiAgICAgICAgICAgIHNjb3BlLnN5bmNpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHJvb3RTY29wZS5zeW5jO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9naW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZighJHJvb3RTY29wZS51c2VyKSAkc3RhdGUuZ28oJ3NpZ251cCcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG59KTtcbiIsImJ1bGxldEFwcC5kaXJlY3RpdmUoJ3NlYXJjaEJhcicsIGZ1bmN0aW9uKGN1cnJlbnRTdGF0ZXMsICRzdGF0ZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc2VhcmNoL3NlYXJjaC50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdldEJ1bGxldHMgPSBmdW5jdGlvbihzZWFyY2gpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQnVsbGV0LmZldGNoQWxsKHNlYXJjaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzY29wZS5nbyA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5jb2xsZWN0aW9ucy5sZW5ndGgpICRzdGF0ZS5nbygnZ2VuZXJpYycsIHtpZDogaXRlbS5jb2xsZWN0aW9uc1swXX0pO1xuICAgICAgICAgICAgICAgIGVsc2UgJHN0YXRlLmdvKCdpbmRleCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCIvKmpzaGludCBub2RlOnRydWUsIGVzdmVyc2lvbjo2Ki9cbmJ1bGxldEFwcC5mYWN0b3J5KCdBdXRoRmFjdG9yeScsIGZ1bmN0aW9uICgkc3RhdGUsICRyb290U2NvcGUsICR0aW1lb3V0KSB7XG5cbiAgICBjb25zdCBBdXRoID0ge307XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VyREIodXNlciwgdmVyYikge1xuICAgICAgICBsZXQgdXNlcm5hbWUgPSB1c2VyLmVtYWlsLnNwbGl0KCdAJylbMF07XG4gICAgICAgIHJldHVybiByZW1vdGVEQlt2ZXJiXSh1c2VybmFtZSwgdXNlci5wYXNzd29yZClcbiAgICAgICAgICAgIC50aGVuKHJlcyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmVyYiA9PT0gJ3NpZ251cCcgPyBBdXRoLmxvZ2luKHVzZXIpIDogcmVzO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKHJlcyA9PiB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYXBwbHkoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gcmVzLm5hbWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coQXV0aC5zeW5jREIodXNlcm5hbWUpKTtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2luZGV4JylcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZXJyID0+IGNvbnNvbGUuZXJyb3IoXCJDb3VsZG4ndCBzaWduaW46IFwiLCBlcnIpKTtcbiAgICB9XG5cbiAgICBBdXRoLnN5bmNEQiA9IGZ1bmN0aW9uKHVzZXJuYW1lKSB7XG4gICAgICAgIHJlbW90ZURCID0gbmV3IFBvdWNoREIocmVtb3RlREJBZGRyZXNzICsgdXNlckRCVXJsKHVzZXJuYW1lKSwge1xuICAgICAgICAgICAgc2tpcFNldHVwOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGIuc3luYyhyZW1vdGVEQiwge1xuICAgICAgICAgICAgICAgIGxpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgcmV0cnk6IHRydWVcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ2FjdGl2ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc3luYyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ3BhdXNlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zeW5jID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIEF1dGgubG9naW4gPSBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gY3JlYXRlVXNlckRCKHVzZXIsICdsb2dpbicpO1xuICAgIH1cblxuICAgIEF1dGguc2lnbnVwID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVVzZXJEQih1c2VyLCAnc2lnbnVwJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEF1dGg7XG59KTtcbiIsImJ1bGxldEFwcC5jb250cm9sbGVyKCdzaWdudXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoRmFjdG9yeSl7XG4gICAgYW5ndWxhci5leHRlbmQoJHNjb3BlLCBBdXRoRmFjdG9yeSk7XG59KTtcbiIsImJ1bGxldEFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdzaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcbiIsIi8vIFRoaXMgZmlsZSBpcyByZXF1aXJlZCBieSB0aGUgaW5kZXguaHRtbCBmaWxlIGFuZCB3aWxsXG4vLyBiZSBleGVjdXRlZCBpbiB0aGUgcmVuZGVyZXIgcHJvY2VzcyBmb3IgdGhhdCB3aW5kb3cuXG4vLyBBbGwgb2YgdGhlIE5vZGUuanMgQVBJcyBhcmUgYXZhaWxhYmxlIGluIHRoaXMgcHJvY2Vzcy5cblxuLy8gbGV0IGRiID0gcmVxdWlyZSgnLi9tb2RlbHMnKSgnYnVsbGV0Jywge2F1dG9fY29tcGFjdGlvbjogdHJ1ZX0pO1xuLy8gbGV0IENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL21vZGVscy9jb2xsZWN0aW9uJykoZGIpO1xuLy8gbGV0IEJ1bGxldCA9IHJlcXVpcmUoJy4vbW9kZWxzL2J1bGxldCcpKGRiKTtcbmNvbnN0IHJlbW90ZURCQWRkcmVzcyA9ICcvZGInO1xuXG5jb25zdCB0eXBlRGljdCA9IHtcbiAgICBcIlRhc2tcIjogXCJmYS1jaXJjbGUtb1wiLFxuICAgIFwiRXZlbnRcIjogXCJmYS1maXJzdC1vcmRlclwiLFxuICAgIFwiTm90ZVwiOiBcImZhLWxvbmctYXJyb3ctcmlnaHRcIixcbiAgICBcImluY29tcGxldGVcIjogXCJmYS1jaXJjbGUtb1wiLFxuICAgIFwiY29tcGxldGVcIjogXCJmYS1jaGVjay1jaXJjbGUtb1wiLCAvL2ZhLWNoZWNrLXNxdWFyZS1vXCJcbiAgICBcIm1pZ3JhdGVkXCI6IFwiZmEtc2lnbi1vdXRcIixcbiAgICBcInNjaGVkdWxlZFwiOiBcImZhLWFuZ2xlLWRvdWJsZS1sZWZ0XCIsXG4gICAgXCJzdHJ1Y2tcIjogXCJzdHJpa2V0aHJvdWdoXCJcbn07XG5cbmZ1bmN0aW9uIHVzZXJEQlVybCh1c2VybmFtZSl7XG4gICAgcmV0dXJuIGB1c2VyZGItJHt1c2VybmFtZS50b0hleCgpfWA7XG59XG5cblN0cmluZy5wcm90b3R5cGUudG9IZXggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3BsaXQoJycpLm1hcChjID0+IGMuY2hhckNvZGVBdCgwKS50b1N0cmluZygxNikpLmpvaW4oJycpO1xufTtcblxubGV0IHJlbW90ZURCID0gbmV3IFBvdWNoREIocmVtb3RlREJBZGRyZXNzKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
