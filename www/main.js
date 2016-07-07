// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
const bulletApp = angular.module('bulletApp', ['ui.router', 'ui.bootstrap', 'ngSanitize', 'ionic']);

bulletApp.config(function ($urlRouterProvider) {
        $urlRouterProvider.otherwise('/index');
    })
    .run(function ($window, $rootScope) {
        /* Connection Status Detection and Update */
        $rootScope.online = navigator.onLine;

        $window.addEventListener("offline", function () {
            $rootScope.$apply(function () {
                $rootScope.online = false;
            });
        }, false);

        $window.addEventListener("online", function () {
            $rootScope.$apply(function () {
                $rootScope.online = true;
            });
        }, false);
    });

bulletApp.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

let db = require('./models')('bullet', {auto_compaction: true});
let Collection = require('./models/collection')(db);
let Bullet = require('./models/bullet')(db);
const remoteDBAddress = 'http://50.112.218.37:5984/';
const Moment = require('moment');

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
    // console.log('err', event);
    // console.log('ts', toState);
    // console.log('tp', toParams);
    // console.log('fs', fromState);
    // console.log('fp', fromParams);
  });


  return currentStates
})

bulletApp.factory('DateFactory', function () {
    let today = Moment().startOf('day').toISOString(); // TODO: make this a function (so today is always up to date)
    let yesterday = Moment(today).subtract(1, 'days').toISOString();
    let thisMonth = Moment().startOf('month').toISOString();

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
        return Moment(date).startOf(type).toISOString();
    }

    function display(offset, type) { //offset from today
        let display = [];
        let current = (type === 'day') ? today : thisMonth;
        for (let i = 1; i > -5; i--) {
            display.push(Moment(current).subtract(i - offset, type + 's').toISOString());
        }
        if (type === 'month') type = 'future';
        return display.map((e, index) => new Collection({
            title: e,
            type: type,
            id: Moment().add(index, 'milliseconds').toISOString()
        }));
    }


    function monthCal(month) {
        month = new Date(month);
        let day = month;
        let dayArray = [];
        while (day.getMonth() == month.getMonth()) {
            dayArray.push(day.toISOString());
            day = Moment(day).add(1, 'days').toISOString();
            day = new Date(day);
        }
        return dayArray;
    }

    function getChoices(input) {
        let [month, day, year] = input.split(' ');
        let choices = [];
        if (!day) choices = Moment.months()
        else if (!year) {
            for (let y of nextNYears(10)) {
                choices.push(`${month} ${y}`);
            }
            choices = [
                ...monthCal(Moment().month(month).startOf('month'))
                .map(d => `${month} ${Moment(d).date()}`),
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
        let date = Moment().month(month);
        let type = 'day';

        if(!year) {
            if(day < 32) date = date.date(day);
            else [date, type] = [roundDate(date.year(day), 'month'), 'future']
        } else date = date.date(day).year(year);
        return [roundDate(date), type];
    }

    function getWeekday(date) {
        let weekday = Moment(date).isoWeekday();
        weekday = Moment().isoWeekday(weekday).format('dddd')
        return weekday;
    }

    function lastMonth(currentMonth) {
        currentMonth = currentMonth || thisMonth
        return Moment(currentMonth).subtract(1, 'month').toISOString()
    }

    function nextMonth(currentMonth) {
        currentMonth = currentMonth || thisMonth
        return Moment(currentMonth).add(1, 'month').toISOString()
    }

    function* nextNYears(n) {
        let i = 0;
        const thisYear = Moment(thisMonth).year();
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
        output = 'Day';
        break;
      case 'month':
        output = 'Month';
        break;
      case 'month-cal':
        output = 'Monthly Calendar';
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
        templateUrl: 'scripts/add-collection/add-collection-template.html',
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

            scope.templateUrl = 'scripts/add-collection/collection-form.html';
        }
    }
})

bulletApp.directive('bullet', function(DateFactory, $timeout, $rootScope) {
    return {
        restrict: 'E',
        templateUrl: 'scripts/bullets/bullet.template.html',
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

            scope.templateUrl = 'scripts/bullets/type.template.html';
            scope.datepickerUrl = 'scripts/bullets/datepicker.template.html';

            scope.selectType = function(b, type) {
                delete scope.bullet.status;
                scope.bullet = new Bullet[type](b);
            }

            const OS = process.platform;

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

            function editBullet(e) {
                if (scope.bullet.status !== 'migrated') {
                    if (scope.editable()) {
                        // cmd-t change to task
                        delete scope.bullet.status;
                        if (e.which === 84) return new Bullet.Task(scope.bullet);
                        // cmd-e change to event
                        if (e.which === 69) return new Bullet.Event(scope.bullet);
                        // cmd-n change to note
                        if (e.which === 78) return new Bullet.Note(scope.bullet);
                    }
                    // cmd-d toggle done for tasks
                    if (e.which === 68 && scope.bullet.type === 'Task') return scope.bullet.toggleDone();
                    // cmd-x cross out
                    if (e.which === 88 && scope.bullet.type === 'Task') return scope.bullet.toggleStrike();
                }
                // cmd-del remove from collection
                if (e.which === 8) {
                    if (scope.bullet.rev) {
                        e.preventDefault();
                        scope.removeFn()
                            .then(() => {
                                scope.$evalAsync();
                            });
                    }
                }
            }

            element.on('keydown', function(e) {
                if (e.which !== 9 && e.which !== 91) {
                    if (e.which === 13) {
                        console.log(e);
                        e.preventDefault();
                        e.target.blur();
                    } else if ((OS === 'darwin' && e.metaKey) || (OS !== 'darwin' && e.ctrlKey)) {
                        let updatedBullet = editBullet(e);
                        if (updatedBullet) scope.bullet = updatedBullet;
                    } else if (scope.bullet.status === 'struck' || scope.bullet.status === 'complete') {
                        if (e.which !== 9) e.preventDefault();
                    }
                }
            });

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
        templateUrl: 'scripts/bullets/icon.template.html',
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
        templateUrl: 'scripts/collections/collection.template.html',
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
                        return 'Log'; //Moment(collection.title).format('MMMM')+' Log';
                        break;
                    case 'future':
                        return Moment(collection.title).format('MMM YYYY').toUpperCase();
                        break;
                    case 'day':
                        return DateFactory.getWeekday(collection.title)+', '+Moment(collection.title).format('MMMM D');
                        break;
                    case 'month-cal':
                        return Moment(collection.title).format('MMMM')+' Calendar';
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
        templateUrl: 'scripts/datepicker/datepicker.template.html',
        link: function (scope) {
            scope.getDates = DateFactory.getChoices;
        }
    };
});

bulletApp.directive('footer', function(currentStates, $state) {
    return {
        restrict: 'E',
        templateUrl: 'scripts/footer/footer.template.html',
        link: function(scope) {
            scope.currentStates = currentStates;
            scope.lastMonth = function() {
                if (currentStates.month) $state.go('month', currentStates.month)
                else $state.go('month', { monthString: Moment().startOf('month').toISOString() }) //DateFactory.thisMonth.toISOString()
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
    templateUrl: 'scripts/generic/generic.template.html',
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

bulletApp.controller('IndexCtrl', function($scope, collections, bullets, AuthFactory) {
    $scope.collections = collections.filter(col => col.type === 'generic');
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
    templateUrl: 'scripts/index/index.template.html',
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
        templateUrl: 'scripts/log/log.template.html',
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
        templateUrl: 'scripts/log/log.template.html',
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

bulletApp.controller('LogCtrl', function($scope, collections, DateFactory, last, type, $rootScope, $stateParams) {

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

    $scope.prev6 = function() {
        if (index <= 0) return;
        if (index < 6) {
            $scope.collections = aged.slice(0, index);
            index -= 6;
            $rootScope.$broadcast('pageChange', {index: index, type: type})
        } else {
            index -= 6;
            navigate();
        }
    }

    $scope.next6 = function() {
        index += 6;
        navigate();
    }

    function navigate() {
        $rootScope.$broadcast('pageChange', {index: index, type: type})
        if (index >= aged.length) new6(index - aged.length);
        else $scope.collections = aged.slice(index, index + 6);
    }

});

/*jshint esversion: 6*/
bulletApp.directive('monthCal', function($log) {
    return {
        restrict: 'E',
        templateUrl: 'scripts/month-cal/month.cal.template.html',
        scope: {
            collection: '=',
            days: '=',
        },
        link: function(scope) {
            scope.formattedTitle = 'Calendar'; //Moment(scope.collection.title).format('MMMM YYYY').toUpperCase();

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
    templateUrl: 'scripts/monthlytracker/monthlytracker.template.html',
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
        templateUrl: 'scripts/search/search.template.html',
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
        templateUrl: 'scripts/signup/signup.template.html',
        controller: 'signupCtrl'
    });

});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsInJlbmRlcmVyLmpzIiwiX3V0aWxzL2NvbnRlbnRlZGl0YWJsZS5kaXJlY3RpdmUuanMiLCJfdXRpbHMvY3VycmVudHN0YXRlcy5mYWN0b3J5LmpzIiwiX3V0aWxzL2RhdGUuZmFjdG9yeS5qcyIsIl91dGlscy9kaXNwbGF5LnR5cGUuZmlsdGVyLmpzIiwiX3V0aWxzL3NsaWNlLmZpbHRlci5qcyIsIl91dGlscy9zdGF0ZS5uYW1lLmZpbHRlci5qcyIsImFkZC1jb2xsZWN0aW9uL2FkZC1jb2xsZWN0aW9uLWRpcmVjdGl2ZS5qcyIsImJ1bGxldHMvYnVsbGV0LmRpcmVjdGl2ZS5qcyIsImJ1bGxldHMvaWNvbi5kaXJlY3RpdmUuanMiLCJjb2xsZWN0aW9ucy9jb2xsZWN0aW9uLmRpcmVjdGl2ZS5qcyIsImRhdGVwaWNrZXIvZGF0ZXBpY2tlci5kaXJlY3RpdmUuanMiLCJmb290ZXIvZm9vdGVyLmRpcmVjdGl2ZS5qcyIsImdlbmVyaWMvZ2VuZXJpYy5jb250cm9sbGVyLmpzIiwiZ2VuZXJpYy9nZW5lcmljLnN0YXRlLmpzIiwiaW5kZXgvaW5kZXguY29udHJvbGxlci5qcyIsImluZGV4L2luZGV4LnN0YXRlLmpzIiwibG9nL2RhaWx5LnN0YXRlLmpzIiwibG9nL2Z1dHVyZS5zdGF0ZS5qcyIsImxvZy9sb2cuY29udHJvbGxlci5qcyIsIm1vbnRoLWNhbC9tb250aC5jYWwuZGlyZWN0aXZlLmpzIiwibW9udGhseXRyYWNrZXIvbW9udGhseXRyYWNrZXIuY29udHJvbGxlci5qcyIsIm1vbnRobHl0cmFja2VyL21vbnRobHl0cmFja2VyLnN0YXRlLmpzIiwicmVmcmVzaC9yZWZyZXNoU3RhdHVzLmRpcmVjdGl2ZS5qcyIsInNlYXJjaC9zZWFyY2guZGlyZWN0aXZlLmpzIiwic2lnbnVwL2F1dGguZmFjdG9yeS5qcyIsInNpZ251cC9zaWdudXAuY29udHJvbGxlci5qcyIsInNpZ251cC9zaWdudXAuc3RhdGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gSW9uaWMgU3RhcnRlciBBcHBcblxuLy8gYW5ndWxhci5tb2R1bGUgaXMgYSBnbG9iYWwgcGxhY2UgZm9yIGNyZWF0aW5nLCByZWdpc3RlcmluZyBhbmQgcmV0cmlldmluZyBBbmd1bGFyIG1vZHVsZXNcbi8vICdzdGFydGVyJyBpcyB0aGUgbmFtZSBvZiB0aGlzIGFuZ3VsYXIgbW9kdWxlIGV4YW1wbGUgKGFsc28gc2V0IGluIGEgPGJvZHk+IGF0dHJpYnV0ZSBpbiBpbmRleC5odG1sKVxuLy8gdGhlIDJuZCBwYXJhbWV0ZXIgaXMgYW4gYXJyYXkgb2YgJ3JlcXVpcmVzJ1xuY29uc3QgYnVsbGV0QXBwID0gYW5ndWxhci5tb2R1bGUoJ2J1bGxldEFwcCcsIFsndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ1Nhbml0aXplJywgJ2lvbmljJ10pO1xuXG5idWxsZXRBcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIpIHtcbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnL2luZGV4Jyk7XG4gICAgfSlcbiAgICAucnVuKGZ1bmN0aW9uICgkd2luZG93LCAkcm9vdFNjb3BlKSB7XG4gICAgICAgIC8qIENvbm5lY3Rpb24gU3RhdHVzIERldGVjdGlvbiBhbmQgVXBkYXRlICovXG4gICAgICAgICRyb290U2NvcGUub25saW5lID0gbmF2aWdhdG9yLm9uTGluZTtcblxuICAgICAgICAkd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJvZmZsaW5lXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLm9ubGluZSA9IGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAkd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJvbmxpbmVcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUub25saW5lID0gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmYWxzZSk7XG4gICAgfSk7XG5cbmJ1bGxldEFwcC5ydW4oZnVuY3Rpb24oJGlvbmljUGxhdGZvcm0pIHtcbiAgJGlvbmljUGxhdGZvcm0ucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgaWYod2luZG93LmNvcmRvdmEgJiYgd2luZG93LmNvcmRvdmEucGx1Z2lucy5LZXlib2FyZCkge1xuICAgICAgLy8gSGlkZSB0aGUgYWNjZXNzb3J5IGJhciBieSBkZWZhdWx0IChyZW1vdmUgdGhpcyB0byBzaG93IHRoZSBhY2Nlc3NvcnkgYmFyIGFib3ZlIHRoZSBrZXlib2FyZFxuICAgICAgLy8gZm9yIGZvcm0gaW5wdXRzKVxuICAgICAgY29yZG92YS5wbHVnaW5zLktleWJvYXJkLmhpZGVLZXlib2FyZEFjY2Vzc29yeUJhcih0cnVlKTtcblxuICAgICAgLy8gRG9uJ3QgcmVtb3ZlIHRoaXMgbGluZSB1bmxlc3MgeW91IGtub3cgd2hhdCB5b3UgYXJlIGRvaW5nLiBJdCBzdG9wcyB0aGUgdmlld3BvcnRcbiAgICAgIC8vIGZyb20gc25hcHBpbmcgd2hlbiB0ZXh0IGlucHV0cyBhcmUgZm9jdXNlZC4gSW9uaWMgaGFuZGxlcyB0aGlzIGludGVybmFsbHkgZm9yXG4gICAgICAvLyBhIG11Y2ggbmljZXIga2V5Ym9hcmQgZXhwZXJpZW5jZS5cbiAgICAgIGNvcmRvdmEucGx1Z2lucy5LZXlib2FyZC5kaXNhYmxlU2Nyb2xsKHRydWUpO1xuICAgIH1cbiAgICBpZih3aW5kb3cuU3RhdHVzQmFyKSB7XG4gICAgICBTdGF0dXNCYXIuc3R5bGVEZWZhdWx0KCk7XG4gICAgfVxuICB9KTtcbn0pXG4iLCIvLyBUaGlzIGZpbGUgaXMgcmVxdWlyZWQgYnkgdGhlIGluZGV4Lmh0bWwgZmlsZSBhbmQgd2lsbFxuLy8gYmUgZXhlY3V0ZWQgaW4gdGhlIHJlbmRlcmVyIHByb2Nlc3MgZm9yIHRoYXQgd2luZG93LlxuLy8gQWxsIG9mIHRoZSBOb2RlLmpzIEFQSXMgYXJlIGF2YWlsYWJsZSBpbiB0aGlzIHByb2Nlc3MuXG5cbmxldCBkYiA9IHJlcXVpcmUoJy4vbW9kZWxzJykoJ2J1bGxldCcsIHthdXRvX2NvbXBhY3Rpb246IHRydWV9KTtcbmxldCBDb2xsZWN0aW9uID0gcmVxdWlyZSgnLi9tb2RlbHMvY29sbGVjdGlvbicpKGRiKTtcbmxldCBCdWxsZXQgPSByZXF1aXJlKCcuL21vZGVscy9idWxsZXQnKShkYik7XG5jb25zdCByZW1vdGVEQkFkZHJlc3MgPSAnaHR0cDovLzUwLjExMi4yMTguMzc6NTk4NC8nO1xuY29uc3QgTW9tZW50ID0gcmVxdWlyZSgnbW9tZW50Jyk7XG5cbmNvbnN0IHR5cGVEaWN0ID0ge1xuICAgIFwiVGFza1wiOiBcImZhLWNpcmNsZS1vXCIsXG4gICAgXCJFdmVudFwiOiBcImZhLWZpcnN0LW9yZGVyXCIsXG4gICAgXCJOb3RlXCI6IFwiZmEtbG9uZy1hcnJvdy1yaWdodFwiLFxuICAgIFwiaW5jb21wbGV0ZVwiOiBcImZhLWNpcmNsZS1vXCIsXG4gICAgXCJjb21wbGV0ZVwiOiBcImZhLWNoZWNrLWNpcmNsZS1vXCIsIC8vZmEtY2hlY2stc3F1YXJlLW9cIlxuICAgIFwibWlncmF0ZWRcIjogXCJmYS1zaWduLW91dFwiLFxuICAgIFwic2NoZWR1bGVkXCI6IFwiZmEtYW5nbGUtZG91YmxlLWxlZnRcIixcbiAgICBcInN0cnVja1wiOiBcInN0cmlrZXRocm91Z2hcIlxufTtcblxuZnVuY3Rpb24gdXNlckRCVXJsKHVzZXJuYW1lKXtcbiAgICByZXR1cm4gYHVzZXJkYi0ke3VzZXJuYW1lLnRvSGV4KCl9YDtcbn1cblxuU3RyaW5nLnByb3RvdHlwZS50b0hleCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5zcGxpdCgnJykubWFwKGMgPT4gYy5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KSkuam9pbignJyk7XG59O1xuXG5sZXQgcmVtb3RlREIgPSBuZXcgUG91Y2hEQihyZW1vdGVEQkFkZHJlc3MpO1xuIiwiYnVsbGV0QXBwLmRpcmVjdGl2ZSgnY29udGVudGVkaXRhYmxlJywgZnVuY3Rpb24gKCRzYW5pdGl6ZSkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgcmVxdWlyZTogJz9uZ01vZGVsJyxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBuZ01vZGVsKSB7XG4gICAgICBpZiAoIW5nTW9kZWwpIHJldHVybjtcbiAgICAgIGZ1bmN0aW9uIHJlYWQoKSB7XG4gICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShlbGVtZW50Lmh0bWwoKSk7XG4gICAgICB9XG4gICAgICBuZ01vZGVsLiRyZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzYW5pdGFyeSA9ICRzYW5pdGl6ZShuZ01vZGVsLiR2aWV3VmFsdWUgfHwgJycpO1xuICAgICAgICBlbGVtZW50Lmh0bWwoc2FuaXRhcnkpO1xuICAgICAgfTtcbiAgICAgIGVsZW1lbnQuYmluZCgnYmx1ciBrZXl1cCBjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNjb3BlLiRhcHBseShyZWFkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0pO1xuXG5cbmJ1bGxldEFwcC5kaXJlY3RpdmUoJ2VhdENsaWNrJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSk7XG4iLCJidWxsZXRBcHAuZmFjdG9yeSgnY3VycmVudFN0YXRlcycsIGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gIHZhciBjdXJyZW50U3RhdGVzID0ge1xuICAgIGRhaWx5OiBudWxsLFxuICAgIG1vbnRoOiBudWxsLFxuICAgIGZ1dHVyZTogbnVsbCxcbiAgICBnZW5lcmljOiBudWxsLFxuICAgIGdlbmVyaWNUaXRsZTogZmFsc2VcbiAgfVxuICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIGZ1bmN0aW9uKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zKXtcbiAgICBjdXJyZW50U3RhdGVzW3RvU3RhdGUubmFtZV0gPSB0b1BhcmFtc1xuICAgIC8vIFRoZXNlIGFyZSB1c2VmdWwgZm9yIHRlc3RpbmdcbiAgICAvLyBjb25zb2xlLmxvZygndHMnLCB0b1N0YXRlKTtcbiAgICAvLyBjb25zb2xlLmxvZygndHAnLCB0b1BhcmFtcyk7XG4gICAgLy8gY29uc29sZS5sb2coJ2ZzJywgZnJvbVN0YXRlKTtcbiAgICAvLyBjb25zb2xlLmxvZygnZnAnLCBmcm9tUGFyYW1zKTtcbiAgfSk7XG5cbiAgJHJvb3RTY29wZS4kb24oJ3BhZ2VDaGFuZ2UnLCBmdW5jdGlvbihldmVudCwgYXJncyl7XG4gICAgaWYgKGFyZ3MudHlwZSA9PT0gJ21vbnRoJykgY3VycmVudFN0YXRlcy5mdXR1cmUgPSB7aW5kZXg6IGFyZ3MuaW5kZXh9O1xuICAgIGlmIChhcmdzLnR5cGUgPT09ICdkYXknKSBjdXJyZW50U3RhdGVzLmRhaWx5ID0ge2luZGV4OiBhcmdzLmluZGV4fTtcbiAgfSk7XG5cbiAgLy9UaGlzIGNvbnNvbGUgbG9ncyBpZiB0aGVyZSBhcmUgZXJyb3JzIGluIGEgc3RhdGUgY2hhbmdlXG4gICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VFcnJvcicsIGZ1bmN0aW9uKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zKXtcbiAgICAvLyBjb25zb2xlLmxvZygnZXJyJywgZXZlbnQpO1xuICAgIC8vIGNvbnNvbGUubG9nKCd0cycsIHRvU3RhdGUpO1xuICAgIC8vIGNvbnNvbGUubG9nKCd0cCcsIHRvUGFyYW1zKTtcbiAgICAvLyBjb25zb2xlLmxvZygnZnMnLCBmcm9tU3RhdGUpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdmcCcsIGZyb21QYXJhbXMpO1xuICB9KTtcblxuXG4gIHJldHVybiBjdXJyZW50U3RhdGVzXG59KVxuIiwiYnVsbGV0QXBwLmZhY3RvcnkoJ0RhdGVGYWN0b3J5JywgZnVuY3Rpb24gKCkge1xuICAgIGxldCB0b2RheSA9IE1vbWVudCgpLnN0YXJ0T2YoJ2RheScpLnRvSVNPU3RyaW5nKCk7IC8vIFRPRE86IG1ha2UgdGhpcyBhIGZ1bmN0aW9uIChzbyB0b2RheSBpcyBhbHdheXMgdXAgdG8gZGF0ZSlcbiAgICBsZXQgeWVzdGVyZGF5ID0gTW9tZW50KHRvZGF5KS5zdWJ0cmFjdCgxLCAnZGF5cycpLnRvSVNPU3RyaW5nKCk7XG4gICAgbGV0IHRoaXNNb250aCA9IE1vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJykudG9JU09TdHJpbmcoKTtcblxuICAgIGZ1bmN0aW9uIHNwbGl0Q29sbGVjdGlvbnMoY29sbGVjdGlvbnMpIHtcbiAgICAgICAgaWYgKCFjb2xsZWN0aW9ucy5sZW5ndGgpIHJldHVybiBbXG4gICAgICAgICAgICBbXSxcbiAgICAgICAgICAgIFtdXG4gICAgICAgIF07XG4gICAgICAgIGxldCBsYXN0ID0gKGNvbGxlY3Rpb25zWzBdLnR5cGUgPT09IFwiZGF5XCIpID8geWVzdGVyZGF5IDogbGFzdE1vbnRoKCk7XG4gICAgICAgIGxldCBzcGxpdCA9IF8ucGFydGl0aW9uKGNvbGxlY3Rpb25zLCBmdW5jdGlvbiAoYykge1xuICAgICAgICAgICAgcmV0dXJuIGMudGl0bGUgPCBsYXN0O1xuICAgICAgICB9KVxuICAgICAgICBsZXQgYWdlZCA9IHNwbGl0WzBdLnNvcnQoY2hyb25vU29ydCk7XG4gICAgICAgIGxldCBmdXR1cmUgPSBzcGxpdFsxXTtcbiAgICAgICAgcmV0dXJuIFthZ2VkLCBmdXR1cmVdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNocm9ub1NvcnQoYSwgYikge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoYS50aXRsZSkgLSBuZXcgRGF0ZShiLnRpdGxlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByb3VuZERhdGUoZGF0ZSwgdHlwZSkge1xuICAgICAgICB0eXBlID0gdHlwZSB8fCAnZGF5JzsgLy8gb3IgbW9udGhcbiAgICAgICAgcmV0dXJuIE1vbWVudChkYXRlKS5zdGFydE9mKHR5cGUpLnRvSVNPU3RyaW5nKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlzcGxheShvZmZzZXQsIHR5cGUpIHsgLy9vZmZzZXQgZnJvbSB0b2RheVxuICAgICAgICBsZXQgZGlzcGxheSA9IFtdO1xuICAgICAgICBsZXQgY3VycmVudCA9ICh0eXBlID09PSAnZGF5JykgPyB0b2RheSA6IHRoaXNNb250aDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPiAtNTsgaS0tKSB7XG4gICAgICAgICAgICBkaXNwbGF5LnB1c2goTW9tZW50KGN1cnJlbnQpLnN1YnRyYWN0KGkgLSBvZmZzZXQsIHR5cGUgKyAncycpLnRvSVNPU3RyaW5nKCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAnbW9udGgnKSB0eXBlID0gJ2Z1dHVyZSc7XG4gICAgICAgIHJldHVybiBkaXNwbGF5Lm1hcCgoZSwgaW5kZXgpID0+IG5ldyBDb2xsZWN0aW9uKHtcbiAgICAgICAgICAgIHRpdGxlOiBlLFxuICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgIGlkOiBNb21lbnQoKS5hZGQoaW5kZXgsICdtaWxsaXNlY29uZHMnKS50b0lTT1N0cmluZygpXG4gICAgICAgIH0pKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIG1vbnRoQ2FsKG1vbnRoKSB7XG4gICAgICAgIG1vbnRoID0gbmV3IERhdGUobW9udGgpO1xuICAgICAgICBsZXQgZGF5ID0gbW9udGg7XG4gICAgICAgIGxldCBkYXlBcnJheSA9IFtdO1xuICAgICAgICB3aGlsZSAoZGF5LmdldE1vbnRoKCkgPT0gbW9udGguZ2V0TW9udGgoKSkge1xuICAgICAgICAgICAgZGF5QXJyYXkucHVzaChkYXkudG9JU09TdHJpbmcoKSk7XG4gICAgICAgICAgICBkYXkgPSBNb21lbnQoZGF5KS5hZGQoMSwgJ2RheXMnKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgZGF5ID0gbmV3IERhdGUoZGF5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF5QXJyYXk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Q2hvaWNlcyhpbnB1dCkge1xuICAgICAgICBsZXQgW21vbnRoLCBkYXksIHllYXJdID0gaW5wdXQuc3BsaXQoJyAnKTtcbiAgICAgICAgbGV0IGNob2ljZXMgPSBbXTtcbiAgICAgICAgaWYgKCFkYXkpIGNob2ljZXMgPSBNb21lbnQubW9udGhzKClcbiAgICAgICAgZWxzZSBpZiAoIXllYXIpIHtcbiAgICAgICAgICAgIGZvciAobGV0IHkgb2YgbmV4dE5ZZWFycygxMCkpIHtcbiAgICAgICAgICAgICAgICBjaG9pY2VzLnB1c2goYCR7bW9udGh9ICR7eX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNob2ljZXMgPSBbXG4gICAgICAgICAgICAgICAgLi4ubW9udGhDYWwoTW9tZW50KCkubW9udGgobW9udGgpLnN0YXJ0T2YoJ21vbnRoJykpXG4gICAgICAgICAgICAgICAgLm1hcChkID0+IGAke21vbnRofSAke01vbWVudChkKS5kYXRlKCl9YCksXG4gICAgICAgICAgICAgICAgLi4uY2hvaWNlc1xuICAgICAgICAgICAgXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IHkgb2YgbmV4dE5ZZWFycygxMCkpIHtcbiAgICAgICAgICAgICAgICBjaG9pY2VzLnB1c2goYCR7bW9udGh9ICR7ZGF5fSAke3l9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNob2ljZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29udmVydERhdGUoZGF0ZUlucHV0KSB7XG4gICAgICAgIGxldCBbbW9udGgsIGRheSwgeWVhcl0gPSBkYXRlSW5wdXQuc3BsaXQoJyAnKTtcbiAgICAgICAgbGV0IGRhdGUgPSBNb21lbnQoKS5tb250aChtb250aCk7XG4gICAgICAgIGxldCB0eXBlID0gJ2RheSc7XG5cbiAgICAgICAgaWYoIXllYXIpIHtcbiAgICAgICAgICAgIGlmKGRheSA8IDMyKSBkYXRlID0gZGF0ZS5kYXRlKGRheSk7XG4gICAgICAgICAgICBlbHNlIFtkYXRlLCB0eXBlXSA9IFtyb3VuZERhdGUoZGF0ZS55ZWFyKGRheSksICdtb250aCcpLCAnZnV0dXJlJ11cbiAgICAgICAgfSBlbHNlIGRhdGUgPSBkYXRlLmRhdGUoZGF5KS55ZWFyKHllYXIpO1xuICAgICAgICByZXR1cm4gW3JvdW5kRGF0ZShkYXRlKSwgdHlwZV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0V2Vla2RheShkYXRlKSB7XG4gICAgICAgIGxldCB3ZWVrZGF5ID0gTW9tZW50KGRhdGUpLmlzb1dlZWtkYXkoKTtcbiAgICAgICAgd2Vla2RheSA9IE1vbWVudCgpLmlzb1dlZWtkYXkod2Vla2RheSkuZm9ybWF0KCdkZGRkJylcbiAgICAgICAgcmV0dXJuIHdlZWtkYXk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGFzdE1vbnRoKGN1cnJlbnRNb250aCkge1xuICAgICAgICBjdXJyZW50TW9udGggPSBjdXJyZW50TW9udGggfHwgdGhpc01vbnRoXG4gICAgICAgIHJldHVybiBNb21lbnQoY3VycmVudE1vbnRoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS50b0lTT1N0cmluZygpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmV4dE1vbnRoKGN1cnJlbnRNb250aCkge1xuICAgICAgICBjdXJyZW50TW9udGggPSBjdXJyZW50TW9udGggfHwgdGhpc01vbnRoXG4gICAgICAgIHJldHVybiBNb21lbnQoY3VycmVudE1vbnRoKS5hZGQoMSwgJ21vbnRoJykudG9JU09TdHJpbmcoKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uKiBuZXh0TlllYXJzKG4pIHtcbiAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICBjb25zdCB0aGlzWWVhciA9IE1vbWVudCh0aGlzTW9udGgpLnllYXIoKTtcbiAgICAgICAgd2hpbGUgKGkgPCBuKSB7XG4gICAgICAgICAgICB5aWVsZCB0aGlzWWVhciArIGk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIHJldHVybiB7XG4gICAgICAgIGRpc3BsYXk6IGRpc3BsYXksXG4gICAgICAgIHJvdW5kRGF0ZTogcm91bmREYXRlLFxuICAgICAgICBtb250aENhbDogbW9udGhDYWwsXG4gICAgICAgIHNwbGl0Q29sbGVjdGlvbnM6IHNwbGl0Q29sbGVjdGlvbnMsXG4gICAgICAgIGdldENob2ljZXM6IGdldENob2ljZXMsXG4gICAgICAgIGNvbnZlcnREYXRlOiBjb252ZXJ0RGF0ZSxcbiAgICAgICAgdG9kYXk6IHRvZGF5LFxuICAgICAgICB0aGlzTW9udGg6IHRoaXNNb250aCxcbiAgICAgICAgbGFzdE1vbnRoOiBsYXN0TW9udGgsXG4gICAgICAgIG5leHRNb250aDogbmV4dE1vbnRoLFxuICAgICAgICBnZXRXZWVrZGF5OiBnZXRXZWVrZGF5LFxuICAgICAgICBuZXh0TlllYXJzOiBuZXh0TlllYXJzXG4gICAgfVxufSlcbiIsImJ1bGxldEFwcC5maWx0ZXIoJ2Rpc3BsYXlUeXBlJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICB2YXIgb3V0cHV0O1xuICAgIHN3aXRjaChpbnB1dCkge1xuICAgICAgY2FzZSAnZGF5JzpcbiAgICAgICAgb3V0cHV0ID0gJ0RheSc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbW9udGgnOlxuICAgICAgICBvdXRwdXQgPSAnTW9udGgnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ21vbnRoLWNhbCc6XG4gICAgICAgIG91dHB1dCA9ICdNb250aGx5IENhbGVuZGFyJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdmdXR1cmUnOlxuICAgICAgICBvdXRwdXQgPSAnRnV0dXJlIExvZyc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZ2VuZXJpYyc6XG4gICAgICAgIG91dHB1dCA9ICdDdXN0b20nO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG91dHB1dCA9ICcnO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dFxuICB9XG59KVxuIiwiYnVsbGV0QXBwLmZpbHRlcignc2xpY2UnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGFyciwgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoYXJyIHx8IFtdKS5zbGljZShzdGFydCwgZW5kKTtcbiAgfTtcbn0pOyIsImJ1bGxldEFwcC5maWx0ZXIoJ3N0YXRlTmFtZScsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgdmFyIG91dHB1dDtcbiAgICBzd2l0Y2goaW5wdXQpIHtcbiAgICAgIGNhc2UgJ2RheSc6XG4gICAgICAgIG91dHB1dCA9ICdkYWlseSc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbW9udGgnOlxuICAgICAgICBvdXRwdXQgPSAnbW9udGgnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ21vbnRoLWNhbCc6XG4gICAgICAgIG91dHB1dCA9ICdtb250aCc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZnV0dXJlJzpcbiAgICAgICAgb3V0cHV0ID0gJ2Z1dHVyZSc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZ2VuZXJpYyc6XG4gICAgICAgIG91dHB1dCA9ICdnZW5lcmljJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBvdXRwdXQgPSAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXRcbiAgfVxufSlcbiIsImJ1bGxldEFwcC5kaXJlY3RpdmUoJ2FkZENvbGxlY3Rpb24nLCBmdW5jdGlvbigkc3RhdGUsICRmaWx0ZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ3NjcmlwdHMvYWRkLWNvbGxlY3Rpb24vYWRkLWNvbGxlY3Rpb24tdGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uVHlwZTogJ0AnXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5jb2xsZWN0aW9uVHlwZSA9IHNjb3BlLmNvbGxlY3Rpb25UeXBlIHx8ICdnZW5lcmljJztcbiAgICAgICAgICAgIC8vIFRPRE86IEFkZCB2YWxpZGF0aW9ucyB0byBjcmVhdGUgY29sbGVjdGlvbnMgZm9yIGRheSwgbW9udGgsIGV0Yy5cbiAgICAgICAgICAgIC8vIF5eIEluY29ycG9yYXRlIHRoaXMgaW50byBTYWJyaW5hJ3MgZGF0ZSB2YWxpZGF0aW9uc1xuICAgICAgICAgICAgc2NvcGUuY3JlYXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICAgICAgbmV3IENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUsIHNjb3BlLmNvbGxlY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgICAgICAuc2F2ZSgpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGNvbGxlY3Rpb24gPT4gJHN0YXRlLmdvKCRmaWx0ZXIoJ3N0YXRlTmFtZScpKHNjb3BlLmNvbGxlY3Rpb25UeXBlKSwgeyBpZDogY29sbGVjdGlvbi5pZCB9KSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuY29sbGVjdGlvbk5hbWUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS50ZW1wbGF0ZVVybCA9ICdzY3JpcHRzL2FkZC1jb2xsZWN0aW9uL2NvbGxlY3Rpb24tZm9ybS5odG1sJztcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJidWxsZXRBcHAuZGlyZWN0aXZlKCdidWxsZXQnLCBmdW5jdGlvbihEYXRlRmFjdG9yeSwgJHRpbWVvdXQsICRyb290U2NvcGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ3NjcmlwdHMvYnVsbGV0cy9idWxsZXQudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBidWxsZXQ6ICc9JyxcbiAgICAgICAgICAgIHJlbW92ZUZuOiAnJicsXG4gICAgICAgICAgICBhZGRGbjogJyYnLFxuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblxuICAgICAgICAgICAgc2NvcGUuc2hvd0J1dHRvbiA9IDA7XG4gICAgICAgICAgICBzY29wZS5lbmFibGVCdXR0b24gPSBmYWxzZTtcbiAgICAgICAgICAgIHNjb3BlLnR5cGVEaWN0ID0gdHlwZURpY3Q7XG4gICAgICAgICAgICBzY29wZS5oaWRlSWNvbiA9IChhdHRycy5ub0ljb24pID8gdHJ1ZSA6IGZhbHNlO1xuXG4gICAgICAgICAgICBzY29wZS5lZGl0YWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghc2NvcGUuYnVsbGV0LnN0YXR1cykgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlLmJ1bGxldC5zdGF0dXMgPT09IFwiaW5jb21wbGV0ZVwiIHx8IHNjb3BlLmJ1bGxldC5zdGF0dXMgPT09IFwibmV3XCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnRvZ2dsZVNjaGVkdWxlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghc2NvcGUuYnVsbGV0LmRhdGUpIHNjb3BlLmJ1bGxldC5kYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93U2NoZWR1bGVyID0gIXNjb3BlLnNob3dTY2hlZHVsZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnRlbXBsYXRlVXJsID0gJ3NjcmlwdHMvYnVsbGV0cy90eXBlLnRlbXBsYXRlLmh0bWwnO1xuICAgICAgICAgICAgc2NvcGUuZGF0ZXBpY2tlclVybCA9ICdzY3JpcHRzL2J1bGxldHMvZGF0ZXBpY2tlci50ZW1wbGF0ZS5odG1sJztcblxuICAgICAgICAgICAgc2NvcGUuc2VsZWN0VHlwZSA9IGZ1bmN0aW9uKGIsIHR5cGUpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgc2NvcGUuYnVsbGV0LnN0YXR1cztcbiAgICAgICAgICAgICAgICBzY29wZS5idWxsZXQgPSBuZXcgQnVsbGV0W3R5cGVdKGIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBPUyA9IHByb2Nlc3MucGxhdGZvcm07XG5cbiAgICAgICAgICAgIHNjb3BlLnNob3dCdXR0b25QYW5lbCA9IGZ1bmN0aW9uKGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYi5zdGF0dXMgPT09ICdpbmNvbXBsZXRlJyAmJlxuICAgICAgICAgICAgICAgICAgICBiLnJldiAmJlxuICAgICAgICAgICAgICAgICAgICBzY29wZS5lbmFibGVCdXR0b25zO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUuc2hvd1NjaGVkdWxlQnV0dG9uID0gZnVuY3Rpb24oYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBiLnR5cGUgIT09ICdOb3RlJztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLnNob3dNaWdyYXRlQnV0dG9uID0gZnVuY3Rpb24oYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBiLnR5cGUgPT09ICdUYXNrJztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLm1pZ3JhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5idWxsZXQubWlncmF0ZSgpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHNjb3BlLiRldmFsQXN5bmMoKSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5vcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG1pbk1vZGU6ICdkYXknXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnNjaGVkdWxlID0gZnVuY3Rpb24obW9kZSkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmJ1bGxldC5kYXRlID0gRGF0ZUZhY3Rvcnkucm91bmREYXRlKHNjb3BlLmJ1bGxldC5kYXRlLCBtb2RlKTtcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93U2NoZWR1bGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGUgPT09ICdtb250aCcpIG1vZGUgPSAnZnV0dXJlJztcbiAgICAgICAgICAgICAgICBzY29wZS5idWxsZXQuc2NoZWR1bGUoc2NvcGUuYnVsbGV0LmRhdGUsIG1vZGUpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBlZGl0QnVsbGV0KGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUuYnVsbGV0LnN0YXR1cyAhPT0gJ21pZ3JhdGVkJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUuZWRpdGFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY21kLXQgY2hhbmdlIHRvIHRhc2tcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5idWxsZXQuc3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDg0KSByZXR1cm4gbmV3IEJ1bGxldC5UYXNrKHNjb3BlLmJ1bGxldCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjbWQtZSBjaGFuZ2UgdG8gZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLndoaWNoID09PSA2OSkgcmV0dXJuIG5ldyBCdWxsZXQuRXZlbnQoc2NvcGUuYnVsbGV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNtZC1uIGNoYW5nZSB0byBub3RlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gNzgpIHJldHVybiBuZXcgQnVsbGV0Lk5vdGUoc2NvcGUuYnVsbGV0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBjbWQtZCB0b2dnbGUgZG9uZSBmb3IgdGFza3NcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDY4ICYmIHNjb3BlLmJ1bGxldC50eXBlID09PSAnVGFzaycpIHJldHVybiBzY29wZS5idWxsZXQudG9nZ2xlRG9uZSgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBjbWQteCBjcm9zcyBvdXRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDg4ICYmIHNjb3BlLmJ1bGxldC50eXBlID09PSAnVGFzaycpIHJldHVybiBzY29wZS5idWxsZXQudG9nZ2xlU3RyaWtlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGNtZC1kZWwgcmVtb3ZlIGZyb20gY29sbGVjdGlvblxuICAgICAgICAgICAgICAgIGlmIChlLndoaWNoID09PSA4KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY29wZS5idWxsZXQucmV2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5yZW1vdmVGbigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGVsZW1lbnQub24oJ2tleWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggIT09IDkgJiYgZS53aGljaCAhPT0gOTEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmJsdXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgoT1MgPT09ICdkYXJ3aW4nICYmIGUubWV0YUtleSkgfHwgKE9TICE9PSAnZGFyd2luJyAmJiBlLmN0cmxLZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdXBkYXRlZEJ1bGxldCA9IGVkaXRCdWxsZXQoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodXBkYXRlZEJ1bGxldCkgc2NvcGUuYnVsbGV0ID0gdXBkYXRlZEJ1bGxldDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzY29wZS5idWxsZXQuc3RhdHVzID09PSAnc3RydWNrJyB8fCBzY29wZS5idWxsZXQuc3RhdHVzID09PSAnY29tcGxldGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS53aGljaCAhPT0gOSkgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHNjb3BlLnNhdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQucmVsYXRlZFRhcmdldCAmJiBldmVudC5yZWxhdGVkVGFyZ2V0LmlkID09PSAnbWlncmF0ZScpIHJldHVybjtcblxuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXNjb3BlLmJ1bGxldC5yZXYpIHNjb3BlLmFkZEZuKCk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2Ugc2NvcGUuYnVsbGV0LnNhdmUoKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuXG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmVuYWJsZUJ1dHRvbnMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9LCAzMDApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCIvKmpzaGludCBlc3ZlcnNpb246IDYqL1xuYnVsbGV0QXBwLmRpcmVjdGl2ZSgnYnVsbGV0SWNvbicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnc2NyaXB0cy9idWxsZXRzL2ljb24udGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBidWxsZXQ6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuXG4gICAgICAgICAgICBzY29wZS5pY29uVHlwZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGxldCB0eXBlO1xuICAgICAgICAgICAgICAgIGlmICghc2NvcGUuYnVsbGV0LnN0YXR1cykgdHlwZSA9IHNjb3BlLmJ1bGxldC50eXBlO1xuICAgICAgICAgICAgICAgIGVsc2UgdHlwZSA9IHNjb3BlLmJ1bGxldC5zdGF0dXMgPT09ICdpbmNvbXBsZXRlJyA/IHNjb3BlLmJ1bGxldC50eXBlIDogc2NvcGUuYnVsbGV0LnN0YXR1cztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZURpY3RbdHlwZV07XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS50b2dnbGVEb25lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNjb3BlLmJ1bGxldC50eXBlID09PSBcIlRhc2tcIikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5idWxsZXQudG9nZ2xlRG9uZSgpO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5idWxsZXQuc2F2ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgfVxuICAgIH07XG59KTtcbiIsIi8qanNoaW50IGVzdmVyc2lvbjogNiovXG5cbmJ1bGxldEFwcC5kaXJlY3RpdmUoJ2NvbGxlY3Rpb24nLCBmdW5jdGlvbigkbG9nLCAkcm9vdFNjb3BlLCBjdXJyZW50U3RhdGVzLCBEYXRlRmFjdG9yeSl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdzY3JpcHRzL2NvbGxlY3Rpb25zL2NvbGxlY3Rpb24udGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiAnPScsXG4gICAgICAgICAgICBub0FkZDogJz0nLFxuICAgICAgICAgICAgbW9udGhUaXRsZTogJz0nLFxuICAgICAgICAgICAgbm9UaXRsZTogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5mb3JtYXR0ZWRUaXRsZSA9IHNjb3BlLm1vbnRoVGl0bGUgPyBmb3JtYXRUaXRsZSh7dGl0bGU6IHNjb3BlLm1vbnRoVGl0bGUsIHR5cGU6ICdtb250aCd9KSA6IGZvcm1hdFRpdGxlKHNjb3BlLmNvbGxlY3Rpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzY29wZS5uZXdCdWxsZXQgPSBuZXcgQnVsbGV0LlRhc2soe3N0YXR1czogJ25ldyd9KTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gZm9ybWF0VGl0bGUoY29sbGVjdGlvbikge1xuICAgICAgICAgICAgICAgIHN3aXRjaChjb2xsZWN0aW9uLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbW9udGgnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdMb2cnOyAvL01vbWVudChjb2xsZWN0aW9uLnRpdGxlKS5mb3JtYXQoJ01NTU0nKSsnIExvZyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZnV0dXJlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNb21lbnQoY29sbGVjdGlvbi50aXRsZSkuZm9ybWF0KCdNTU0gWVlZWScpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBEYXRlRmFjdG9yeS5nZXRXZWVrZGF5KGNvbGxlY3Rpb24udGl0bGUpKycsICcrTW9tZW50KGNvbGxlY3Rpb24udGl0bGUpLmZvcm1hdCgnTU1NTSBEJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbW9udGgtY2FsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBNb21lbnQoY29sbGVjdGlvbi50aXRsZSkuZm9ybWF0KCdNTU1NJykrJyBDYWxlbmRhcic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb2xsZWN0aW9uLnRpdGxlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICAgICAgKiBUaGlzIGZ1bmN0aW9uIHdpbGwgcmVtb3ZlIHRoZSBidWxsZXQgZnJvbSB0aGUgY29sbGVjdGlvblxuICAgICAgICAgICAgKiBhbmQgdGhlbiBtYWtlIHN1cmUgdGhlIGJ1bGxldCBpcyBhbHNvIHJlbW92ZWQgZnJvbSB0aGVcbiAgICAgICAgICAgICogbG9jYWwgYnVsbGV0cyBhcnJheS5cbiAgICAgICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4gICAgICAgICAgICBzY29wZS5yZW1vdmVCdWxsZXQgPSBmdW5jdGlvbihidWxsZXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuY29sbGVjdGlvbi5yZW1vdmVCdWxsZXQoYnVsbGV0KVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICBpZiAoYnVsbGV0LmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmNvbGxlY3Rpb24uYnVsbGV0cyA9IHNjb3BlLmNvbGxlY3Rpb24uYnVsbGV0cy5maWx0ZXIoYiA9PiBiLmlkICE9PSBidWxsZXQuaWQpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKCRsb2cuZXJyKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmFkZEJ1bGxldCA9IGZ1bmN0aW9uKGJ1bGxldCkge1xuICAgICAgICAgICAgICAgIGlmIChidWxsZXQuY29udGVudCAmJiBidWxsZXQuY29udGVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuY29sbGVjdGlvbi5hZGRCdWxsZXQoYnVsbGV0KVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICBzY29wZS5uZXdCdWxsZXQgPSBuZXcgQnVsbGV0LlRhc2soe3N0YXR1czogJ25ldyd9KVxuICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRldmFsQXN5bmMoKVxuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycik7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCJidWxsZXRBcHAuZGlyZWN0aXZlKCdkYXRlUGlja2VyJywgZnVuY3Rpb24gKERhdGVGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdzY3JpcHRzL2RhdGVwaWNrZXIvZGF0ZXBpY2tlci50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5nZXREYXRlcyA9IERhdGVGYWN0b3J5LmdldENob2ljZXM7XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCJidWxsZXRBcHAuZGlyZWN0aXZlKCdmb290ZXInLCBmdW5jdGlvbihjdXJyZW50U3RhdGVzLCAkc3RhdGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ3NjcmlwdHMvZm9vdGVyL2Zvb3Rlci50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRTdGF0ZXMgPSBjdXJyZW50U3RhdGVzO1xuICAgICAgICAgICAgc2NvcGUubGFzdE1vbnRoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRTdGF0ZXMubW9udGgpICRzdGF0ZS5nbygnbW9udGgnLCBjdXJyZW50U3RhdGVzLm1vbnRoKVxuICAgICAgICAgICAgICAgIGVsc2UgJHN0YXRlLmdvKCdtb250aCcsIHsgbW9udGhTdHJpbmc6IE1vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJykudG9JU09TdHJpbmcoKSB9KSAvL0RhdGVGYWN0b3J5LnRoaXNNb250aC50b0lTT1N0cmluZygpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUubGFzdERhaWx5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdkYWlseScsIGN1cnJlbnRTdGF0ZXMuZGFpbHkpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUubGFzdEZ1dHVyZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZnV0dXJlJywgY3VycmVudFN0YXRlcy5mdXR1cmUpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUubGFzdEdlbmVyaWMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2dlbmVyaWMnLCBjdXJyZW50U3RhdGVzLmdlbmVyaWMpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiYnVsbGV0QXBwLmNvbnRyb2xsZXIoJ0dlbmVyaWNDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBjb2xsZWN0aW9uLCAkc3RhdGUpIHtcbiAgICBpZiAoY29sbGVjdGlvbi50eXBlID09PSAnbW9udGgnIHx8IGNvbGxlY3Rpb24udHlwZSA9PT0gJ21vbnRoLWNhbCcpIHtcbiAgICBcdGNvbnNvbGUubG9nKGNvbGxlY3Rpb24pO1xuICAgIFx0JHN0YXRlLmdvKCdtb250aCcsIHsgbW9udGhTdHJpbmc6IGNvbGxlY3Rpb24udGl0bGUgfSk7XG4gICAgfVxuICAgICRzY29wZS5jb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcbn0pO1xuIiwiYnVsbGV0QXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZ2VuZXJpYycsIHtcbiAgICB1cmw6ICcvZ2VuZXJpYy86aWQnLFxuICAgIHRlbXBsYXRlVXJsOiAnc2NyaXB0cy9nZW5lcmljL2dlbmVyaWMudGVtcGxhdGUuaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ0dlbmVyaWNDdHJsJyxcbiAgICByZXNvbHZlOiB7XG4gICAgICAgIGNvbGxlY3Rpb246IGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgY3VycmVudFN0YXRlcykgeyBcbiAgICAgICAgICAgIHJldHVybiBDb2xsZWN0aW9uLmZpbmRPclJldHVybih7aWQ6ICRzdGF0ZVBhcmFtcy5pZH0pXG4gICAgICAgICAgICAgICAgLnRoZW4oYyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTdGF0ZXMuZ2VuZXJpY1RpdGxlID0gY1swXS50aXRsZVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY1swXTtcbiAgICAgICAgICAgICAgICB9KTsgXG4gICAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG59KTtcbiIsImJ1bGxldEFwcC5jb250cm9sbGVyKCdJbmRleEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIGNvbGxlY3Rpb25zLCBidWxsZXRzLCBBdXRoRmFjdG9yeSkge1xuICAgICRzY29wZS5jb2xsZWN0aW9ucyA9IGNvbGxlY3Rpb25zLmZpbHRlcihjb2wgPT4gY29sLnR5cGUgPT09ICdnZW5lcmljJyk7XG4gICAgJHNjb3BlLm1vbnRocyA9IF8uZ3JvdXBCeShjb2xsZWN0aW9ucy5maWx0ZXIoY29sID0+IGNvbC50eXBlID09PSAnbW9udGgnIHx8IGNvbC50eXBlID09PSAnbW9udGgtY2FsJyksIGkgPT4gaS50aXRsZSk7XG5cbiAgICAkc2NvcGUuZGVsZXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24pIHtcbiAgICAgICAgY29sbGVjdGlvbi5kZWxldGUoKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBpZHggPSAkc2NvcGUuY29sbGVjdGlvbnMuaW5kZXhPZihjb2xsZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY29sbGVjdGlvbnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbn0pO1xuIiwiYnVsbGV0QXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaW5kZXgnLCB7XG4gICAgdXJsOiAnL2luZGV4JyxcbiAgICB0ZW1wbGF0ZVVybDogJ3NjcmlwdHMvaW5kZXgvaW5kZXgudGVtcGxhdGUuaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ0luZGV4Q3RybCcsXG4gICAgcmVzb2x2ZToge1xuICAgICAgICBjb2xsZWN0aW9uczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gQ29sbGVjdGlvbi5mZXRjaEFsbCgpO1xuICAgICAgICB9LFxuICAgICAgICBidWxsZXRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBCdWxsZXQuZmV0Y2hBbGwoJ2V2ZW50Jyk7XG4gICAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG59KTtcbiIsImJ1bGxldEFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdkYWlseScsIHtcbiAgICAgICAgdXJsOiAnL2RhaWx5LzppbmRleCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnc2NyaXB0cy9sb2cvbG9nLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9nQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb25zOiBmdW5jdGlvbihEYXRlRmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBDb2xsZWN0aW9uLmZldGNoQWxsKHsgdHlwZTogJ2RheScgfSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oRGF0ZUZhY3Rvcnkuc3BsaXRDb2xsZWN0aW9ucyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGFzdDogZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRzdGF0ZVBhcmFtcy5pbmRleCB8fCBudWxsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHR5cGU6ICgpID0+ICdkYXknXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG4iLCJidWxsZXRBcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZnV0dXJlJywge1xuICAgICAgICB1cmw6ICcvZnV0dXJlLzppbmRleCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnc2NyaXB0cy9sb2cvbG9nLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9nQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb25zOiBmdW5jdGlvbihEYXRlRmFjdG9yeSwgJGxvZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBDb2xsZWN0aW9uLmZldGNoQWxsKHsgdHlwZTogJ2Z1dHVyZScgfSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oRGF0ZUZhY3Rvcnkuc3BsaXRDb2xsZWN0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKCRsb2cuZXJyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsYXN0OiBmdW5jdGlvbigkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHN0YXRlUGFyYW1zLmluZGV4IHx8IG51bGw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdHlwZTogKCkgPT4gJ21vbnRoJ1xuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuIiwiYnVsbGV0QXBwLmNvbnRyb2xsZXIoJ0xvZ0N0cmwnLCBmdW5jdGlvbigkc2NvcGUsIGNvbGxlY3Rpb25zLCBEYXRlRmFjdG9yeSwgbGFzdCwgdHlwZSwgJHJvb3RTY29wZSwgJHN0YXRlUGFyYW1zKSB7XG5cbiAgICBjb25zdCBhZ2VkID0gY29sbGVjdGlvbnNbMF07XG4gICAgY29uc3QgZnV0dXJlID0gY29sbGVjdGlvbnNbMV07XG4gICAgbGV0IGluZGV4ID0gYWdlZC5sZW5ndGg7XG5cbiAgICBpZiAoJHN0YXRlUGFyYW1zLmluZGV4ICYmICRzdGF0ZVBhcmFtcy5pbmRleC5sZW5ndGgpIHtcbiAgICAgIGluZGV4ID0gKyRzdGF0ZVBhcmFtcy5pbmRleFxuICAgICAgaWYgKGluZGV4IDwgMCkgJHNjb3BlLmNvbGxlY3Rpb25zID0gYWdlZC5zbGljZSgwLCBpbmRleCArIDYpO1xuICAgICAgZWxzZSBuYXZpZ2F0ZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIG5ldzYoMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmV3NihvZmZzZXQpIHtcbiAgICAgICAgJHNjb3BlLmNvbGxlY3Rpb25zID0gW107XG5cbiAgICAgICAgRGF0ZUZhY3RvcnkuZGlzcGxheShvZmZzZXQsIHR5cGUpLmZvckVhY2goKGMpID0+IHtcbiAgICAgICAgICAgIGxldCB1c2UgPSBmdXR1cmUuZmluZChlbCA9PiBlbC50aXRsZSA9PT0gYy50aXRsZSkgfHwgYztcbiAgICAgICAgICAgICRzY29wZS5jb2xsZWN0aW9ucy5wdXNoKHVzZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgICRzY29wZS50aXRsZSA9ICgodHlwZSA9PT0gJ2RheScpID8gJ0RBSUxZJyA6ICdGVVRVUkUnKSArICcgTE9HJztcblxuICAgICRzY29wZS5wcmV2NiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoaW5kZXggPD0gMCkgcmV0dXJuO1xuICAgICAgICBpZiAoaW5kZXggPCA2KSB7XG4gICAgICAgICAgICAkc2NvcGUuY29sbGVjdGlvbnMgPSBhZ2VkLnNsaWNlKDAsIGluZGV4KTtcbiAgICAgICAgICAgIGluZGV4IC09IDY7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3BhZ2VDaGFuZ2UnLCB7aW5kZXg6IGluZGV4LCB0eXBlOiB0eXBlfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluZGV4IC09IDY7XG4gICAgICAgICAgICBuYXZpZ2F0ZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgJHNjb3BlLm5leHQ2ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGluZGV4ICs9IDY7XG4gICAgICAgIG5hdmlnYXRlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmF2aWdhdGUoKSB7XG4gICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgncGFnZUNoYW5nZScsIHtpbmRleDogaW5kZXgsIHR5cGU6IHR5cGV9KVxuICAgICAgICBpZiAoaW5kZXggPj0gYWdlZC5sZW5ndGgpIG5ldzYoaW5kZXggLSBhZ2VkLmxlbmd0aCk7XG4gICAgICAgIGVsc2UgJHNjb3BlLmNvbGxlY3Rpb25zID0gYWdlZC5zbGljZShpbmRleCwgaW5kZXggKyA2KTtcbiAgICB9XG5cbn0pO1xuIiwiLypqc2hpbnQgZXN2ZXJzaW9uOiA2Ki9cbmJ1bGxldEFwcC5kaXJlY3RpdmUoJ21vbnRoQ2FsJywgZnVuY3Rpb24oJGxvZykge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnc2NyaXB0cy9tb250aC1jYWwvbW9udGguY2FsLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogJz0nLFxuICAgICAgICAgICAgZGF5czogJz0nLFxuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZm9ybWF0dGVkVGl0bGUgPSAnQ2FsZW5kYXInOyAvL01vbWVudChzY29wZS5jb2xsZWN0aW9uLnRpdGxlKS5mb3JtYXQoJ01NTU0gWVlZWScpLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAgICAgICAgIGdlbmVyYXRlQnVsbGV0TGlzdCgpXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGdlbmVyYXRlQnVsbGV0TGlzdCAoKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmJ1bGxldExpc3QgPSBzY29wZS5kYXlzLm1hcChkYXkgPT4ge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlLmNvbGxlY3Rpb24uYnVsbGV0cy5maW5kKGJ1bGxldCA9PiBidWxsZXQuZGF0ZSA9PT0gZGF5KSB8fCBuZXcgQnVsbGV0LlRhc2soe1xuICAgICAgICAgICAgICAgICAgICAgIGRhdGU6IGRheVxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnJlbW92ZUJ1bGxldCA9IGZ1bmN0aW9uKGJ1bGxldCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY29wZS5jb2xsZWN0aW9uLnJlbW92ZUJ1bGxldChidWxsZXQpXG4gICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGJ1bGxldC5pZCkge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1bGxldExpc3QoKVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgc2NvcGUuJGV2YWxBc3luYygpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goJGxvZy5lcnIpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUuYWRkQnVsbGV0ID0gZnVuY3Rpb24oYnVsbGV0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGJ1bGxldC5jb250ZW50ICYmIGJ1bGxldC5jb250ZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuY29sbGVjdGlvbi5hZGRCdWxsZXQoYnVsbGV0KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiLypqc2hpbnQgZXN2ZXJzaW9uOiA2Ki9cblxuYnVsbGV0QXBwLmNvbnRyb2xsZXIoJ01vbnRobHlUcmFja2VyQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIGNvbGxlY3Rpb25zLCBEYXRlRmFjdG9yeSwgbW9udGgsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmRheXNJbk1vbnRoID0gRGF0ZUZhY3RvcnkubW9udGhDYWwobW9udGgpO1xuICAgICRzY29wZS5tb250aCA9IG1vbnRoO1xuICAgICRzY29wZS5sb2cgPSBjb2xsZWN0aW9ucy5maW5kKGkgPT4gaS50eXBlID09PSBcIm1vbnRoXCIpIHx8IG5ldyBDb2xsZWN0aW9uKG1vbnRoLCAnbW9udGgnKTtcbiAgICAkc2NvcGUuY2FsID0gY29sbGVjdGlvbnMuZmluZChpID0+IGkudHlwZSA9PT0gXCJtb250aC1jYWxcIikgfHwgbmV3IENvbGxlY3Rpb24obW9udGgsICdtb250aC1jYWwnKTtcbiAgICAkc2NvcGUuZnV0dXJlID0gY29sbGVjdGlvbnMuZmluZChpID0+IGkudHlwZSA9PT0gXCJmdXR1cmVcIikgfHwgbmV3IENvbGxlY3Rpb24obW9udGgsICdmdXR1cmUnKTtcblxuICAgICRzY29wZS5uZXh0TW9udGggPSBmdW5jdGlvbigpIHtcbiAgICAgICRzdGF0ZS5nbygkc3RhdGUuY3VycmVudCwge21vbnRoU3RyaW5nOiBEYXRlRmFjdG9yeS5uZXh0TW9udGgoJHNjb3BlLm1vbnRoKX0pXG4gICAgfVxuICAgICRzY29wZS5sYXN0TW9udGggPSBmdW5jdGlvbigpIHtcbiAgICAgICRzdGF0ZS5nbygkc3RhdGUuY3VycmVudCwge21vbnRoU3RyaW5nOiBEYXRlRmFjdG9yeS5sYXN0TW9udGgoJHNjb3BlLm1vbnRoKX0pXG4gICAgfVxufSk7XG4iLCJidWxsZXRBcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtb250aCcsIHtcbiAgICB1cmw6ICcvbW9udGgvOm1vbnRoU3RyaW5nJyxcbiAgICB0ZW1wbGF0ZVVybDogJ3NjcmlwdHMvbW9udGhseXRyYWNrZXIvbW9udGhseXRyYWNrZXIudGVtcGxhdGUuaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ01vbnRobHlUcmFja2VyQ3RybCcsXG4gICAgcmVzb2x2ZToge1xuICAgICAgY29sbGVjdGlvbnM6IGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgRGF0ZUZhY3RvcnkpIHtcbiAgICAgICAgY29uc3QgbW9udGhTdHJpbmcgPSAkc3RhdGVQYXJhbXMubW9udGhTdHJpbmcgfHwgRGF0ZUZhY3Rvcnkucm91bmRNb250aChuZXcgRGF0ZSkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgcmV0dXJuIENvbGxlY3Rpb24uZmV0Y2hBbGwoe3RpdGxlOiBtb250aFN0cmluZ30pO1xuICAgICAgfSxcbiAgICAgIG1vbnRoOiBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIERhdGVGYWN0b3J5KSB7XG4gICAgICAgIHJldHVybiAkc3RhdGVQYXJhbXMubW9udGhTdHJpbmcgfHwgRGF0ZUZhY3RvcnkudGhpc01vbnRoO1xuICAgICAgfVxuICAgIH1cbiAgfSlcbn0pXG4iLCJidWxsZXRBcHAuZGlyZWN0aXZlKCdyZWZyZXNoJywgZnVuY3Rpb24oJHN0YXRlLCAkcm9vdFNjb3BlLCBBdXRoRmFjdG9yeSl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcblxuICAgICAgICAgICAgcmVtb3RlREIuZ2V0U2Vzc2lvbigpXG4gICAgICAgICAgICAudGhlbihyZXMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJuYW1lID0gcmVzLnVzZXJDdHgubmFtZTtcbiAgICAgICAgICAgICAgICBpZih1c2VybmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRhcHBseShmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gdXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBBdXRoRmFjdG9yeS5zeW5jREIodXNlcm5hbWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChjb25zb2xlLmVycm9yLmJpbmQoY29uc29sZSkpXG5cbiAgICAgICAgICAgIHNjb3BlLnN5bmNpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHJvb3RTY29wZS5zeW5jO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9naW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZighJHJvb3RTY29wZS51c2VyKSAkc3RhdGUuZ28oJ3NpZ251cCcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG59KTtcbiIsImJ1bGxldEFwcC5kaXJlY3RpdmUoJ3NlYXJjaEJhcicsIGZ1bmN0aW9uKGN1cnJlbnRTdGF0ZXMsICRzdGF0ZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnc2NyaXB0cy9zZWFyY2gvc2VhcmNoLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ2V0QnVsbGV0cyA9IGZ1bmN0aW9uKHNlYXJjaCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBCdWxsZXQuZmV0Y2hBbGwoc2VhcmNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNjb3BlLmdvID0gZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgIGlmIChpdGVtLmNvbGxlY3Rpb25zLmxlbmd0aCkgJHN0YXRlLmdvKCdnZW5lcmljJywge2lkOiBpdGVtLmNvbGxlY3Rpb25zWzBdfSk7XG4gICAgICAgICAgICAgICAgZWxzZSAkc3RhdGUuZ28oJ2luZGV4Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH07XG59KTtcbiIsIi8qanNoaW50IG5vZGU6dHJ1ZSwgZXN2ZXJzaW9uOjYqL1xuYnVsbGV0QXBwLmZhY3RvcnkoJ0F1dGhGYWN0b3J5JywgZnVuY3Rpb24gKCRzdGF0ZSwgJHJvb3RTY29wZSwgJHRpbWVvdXQpIHtcblxuICAgIGNvbnN0IEF1dGggPSB7fTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVVzZXJEQih1c2VyLCB2ZXJiKSB7XG4gICAgICAgIGxldCB1c2VybmFtZSA9IHVzZXIuZW1haWwuc3BsaXQoJ0AnKVswXTtcbiAgICAgICAgcmV0dXJuIHJlbW90ZURCW3ZlcmJdKHVzZXJuYW1lLCB1c2VyLnBhc3N3b3JkKVxuICAgICAgICAgICAgLnRoZW4ocmVzID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiB2ZXJiID09PSAnc2lnbnVwJyA/IEF1dGgubG9naW4odXNlcikgOiByZXM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4ocmVzID0+IHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRhcHBseShmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnVzZXIgPSByZXMubmFtZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhBdXRoLnN5bmNEQih1c2VybmFtZSkpO1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaW5kZXgnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChlcnIgPT4gY29uc29sZS5lcnJvcihcIkNvdWxkbid0IHNpZ25pbjogXCIsIGVycikpO1xuICAgIH1cblxuICAgIEF1dGguc3luY0RCID0gZnVuY3Rpb24odXNlcm5hbWUpIHtcbiAgICAgICAgcmVtb3RlREIgPSBuZXcgUG91Y2hEQihyZW1vdGVEQkFkZHJlc3MgKyB1c2VyREJVcmwodXNlcm5hbWUpLCB7XG4gICAgICAgICAgICBza2lwU2V0dXA6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkYi5zeW5jKHJlbW90ZURCLCB7XG4gICAgICAgICAgICAgICAgbGl2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZXRyeTogdHJ1ZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignYWN0aXZlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zeW5jID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbigncGF1c2VkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnN5bmMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgQXV0aC5sb2dpbiA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVVc2VyREIodXNlciwgJ2xvZ2luJyk7XG4gICAgfVxuXG4gICAgQXV0aC5zaWdudXAgPSBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gY3JlYXRlVXNlckRCKHVzZXIsICdzaWdudXAnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gQXV0aDtcbn0pO1xuIiwiYnVsbGV0QXBwLmNvbnRyb2xsZXIoJ3NpZ251cEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEF1dGhGYWN0b3J5KXtcbiAgICBhbmd1bGFyLmV4dGVuZCgkc2NvcGUsIEF1dGhGYWN0b3J5KTtcbn0pO1xuIiwiYnVsbGV0QXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICAgICAgdXJsOiAnL3NpZ251cCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnc2NyaXB0cy9zaWdudXAvc2lnbnVwLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnc2lnbnVwQ3RybCdcbiAgICB9KTtcblxufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
