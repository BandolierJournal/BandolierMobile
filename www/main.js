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
const remoteDBAddress = 'http://50.112.218.37:5984/';

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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl91dGlscy9jb250ZW50ZWRpdGFibGUuZGlyZWN0aXZlLmpzIiwiX3V0aWxzL2N1cnJlbnRzdGF0ZXMuZmFjdG9yeS5qcyIsIl91dGlscy9kYXRlLmZhY3RvcnkuanMiLCJfdXRpbHMvZGlzcGxheS50eXBlLmZpbHRlci5qcyIsIl91dGlscy9zbGljZS5maWx0ZXIuanMiLCJfdXRpbHMvc3RhdGUubmFtZS5maWx0ZXIuanMiLCJhZGQtY29sbGVjdGlvbi9hZGQtY29sbGVjdGlvbi1kaXJlY3RpdmUuanMiLCJidWxsZXRzL2J1bGxldC5kaXJlY3RpdmUuanMiLCJidWxsZXRzL2ljb24uZGlyZWN0aXZlLmpzIiwiY29sbGVjdGlvbnMvY29sbGVjdGlvbi5kaXJlY3RpdmUuanMiLCJkYXRlcGlja2VyL2RhdGVwaWNrZXIuZGlyZWN0aXZlLmpzIiwiZm9vdGVyL2Zvb3Rlci5kaXJlY3RpdmUuanMiLCJnZW5lcmljL2dlbmVyaWMuY29udHJvbGxlci5qcyIsImdlbmVyaWMvZ2VuZXJpYy5zdGF0ZS5qcyIsImluZGV4L2luZGV4LmNvbnRyb2xsZXIuanMiLCJpbmRleC9pbmRleC5zdGF0ZS5qcyIsImxvZy9kYWlseS5zdGF0ZS5qcyIsImxvZy9mdXR1cmUuc3RhdGUuanMiLCJsb2cvbG9nLmNvbnRyb2xsZXIuanMiLCJtb250aC1jYWwvbW9udGguY2FsLmRpcmVjdGl2ZS5qcyIsIm1vbnRobHl0cmFja2VyL21vbnRobHl0cmFja2VyLmNvbnRyb2xsZXIuanMiLCJtb250aGx5dHJhY2tlci9tb250aGx5dHJhY2tlci5zdGF0ZS5qcyIsInJlZnJlc2gvcmVmcmVzaFN0YXR1cy5kaXJlY3RpdmUuanMiLCJzZWFyY2gvc2VhcmNoLmRpcmVjdGl2ZS5qcyIsInNpZ251cC9hdXRoLmZhY3RvcnkuanMiLCJzaWdudXAvc2lnbnVwLmNvbnRyb2xsZXIuanMiLCJzaWdudXAvc2lnbnVwLnN0YXRlLmpzIiwicmVuZGVyZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJidWxsZXRBcHAuZGlyZWN0aXZlKCdjb250ZW50ZWRpdGFibGUnLCBmdW5jdGlvbiAoJHNhbml0aXplKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICByZXF1aXJlOiAnP25nTW9kZWwnLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIG5nTW9kZWwpIHtcbiAgICAgIGlmICghbmdNb2RlbCkgcmV0dXJuO1xuICAgICAgZnVuY3Rpb24gcmVhZCgpIHtcbiAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKGVsZW1lbnQuaHRtbCgpKTtcbiAgICAgIH1cbiAgICAgIG5nTW9kZWwuJHJlbmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNhbml0YXJ5ID0gJHNhbml0aXplKG5nTW9kZWwuJHZpZXdWYWx1ZSB8fCAnJyk7XG4gICAgICAgIGVsZW1lbnQuaHRtbChzYW5pdGFyeSk7XG4gICAgICB9O1xuICAgICAgZWxlbWVudC5iaW5kKCdibHVyIGtleXVwIGNoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2NvcGUuJGFwcGx5KHJlYWQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSk7XG5cblxuYnVsbGV0QXBwLmRpcmVjdGl2ZSgnZWF0Q2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsImJ1bGxldEFwcC5mYWN0b3J5KCdjdXJyZW50U3RhdGVzJywgZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgdmFyIGN1cnJlbnRTdGF0ZXMgPSB7XG4gICAgZGFpbHk6IG51bGwsXG4gICAgbW9udGg6IG51bGwsXG4gICAgZnV0dXJlOiBudWxsLFxuICAgIGdlbmVyaWM6IG51bGwsXG4gICAgZ2VuZXJpY1RpdGxlOiBmYWxzZVxuICB9XG4gICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24oZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMpe1xuICAgIGN1cnJlbnRTdGF0ZXNbdG9TdGF0ZS5uYW1lXSA9IHRvUGFyYW1zXG4gICAgLy8gVGhlc2UgYXJlIHVzZWZ1bCBmb3IgdGVzdGluZ1xuICAgIC8vIGNvbnNvbGUubG9nKCd0cycsIHRvU3RhdGUpO1xuICAgIC8vIGNvbnNvbGUubG9nKCd0cCcsIHRvUGFyYW1zKTtcbiAgICAvLyBjb25zb2xlLmxvZygnZnMnLCBmcm9tU3RhdGUpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdmcCcsIGZyb21QYXJhbXMpO1xuICB9KTtcblxuICAkcm9vdFNjb3BlLiRvbigncGFnZUNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50LCBhcmdzKXtcbiAgICBpZiAoYXJncy50eXBlID09PSAnbW9udGgnKSBjdXJyZW50U3RhdGVzLmZ1dHVyZSA9IHtpbmRleDogYXJncy5pbmRleH07XG4gICAgaWYgKGFyZ3MudHlwZSA9PT0gJ2RheScpIGN1cnJlbnRTdGF0ZXMuZGFpbHkgPSB7aW5kZXg6IGFyZ3MuaW5kZXh9O1xuICB9KTtcblxuICAvL1RoaXMgY29uc29sZSBsb2dzIGlmIHRoZXJlIGFyZSBlcnJvcnMgaW4gYSBzdGF0ZSBjaGFuZ2VcbiAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24oZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMpe1xuICAgIGNvbnNvbGUubG9nKCdlcnInLCBldmVudCk7XG4gICAgY29uc29sZS5sb2coJ3RzJywgdG9TdGF0ZSk7XG4gICAgY29uc29sZS5sb2coJ3RwJywgdG9QYXJhbXMpO1xuICAgIGNvbnNvbGUubG9nKCdmcycsIGZyb21TdGF0ZSk7XG4gICAgY29uc29sZS5sb2coJ2ZwJywgZnJvbVBhcmFtcyk7XG4gIH0pO1xuXG5cbiAgcmV0dXJuIGN1cnJlbnRTdGF0ZXNcbn0pXG4iLCJidWxsZXRBcHAuZmFjdG9yeSgnRGF0ZUZhY3RvcnknLCBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IHRvZGF5ID0gbW9tZW50KCkuc3RhcnRPZignZGF5JykudG9JU09TdHJpbmcoKTsgLy8gVE9ETzogbWFrZSB0aGlzIGEgZnVuY3Rpb24gKHNvIHRvZGF5IGlzIGFsd2F5cyB1cCB0byBkYXRlKVxuICAgIGxldCB5ZXN0ZXJkYXkgPSBtb21lbnQodG9kYXkpLnN1YnRyYWN0KDEsICdkYXlzJykudG9JU09TdHJpbmcoKTtcbiAgICBsZXQgdGhpc01vbnRoID0gbW9tZW50KCkuc3RhcnRPZignbW9udGgnKS50b0lTT1N0cmluZygpO1xuXG4gICAgZnVuY3Rpb24gc3BsaXRDb2xsZWN0aW9ucyhjb2xsZWN0aW9ucykge1xuICAgICAgICBpZiAoIWNvbGxlY3Rpb25zLmxlbmd0aCkgcmV0dXJuIFtcbiAgICAgICAgICAgIFtdLFxuICAgICAgICAgICAgW11cbiAgICAgICAgXTtcbiAgICAgICAgbGV0IGxhc3QgPSAoY29sbGVjdGlvbnNbMF0udHlwZSA9PT0gXCJkYXlcIikgPyB5ZXN0ZXJkYXkgOiBsYXN0TW9udGgoKTtcbiAgICAgICAgbGV0IHNwbGl0ID0gXy5wYXJ0aXRpb24oY29sbGVjdGlvbnMsIGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgICByZXR1cm4gYy50aXRsZSA8IGxhc3Q7XG4gICAgICAgIH0pXG4gICAgICAgIGxldCBhZ2VkID0gc3BsaXRbMF0uc29ydChjaHJvbm9Tb3J0KTtcbiAgICAgICAgbGV0IGZ1dHVyZSA9IHNwbGl0WzFdO1xuICAgICAgICByZXR1cm4gW2FnZWQsIGZ1dHVyZV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hyb25vU29ydChhLCBiKSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZShhLnRpdGxlKSAtIG5ldyBEYXRlKGIudGl0bGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJvdW5kRGF0ZShkYXRlLCB0eXBlKSB7XG4gICAgICAgIHR5cGUgPSB0eXBlIHx8ICdkYXknOyAvLyBvciBtb250aFxuICAgICAgICByZXR1cm4gbW9tZW50KGRhdGUpLnN0YXJ0T2YodHlwZSkudG9JU09TdHJpbmcoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXNwbGF5KG9mZnNldCwgdHlwZSkgeyAvL29mZnNldCBmcm9tIHRvZGF5XG4gICAgICAgIGxldCBkaXNwbGF5ID0gW107XG4gICAgICAgIGxldCBjdXJyZW50ID0gKHR5cGUgPT09ICdkYXknKSA/IHRvZGF5IDogdGhpc01vbnRoO1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA+IC01OyBpLS0pIHtcbiAgICAgICAgICAgIGRpc3BsYXkucHVzaChtb21lbnQoY3VycmVudCkuc3VidHJhY3QoaSAtIG9mZnNldCwgdHlwZSArICdzJykudG9JU09TdHJpbmcoKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdtb250aCcpIHR5cGUgPSAnZnV0dXJlJztcbiAgICAgICAgcmV0dXJuIGRpc3BsYXkubWFwKChlLCBpbmRleCkgPT4gbmV3IENvbGxlY3Rpb24oe1xuICAgICAgICAgICAgdGl0bGU6IGUsXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgaWQ6IG1vbWVudCgpLmFkZChpbmRleCwgJ21pbGxpc2Vjb25kcycpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgfSkpO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gbW9udGhDYWwobW9udGgpIHtcbiAgICAgICAgbW9udGggPSBuZXcgRGF0ZShtb250aCk7XG4gICAgICAgIGxldCBkYXkgPSBtb250aDtcbiAgICAgICAgbGV0IGRheUFycmF5ID0gW107XG4gICAgICAgIHdoaWxlIChkYXkuZ2V0TW9udGgoKSA9PSBtb250aC5nZXRNb250aCgpKSB7XG4gICAgICAgICAgICBkYXlBcnJheS5wdXNoKGRheS50b0lTT1N0cmluZygpKTtcbiAgICAgICAgICAgIGRheSA9IG1vbWVudChkYXkpLmFkZCgxLCAnZGF5cycpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBkYXkgPSBuZXcgRGF0ZShkYXkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXlBcnJheTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRDaG9pY2VzKGlucHV0KSB7XG4gICAgICAgIGxldCBbbW9udGgsIGRheSwgeWVhcl0gPSBpbnB1dC5zcGxpdCgnICcpO1xuICAgICAgICBsZXQgY2hvaWNlcyA9IFtdO1xuICAgICAgICBpZiAoIWRheSkgY2hvaWNlcyA9IG1vbWVudC5tb250aHMoKVxuICAgICAgICBlbHNlIGlmICgheWVhcikge1xuICAgICAgICAgICAgZm9yIChsZXQgeSBvZiBuZXh0TlllYXJzKDEwKSkge1xuICAgICAgICAgICAgICAgIGNob2ljZXMucHVzaChgJHttb250aH0gJHt5fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2hvaWNlcyA9IFtcbiAgICAgICAgICAgICAgICAuLi5tb250aENhbChtb21lbnQoKS5tb250aChtb250aCkuc3RhcnRPZignbW9udGgnKSlcbiAgICAgICAgICAgICAgICAubWFwKGQgPT4gYCR7bW9udGh9ICR7bW9tZW50KGQpLmRhdGUoKX1gKSxcbiAgICAgICAgICAgICAgICAuLi5jaG9pY2VzXG4gICAgICAgICAgICBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChsZXQgeSBvZiBuZXh0TlllYXJzKDEwKSkge1xuICAgICAgICAgICAgICAgIGNob2ljZXMucHVzaChgJHttb250aH0gJHtkYXl9ICR7eX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2hvaWNlcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb252ZXJ0RGF0ZShkYXRlSW5wdXQpIHtcbiAgICAgICAgbGV0IFttb250aCwgZGF5LCB5ZWFyXSA9IGRhdGVJbnB1dC5zcGxpdCgnICcpO1xuICAgICAgICBsZXQgZGF0ZSA9IG1vbWVudCgpLm1vbnRoKG1vbnRoKTtcbiAgICAgICAgbGV0IHR5cGUgPSAnZGF5JztcblxuICAgICAgICBpZigheWVhcikge1xuICAgICAgICAgICAgaWYoZGF5IDwgMzIpIGRhdGUgPSBkYXRlLmRhdGUoZGF5KTtcbiAgICAgICAgICAgIGVsc2UgW2RhdGUsIHR5cGVdID0gW3JvdW5kRGF0ZShkYXRlLnllYXIoZGF5KSwgJ21vbnRoJyksICdmdXR1cmUnXVxuICAgICAgICB9IGVsc2UgZGF0ZSA9IGRhdGUuZGF0ZShkYXkpLnllYXIoeWVhcik7XG4gICAgICAgIHJldHVybiBbcm91bmREYXRlKGRhdGUpLCB0eXBlXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRXZWVrZGF5KGRhdGUpIHtcbiAgICAgICAgbGV0IHdlZWtkYXkgPSBtb21lbnQoZGF0ZSkuaXNvV2Vla2RheSgpO1xuICAgICAgICB3ZWVrZGF5ID0gbW9tZW50KCkuaXNvV2Vla2RheSh3ZWVrZGF5KS5mb3JtYXQoJ2RkZGQnKVxuICAgICAgICByZXR1cm4gd2Vla2RheTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsYXN0TW9udGgoY3VycmVudE1vbnRoKSB7XG4gICAgICAgIGN1cnJlbnRNb250aCA9IGN1cnJlbnRNb250aCB8fCB0aGlzTW9udGhcbiAgICAgICAgcmV0dXJuIG1vbWVudChjdXJyZW50TW9udGgpLnN1YnRyYWN0KDEsICdtb250aCcpLnRvSVNPU3RyaW5nKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0TW9udGgoY3VycmVudE1vbnRoKSB7XG4gICAgICAgIGN1cnJlbnRNb250aCA9IGN1cnJlbnRNb250aCB8fCB0aGlzTW9udGhcbiAgICAgICAgcmV0dXJuIG1vbWVudChjdXJyZW50TW9udGgpLmFkZCgxLCAnbW9udGgnKS50b0lTT1N0cmluZygpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24qIG5leHROWWVhcnMobikge1xuICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgIGNvbnN0IHRoaXNZZWFyID0gbW9tZW50KHRoaXNNb250aCkueWVhcigpO1xuICAgICAgICB3aGlsZSAoaSA8IG4pIHtcbiAgICAgICAgICAgIHlpZWxkIHRoaXNZZWFyICsgaTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZGlzcGxheTogZGlzcGxheSxcbiAgICAgICAgcm91bmREYXRlOiByb3VuZERhdGUsXG4gICAgICAgIG1vbnRoQ2FsOiBtb250aENhbCxcbiAgICAgICAgc3BsaXRDb2xsZWN0aW9uczogc3BsaXRDb2xsZWN0aW9ucyxcbiAgICAgICAgZ2V0Q2hvaWNlczogZ2V0Q2hvaWNlcyxcbiAgICAgICAgY29udmVydERhdGU6IGNvbnZlcnREYXRlLFxuICAgICAgICB0b2RheTogdG9kYXksXG4gICAgICAgIHRoaXNNb250aDogdGhpc01vbnRoLFxuICAgICAgICBsYXN0TW9udGg6IGxhc3RNb250aCxcbiAgICAgICAgbmV4dE1vbnRoOiBuZXh0TW9udGgsXG4gICAgICAgIGdldFdlZWtkYXk6IGdldFdlZWtkYXksXG4gICAgICAgIG5leHROWWVhcnM6IG5leHROWWVhcnNcbiAgICB9XG59KVxuIiwiYnVsbGV0QXBwLmZpbHRlcignZGlzcGxheVR5cGUnLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuICAgIHZhciBvdXRwdXQ7XG4gICAgc3dpdGNoKGlucHV0KSB7XG4gICAgICBjYXNlICdkYXknOlxuICAgICAgICBvdXRwdXQgPSAnRGF5JztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdtb250aCc6XG4gICAgICAgIG91dHB1dCA9ICdNb250aCc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbW9udGgtY2FsJzpcbiAgICAgICAgb3V0cHV0ID0gJ01vbnRobHkgQ2FsZW5kYXInO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2Z1dHVyZSc6XG4gICAgICAgIG91dHB1dCA9ICdGdXR1cmUgTG9nJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdnZW5lcmljJzpcbiAgICAgICAgb3V0cHV0ID0gJ0N1c3RvbSc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgb3V0cHV0ID0gJyc7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0XG4gIH1cbn0pXG4iLCJidWxsZXRBcHAuZmlsdGVyKCdzbGljZScsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gZnVuY3Rpb24oYXJyLCBzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChhcnIgfHwgW10pLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICB9O1xufSk7IiwiYnVsbGV0QXBwLmZpbHRlcignc3RhdGVOYW1lJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICB2YXIgb3V0cHV0O1xuICAgIHN3aXRjaChpbnB1dCkge1xuICAgICAgY2FzZSAnZGF5JzpcbiAgICAgICAgb3V0cHV0ID0gJ2RhaWx5JztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdtb250aCc6XG4gICAgICAgIG91dHB1dCA9ICdtb250aCc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbW9udGgtY2FsJzpcbiAgICAgICAgb3V0cHV0ID0gJ21vbnRoJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdmdXR1cmUnOlxuICAgICAgICBvdXRwdXQgPSAnZnV0dXJlJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdnZW5lcmljJzpcbiAgICAgICAgb3V0cHV0ID0gJ2dlbmVyaWMnO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG91dHB1dCA9ICcnO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dFxuICB9XG59KVxuIiwiYnVsbGV0QXBwLmRpcmVjdGl2ZSgnYWRkQ29sbGVjdGlvbicsIGZ1bmN0aW9uKCRzdGF0ZSwgJGZpbHRlcikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWRkLWNvbGxlY3Rpb24vYWRkLWNvbGxlY3Rpb24tdGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uVHlwZTogJ0AnXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5jb2xsZWN0aW9uVHlwZSA9IHNjb3BlLmNvbGxlY3Rpb25UeXBlIHx8ICdnZW5lcmljJztcbiAgICAgICAgICAgIC8vIFRPRE86IEFkZCB2YWxpZGF0aW9ucyB0byBjcmVhdGUgY29sbGVjdGlvbnMgZm9yIGRheSwgbW9udGgsIGV0Yy5cbiAgICAgICAgICAgIC8vIF5eIEluY29ycG9yYXRlIHRoaXMgaW50byBTYWJyaW5hJ3MgZGF0ZSB2YWxpZGF0aW9uc1xuICAgICAgICAgICAgc2NvcGUuY3JlYXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICAgICAgbmV3IENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUsIHNjb3BlLmNvbGxlY3Rpb25UeXBlKVxuICAgICAgICAgICAgICAgICAgICAuc2F2ZSgpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGNvbGxlY3Rpb24gPT4gJHN0YXRlLmdvKCRmaWx0ZXIoJ3N0YXRlTmFtZScpKHNjb3BlLmNvbGxlY3Rpb25UeXBlKSwgeyBpZDogY29sbGVjdGlvbi5pZCB9KSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuY29sbGVjdGlvbk5hbWUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS50ZW1wbGF0ZVVybCA9ICdqcy9hZGQtY29sbGVjdGlvbi9jb2xsZWN0aW9uLWZvcm0uaHRtbCc7XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYnVsbGV0QXBwLmRpcmVjdGl2ZSgnYnVsbGV0JywgZnVuY3Rpb24oRGF0ZUZhY3RvcnksICR0aW1lb3V0LCAkcm9vdFNjb3BlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9idWxsZXRzL2J1bGxldC50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIGJ1bGxldDogJz0nLFxuICAgICAgICAgICAgcmVtb3ZlRm46ICcmJyxcbiAgICAgICAgICAgIGFkZEZuOiAnJicsXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuXG4gICAgICAgICAgICBzY29wZS5zaG93QnV0dG9uID0gMDtcbiAgICAgICAgICAgIHNjb3BlLmVuYWJsZUJ1dHRvbiA9IGZhbHNlO1xuICAgICAgICAgICAgc2NvcGUudHlwZURpY3QgPSB0eXBlRGljdDtcbiAgICAgICAgICAgIHNjb3BlLmhpZGVJY29uID0gKGF0dHJzLm5vSWNvbikgPyB0cnVlIDogZmFsc2U7XG5cbiAgICAgICAgICAgIHNjb3BlLmVkaXRhYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzY29wZS5idWxsZXQuc3RhdHVzKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuYnVsbGV0LnN0YXR1cyA9PT0gXCJpbmNvbXBsZXRlXCIgfHwgc2NvcGUuYnVsbGV0LnN0YXR1cyA9PT0gXCJuZXdcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUudG9nZ2xlU2NoZWR1bGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzY29wZS5idWxsZXQuZGF0ZSkgc2NvcGUuYnVsbGV0LmRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgIHNjb3BlLnNob3dTY2hlZHVsZXIgPSAhc2NvcGUuc2hvd1NjaGVkdWxlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUudGVtcGxhdGVVcmwgPSAnanMvYnVsbGV0cy90eXBlLnRlbXBsYXRlLmh0bWwnO1xuICAgICAgICAgICAgc2NvcGUuZGF0ZXBpY2tlclVybCA9ICdqcy9idWxsZXRzL2RhdGVwaWNrZXIudGVtcGxhdGUuaHRtbCc7XG5cbiAgICAgICAgICAgIHNjb3BlLnNlbGVjdFR5cGUgPSBmdW5jdGlvbihiLCB0eXBlKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHNjb3BlLmJ1bGxldC5zdGF0dXM7XG4gICAgICAgICAgICAgICAgc2NvcGUuYnVsbGV0ID0gbmV3IEJ1bGxldFt0eXBlXShiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgT1MgPSBwcm9jZXNzLnBsYXRmb3JtO1xuXG4gICAgICAgICAgICBzY29wZS5zaG93QnV0dG9uUGFuZWwgPSBmdW5jdGlvbihiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIuc3RhdHVzID09PSAnaW5jb21wbGV0ZScgJiZcbiAgICAgICAgICAgICAgICAgICAgYi5yZXYgJiZcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZW5hYmxlQnV0dG9ucztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLnNob3dTY2hlZHVsZUJ1dHRvbiA9IGZ1bmN0aW9uKGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYi50eXBlICE9PSAnTm90ZSc7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5zaG93TWlncmF0ZUJ1dHRvbiA9IGZ1bmN0aW9uKGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYi50eXBlID09PSAnVGFzayc7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5taWdyYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuYnVsbGV0Lm1pZ3JhdGUoKVxuICAgICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiBzY29wZS4kZXZhbEFzeW5jKCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUub3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBtaW5Nb2RlOiAnZGF5J1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS5zY2hlZHVsZSA9IGZ1bmN0aW9uKG1vZGUpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5idWxsZXQuZGF0ZSA9IERhdGVGYWN0b3J5LnJvdW5kRGF0ZShzY29wZS5idWxsZXQuZGF0ZSwgbW9kZSk7XG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvd1NjaGVkdWxlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnbW9udGgnKSBtb2RlID0gJ2Z1dHVyZSc7XG4gICAgICAgICAgICAgICAgc2NvcGUuYnVsbGV0LnNjaGVkdWxlKHNjb3BlLmJ1bGxldC5kYXRlLCBtb2RlKVxuICAgICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gZWRpdEJ1bGxldChlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNjb3BlLmJ1bGxldC5zdGF0dXMgIT09ICdtaWdyYXRlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLmVkaXRhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNtZC10IGNoYW5nZSB0byB0YXNrXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgc2NvcGUuYnVsbGV0LnN0YXR1cztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLndoaWNoID09PSA4NCkgcmV0dXJuIG5ldyBCdWxsZXQuVGFzayhzY29wZS5idWxsZXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY21kLWUgY2hhbmdlIHRvIGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gNjkpIHJldHVybiBuZXcgQnVsbGV0LkV2ZW50KHNjb3BlLmJ1bGxldCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjbWQtbiBjaGFuZ2UgdG8gbm90ZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDc4KSByZXR1cm4gbmV3IEJ1bGxldC5Ob3RlKHNjb3BlLmJ1bGxldCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gY21kLWQgdG9nZ2xlIGRvbmUgZm9yIHRhc2tzXG4gICAgICAgICAgICAgICAgICAgIGlmIChlLndoaWNoID09PSA2OCAmJiBzY29wZS5idWxsZXQudHlwZSA9PT0gJ1Rhc2snKSByZXR1cm4gc2NvcGUuYnVsbGV0LnRvZ2dsZURvbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY21kLXggY3Jvc3Mgb3V0XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLndoaWNoID09PSA4OCAmJiBzY29wZS5idWxsZXQudHlwZSA9PT0gJ1Rhc2snKSByZXR1cm4gc2NvcGUuYnVsbGV0LnRvZ2dsZVN0cmlrZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBjbWQtZGVsIHJlbW92ZSBmcm9tIGNvbGxlY3Rpb25cbiAgICAgICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gOCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUuYnVsbGV0LnJldikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUucmVtb3ZlRm4oKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlbGVtZW50Lm9uKCdrZXlkb3duJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLndoaWNoICE9PSA5ICYmIGUud2hpY2ggIT09IDkxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLndoaWNoID09PSAxMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5ibHVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoKE9TID09PSAnZGFyd2luJyAmJiBlLm1ldGFLZXkpIHx8IChPUyAhPT0gJ2RhcndpbicgJiYgZS5jdHJsS2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHVwZGF0ZWRCdWxsZXQgPSBlZGl0QnVsbGV0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVwZGF0ZWRCdWxsZXQpIHNjb3BlLmJ1bGxldCA9IHVwZGF0ZWRCdWxsZXQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcGUuYnVsbGV0LnN0YXR1cyA9PT0gJ3N0cnVjaycgfHwgc2NvcGUuYnVsbGV0LnN0YXR1cyA9PT0gJ2NvbXBsZXRlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggIT09IDkpIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBzY29wZS5zYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LnJlbGF0ZWRUYXJnZXQgJiYgZXZlbnQucmVsYXRlZFRhcmdldC5pZCA9PT0gJ21pZ3JhdGUnKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzY29wZS5idWxsZXQucmV2KSBzY29wZS5hZGRGbigpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIHNjb3BlLmJ1bGxldC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcblxuICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5lbmFibGVCdXR0b25zID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSwgMzAwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiLypqc2hpbnQgZXN2ZXJzaW9uOiA2Ki9cbmJ1bGxldEFwcC5kaXJlY3RpdmUoJ2J1bGxldEljb24nLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2J1bGxldHMvaWNvbi50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIGJ1bGxldDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG5cbiAgICAgICAgICAgIHNjb3BlLmljb25UeXBlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgbGV0IHR5cGU7XG4gICAgICAgICAgICAgICAgaWYgKCFzY29wZS5idWxsZXQuc3RhdHVzKSB0eXBlID0gc2NvcGUuYnVsbGV0LnR5cGU7XG4gICAgICAgICAgICAgICAgZWxzZSB0eXBlID0gc2NvcGUuYnVsbGV0LnN0YXR1cyA9PT0gJ2luY29tcGxldGUnID8gc2NvcGUuYnVsbGV0LnR5cGUgOiBzY29wZS5idWxsZXQuc3RhdHVzO1xuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlRGljdFt0eXBlXTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLnRvZ2dsZURvbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUuYnVsbGV0LnR5cGUgPT09IFwiVGFza1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmJ1bGxldC50b2dnbGVEb25lKCk7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmJ1bGxldC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiLypqc2hpbnQgZXN2ZXJzaW9uOiA2Ki9cblxuYnVsbGV0QXBwLmRpcmVjdGl2ZSgnY29sbGVjdGlvbicsIGZ1bmN0aW9uKCRsb2csICRyb290U2NvcGUsIGN1cnJlbnRTdGF0ZXMsIERhdGVGYWN0b3J5KXtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbGxlY3Rpb25zL2NvbGxlY3Rpb24udGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiAnPScsXG4gICAgICAgICAgICBub0FkZDogJz0nLFxuICAgICAgICAgICAgbW9udGhUaXRsZTogJz0nLFxuICAgICAgICAgICAgbm9UaXRsZTogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5mb3JtYXR0ZWRUaXRsZSA9IHNjb3BlLm1vbnRoVGl0bGUgPyBmb3JtYXRUaXRsZSh7dGl0bGU6IHNjb3BlLm1vbnRoVGl0bGUsIHR5cGU6ICdtb250aCd9KSA6IGZvcm1hdFRpdGxlKHNjb3BlLmNvbGxlY3Rpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzY29wZS5uZXdCdWxsZXQgPSBuZXcgQnVsbGV0LlRhc2soe3N0YXR1czogJ25ldyd9KTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gZm9ybWF0VGl0bGUoY29sbGVjdGlvbikge1xuICAgICAgICAgICAgICAgIHN3aXRjaChjb2xsZWN0aW9uLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbW9udGgnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdMb2cnOyAvL21vbWVudChjb2xsZWN0aW9uLnRpdGxlKS5mb3JtYXQoJ01NTU0nKSsnIExvZyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZnV0dXJlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnQoY29sbGVjdGlvbi50aXRsZSkuZm9ybWF0KCdNTU0gWVlZWScpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBEYXRlRmFjdG9yeS5nZXRXZWVrZGF5KGNvbGxlY3Rpb24udGl0bGUpKycsICcrbW9tZW50KGNvbGxlY3Rpb24udGl0bGUpLmZvcm1hdCgnTU1NTSBEJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbW9udGgtY2FsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnQoY29sbGVjdGlvbi50aXRsZSkuZm9ybWF0KCdNTU1NJykrJyBDYWxlbmRhcic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb2xsZWN0aW9uLnRpdGxlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICAgICAgKiBUaGlzIGZ1bmN0aW9uIHdpbGwgcmVtb3ZlIHRoZSBidWxsZXQgZnJvbSB0aGUgY29sbGVjdGlvblxuICAgICAgICAgICAgKiBhbmQgdGhlbiBtYWtlIHN1cmUgdGhlIGJ1bGxldCBpcyBhbHNvIHJlbW92ZWQgZnJvbSB0aGVcbiAgICAgICAgICAgICogbG9jYWwgYnVsbGV0cyBhcnJheS5cbiAgICAgICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4gICAgICAgICAgICBzY29wZS5yZW1vdmVCdWxsZXQgPSBmdW5jdGlvbihidWxsZXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuY29sbGVjdGlvbi5yZW1vdmVCdWxsZXQoYnVsbGV0KVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICBpZiAoYnVsbGV0LmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmNvbGxlY3Rpb24uYnVsbGV0cyA9IHNjb3BlLmNvbGxlY3Rpb24uYnVsbGV0cy5maWx0ZXIoYiA9PiBiLmlkICE9PSBidWxsZXQuaWQpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKCRsb2cuZXJyKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmFkZEJ1bGxldCA9IGZ1bmN0aW9uKGJ1bGxldCkge1xuICAgICAgICAgICAgICAgIGlmIChidWxsZXQuY29udGVudCAmJiBidWxsZXQuY29udGVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuY29sbGVjdGlvbi5hZGRCdWxsZXQoYnVsbGV0KVxuICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICBzY29wZS5uZXdCdWxsZXQgPSBuZXcgQnVsbGV0LlRhc2soe3N0YXR1czogJ25ldyd9KVxuICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRldmFsQXN5bmMoKVxuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycik7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCJidWxsZXRBcHAuZGlyZWN0aXZlKCdkYXRlUGlja2VyJywgZnVuY3Rpb24gKERhdGVGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kYXRlcGlja2VyL2RhdGVwaWNrZXIudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ2V0RGF0ZXMgPSBEYXRlRmFjdG9yeS5nZXRDaG9pY2VzO1xuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiYnVsbGV0QXBwLmRpcmVjdGl2ZSgnZm9vdGVyJywgZnVuY3Rpb24oY3VycmVudFN0YXRlcywgJHN0YXRlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9mb290ZXIvZm9vdGVyLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuY3VycmVudFN0YXRlcyA9IGN1cnJlbnRTdGF0ZXM7XG4gICAgICAgICAgICBzY29wZS5sYXN0TW9udGggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFN0YXRlcy5tb250aCkgJHN0YXRlLmdvKCdtb250aCcsIGN1cnJlbnRTdGF0ZXMubW9udGgpXG4gICAgICAgICAgICAgICAgZWxzZSAkc3RhdGUuZ28oJ21vbnRoJywgeyBtb250aFN0cmluZzogbW9tZW50KCkuc3RhcnRPZignbW9udGgnKS50b0lTT1N0cmluZygpIH0pIC8vRGF0ZUZhY3RvcnkudGhpc01vbnRoLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5sYXN0RGFpbHkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2RhaWx5JywgY3VycmVudFN0YXRlcy5kYWlseSlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5sYXN0RnV0dXJlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdmdXR1cmUnLCBjdXJyZW50U3RhdGVzLmZ1dHVyZSlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5sYXN0R2VuZXJpYyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZ2VuZXJpYycsIGN1cnJlbnRTdGF0ZXMuZ2VuZXJpYylcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCJidWxsZXRBcHAuY29udHJvbGxlcignR2VuZXJpY0N0cmwnLCBmdW5jdGlvbigkc2NvcGUsIGNvbGxlY3Rpb24sICRzdGF0ZSkge1xuICAgIGlmIChjb2xsZWN0aW9uLnR5cGUgPT09ICdtb250aCcgfHwgY29sbGVjdGlvbi50eXBlID09PSAnbW9udGgtY2FsJykge1xuICAgIFx0Y29uc29sZS5sb2coY29sbGVjdGlvbik7XG4gICAgXHQkc3RhdGUuZ28oJ21vbnRoJywgeyBtb250aFN0cmluZzogY29sbGVjdGlvbi50aXRsZSB9KTtcbiAgICB9XG4gICAgJHNjb3BlLmNvbGxlY3Rpb24gPSBjb2xsZWN0aW9uO1xufSk7XG4iLCJidWxsZXRBcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdnZW5lcmljJywge1xuICAgIHVybDogJy9nZW5lcmljLzppZCcsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9nZW5lcmljL2dlbmVyaWMudGVtcGxhdGUuaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ0dlbmVyaWNDdHJsJyxcbiAgICByZXNvbHZlOiB7XG4gICAgICAgIGNvbGxlY3Rpb246IGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgY3VycmVudFN0YXRlcykge1xuICAgICAgICAgICAgcmV0dXJuIENvbGxlY3Rpb24uZmluZE9yUmV0dXJuKHtpZDogJHN0YXRlUGFyYW1zLmlkfSlcbiAgICAgICAgICAgICAgICAudGhlbihjID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFN0YXRlcy5nZW5lcmljVGl0bGUgPSBjWzBdLnRpdGxlXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjWzBdO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICB9KTtcblxufSk7XG4iLCJidWxsZXRBcHAuY29udHJvbGxlcignSW5kZXhDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBjb2xsZWN0aW9ucywgYnVsbGV0cywgQXV0aEZhY3RvcnkpIHtcbiAgICAkc2NvcGUuY29sbGVjdGlvbnMgPSBjb2xsZWN0aW9ucy5maWx0ZXIoY29sID0+IGNvbC50eXBlID09PSAnZ2VuZXJpYycpO1xuICAgICRzY29wZS5tb250aHMgPSBfLmdyb3VwQnkoY29sbGVjdGlvbnMuZmlsdGVyKGNvbCA9PiBjb2wudHlwZSA9PT0gJ21vbnRoJyB8fCBjb2wudHlwZSA9PT0gJ21vbnRoLWNhbCcpLCBpID0+IGkudGl0bGUpO1xuXG4gICAgJHNjb3BlLmRlbGV0ZUNvbGxlY3Rpb24gPSBmdW5jdGlvbihjb2xsZWN0aW9uKSB7XG4gICAgICAgIGNvbGxlY3Rpb24uZGVsZXRlKClcbiAgICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgaWR4ID0gJHNjb3BlLmNvbGxlY3Rpb25zLmluZGV4T2YoY29sbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbGxlY3Rpb25zLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG59KTtcbiIsImJ1bGxldEFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2luZGV4Jywge1xuICAgIHVybDogJy9pbmRleCcsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9pbmRleC9pbmRleC50ZW1wbGF0ZS5odG1sJyxcbiAgICBjb250cm9sbGVyOiAnSW5kZXhDdHJsJyxcbiAgICByZXNvbHZlOiB7XG4gICAgICAgIGNvbGxlY3Rpb25zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBDb2xsZWN0aW9uLmZldGNoQWxsKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGJ1bGxldHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIEJ1bGxldC5mZXRjaEFsbCgnZXZlbnQnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbn0pO1xuIiwiYnVsbGV0QXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RhaWx5Jywge1xuICAgICAgICB1cmw6ICcvZGFpbHkvOmluZGV4JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2cvbG9nLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9nQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb25zOiBmdW5jdGlvbihEYXRlRmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBDb2xsZWN0aW9uLmZldGNoQWxsKHsgdHlwZTogJ2RheScgfSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oRGF0ZUZhY3Rvcnkuc3BsaXRDb2xsZWN0aW9ucyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGFzdDogZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRzdGF0ZVBhcmFtcy5pbmRleCB8fCBudWxsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHR5cGU6ICgpID0+ICdkYXknXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG4iLCJidWxsZXRBcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZnV0dXJlJywge1xuICAgICAgICB1cmw6ICcvZnV0dXJlLzppbmRleCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9nL2xvZy50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ0N0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uczogZnVuY3Rpb24oRGF0ZUZhY3RvcnksICRsb2cpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQ29sbGVjdGlvbi5mZXRjaEFsbCh7IHR5cGU6ICdmdXR1cmUnIH0pXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKERhdGVGYWN0b3J5LnNwbGl0Q29sbGVjdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGFzdDogZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRzdGF0ZVBhcmFtcy5pbmRleCB8fCBudWxsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHR5cGU6ICgpID0+ICdtb250aCdcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcbiIsImJ1bGxldEFwcC5jb250cm9sbGVyKCdMb2dDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBjb2xsZWN0aW9ucywgRGF0ZUZhY3RvcnksIGxhc3QsIHR5cGUsICRyb290U2NvcGUsICRzdGF0ZVBhcmFtcykge1xuXG4gICAgY29uc3QgYWdlZCA9IGNvbGxlY3Rpb25zWzBdO1xuICAgIGNvbnN0IGZ1dHVyZSA9IGNvbGxlY3Rpb25zWzFdO1xuICAgIGxldCBpbmRleCA9IGFnZWQubGVuZ3RoO1xuXG4gICAgaWYgKCRzdGF0ZVBhcmFtcy5pbmRleCAmJiAkc3RhdGVQYXJhbXMuaW5kZXgubGVuZ3RoKSB7XG4gICAgICBpbmRleCA9ICskc3RhdGVQYXJhbXMuaW5kZXhcbiAgICAgIGlmIChpbmRleCA8IDApICRzY29wZS5jb2xsZWN0aW9ucyA9IGFnZWQuc2xpY2UoMCwgaW5kZXggKyA2KTtcbiAgICAgIGVsc2UgbmF2aWdhdGUoKVxuICAgIH0gZWxzZSB7XG4gICAgICBuZXc2KDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5ldzYob2Zmc2V0KSB7XG4gICAgICAgICRzY29wZS5jb2xsZWN0aW9ucyA9IFtdO1xuXG4gICAgICAgIERhdGVGYWN0b3J5LmRpc3BsYXkob2Zmc2V0LCB0eXBlKS5mb3JFYWNoKChjKSA9PiB7XG4gICAgICAgICAgICBsZXQgdXNlID0gZnV0dXJlLmZpbmQoZWwgPT4gZWwudGl0bGUgPT09IGMudGl0bGUpIHx8IGM7XG4gICAgICAgICAgICAkc2NvcGUuY29sbGVjdGlvbnMucHVzaCh1c2UpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAkc2NvcGUudGl0bGUgPSAoKHR5cGUgPT09ICdkYXknKSA/ICdEQUlMWScgOiAnRlVUVVJFJykgKyAnIExPRyc7XG5cbiAgICAkc2NvcGUucHJldjYgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGluZGV4IDw9IDApIHJldHVybjtcbiAgICAgICAgaWYgKGluZGV4IDwgNikge1xuICAgICAgICAgICAgJHNjb3BlLmNvbGxlY3Rpb25zID0gYWdlZC5zbGljZSgwLCBpbmRleCk7XG4gICAgICAgICAgICBpbmRleCAtPSA2O1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdwYWdlQ2hhbmdlJywge2luZGV4OiBpbmRleCwgdHlwZTogdHlwZX0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmRleCAtPSA2O1xuICAgICAgICAgICAgbmF2aWdhdGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgICRzY29wZS5uZXh0NiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpbmRleCArPSA2O1xuICAgICAgICBuYXZpZ2F0ZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5hdmlnYXRlKCkge1xuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3BhZ2VDaGFuZ2UnLCB7aW5kZXg6IGluZGV4LCB0eXBlOiB0eXBlfSlcbiAgICAgICAgaWYgKGluZGV4ID49IGFnZWQubGVuZ3RoKSBuZXc2KGluZGV4IC0gYWdlZC5sZW5ndGgpO1xuICAgICAgICBlbHNlICRzY29wZS5jb2xsZWN0aW9ucyA9IGFnZWQuc2xpY2UoaW5kZXgsIGluZGV4ICsgNik7XG4gICAgfVxuXG59KTtcbiIsIi8qanNoaW50IGVzdmVyc2lvbjogNiovXG5idWxsZXRBcHAuZGlyZWN0aXZlKCdtb250aENhbCcsIGZ1bmN0aW9uKCRsb2cpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL21vbnRoLWNhbC9tb250aC5jYWwudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiAnPScsXG4gICAgICAgICAgICBkYXlzOiAnPScsXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5mb3JtYXR0ZWRUaXRsZSA9ICdDYWxlbmRhcic7IC8vbW9tZW50KHNjb3BlLmNvbGxlY3Rpb24udGl0bGUpLmZvcm1hdCgnTU1NTSBZWVlZJykudG9VcHBlckNhc2UoKTtcblxuICAgICAgICAgICAgZ2VuZXJhdGVCdWxsZXRMaXN0KClcblxuICAgICAgICAgICAgZnVuY3Rpb24gZ2VuZXJhdGVCdWxsZXRMaXN0ICgpIHtcbiAgICAgICAgICAgICAgc2NvcGUuYnVsbGV0TGlzdCA9IHNjb3BlLmRheXMubWFwKGRheSA9PiB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuY29sbGVjdGlvbi5idWxsZXRzLmZpbmQoYnVsbGV0ID0+IGJ1bGxldC5kYXRlID09PSBkYXkpIHx8IG5ldyBCdWxsZXQuVGFzayh7XG4gICAgICAgICAgICAgICAgICAgICAgZGF0ZTogZGF5XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUucmVtb3ZlQnVsbGV0ID0gZnVuY3Rpb24oYnVsbGV0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlLmNvbGxlY3Rpb24ucmVtb3ZlQnVsbGV0KGJ1bGxldClcbiAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoYnVsbGV0LmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnVsbGV0TGlzdCgpXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBzY29wZS4kZXZhbEFzeW5jKClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycik7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5hZGRCdWxsZXQgPSBmdW5jdGlvbihidWxsZXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoYnVsbGV0LmNvbnRlbnQgJiYgYnVsbGV0LmNvbnRlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5jb2xsZWN0aW9uLmFkZEJ1bGxldChidWxsZXQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCIvKmpzaGludCBlc3ZlcnNpb246IDYqL1xuXG5idWxsZXRBcHAuY29udHJvbGxlcignTW9udGhseVRyYWNrZXJDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgY29sbGVjdGlvbnMsIERhdGVGYWN0b3J5LCBtb250aCwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUuZGF5c0luTW9udGggPSBEYXRlRmFjdG9yeS5tb250aENhbChtb250aCk7XG4gICAgJHNjb3BlLm1vbnRoID0gbW9udGg7XG4gICAgJHNjb3BlLmxvZyA9IGNvbGxlY3Rpb25zLmZpbmQoaSA9PiBpLnR5cGUgPT09IFwibW9udGhcIikgfHwgbmV3IENvbGxlY3Rpb24obW9udGgsICdtb250aCcpO1xuICAgICRzY29wZS5jYWwgPSBjb2xsZWN0aW9ucy5maW5kKGkgPT4gaS50eXBlID09PSBcIm1vbnRoLWNhbFwiKSB8fCBuZXcgQ29sbGVjdGlvbihtb250aCwgJ21vbnRoLWNhbCcpO1xuICAgICRzY29wZS5mdXR1cmUgPSBjb2xsZWN0aW9ucy5maW5kKGkgPT4gaS50eXBlID09PSBcImZ1dHVyZVwiKSB8fCBuZXcgQ29sbGVjdGlvbihtb250aCwgJ2Z1dHVyZScpO1xuXG4gICAgJHNjb3BlLm5leHRNb250aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHN0YXRlLmdvKCRzdGF0ZS5jdXJyZW50LCB7bW9udGhTdHJpbmc6IERhdGVGYWN0b3J5Lm5leHRNb250aCgkc2NvcGUubW9udGgpfSlcbiAgICB9XG4gICAgJHNjb3BlLmxhc3RNb250aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHN0YXRlLmdvKCRzdGF0ZS5jdXJyZW50LCB7bW9udGhTdHJpbmc6IERhdGVGYWN0b3J5Lmxhc3RNb250aCgkc2NvcGUubW9udGgpfSlcbiAgICB9XG59KTtcbiIsImJ1bGxldEFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21vbnRoJywge1xuICAgIHVybDogJy9tb250aC86bW9udGhTdHJpbmcnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvbW9udGhseXRyYWNrZXIvbW9udGhseXRyYWNrZXIudGVtcGxhdGUuaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ01vbnRobHlUcmFja2VyQ3RybCcsXG4gICAgcmVzb2x2ZToge1xuICAgICAgY29sbGVjdGlvbnM6IGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgRGF0ZUZhY3RvcnkpIHtcbiAgICAgICAgY29uc3QgbW9udGhTdHJpbmcgPSAkc3RhdGVQYXJhbXMubW9udGhTdHJpbmcgfHwgRGF0ZUZhY3Rvcnkucm91bmRNb250aChuZXcgRGF0ZSkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgcmV0dXJuIENvbGxlY3Rpb24uZmV0Y2hBbGwoe3RpdGxlOiBtb250aFN0cmluZ30pO1xuICAgICAgfSxcbiAgICAgIG1vbnRoOiBmdW5jdGlvbigkc3RhdGVQYXJhbXMsIERhdGVGYWN0b3J5KSB7XG4gICAgICAgIHJldHVybiAkc3RhdGVQYXJhbXMubW9udGhTdHJpbmcgfHwgRGF0ZUZhY3RvcnkudGhpc01vbnRoO1xuICAgICAgfVxuICAgIH1cbiAgfSlcbn0pXG4iLCJidWxsZXRBcHAuZGlyZWN0aXZlKCdyZWZyZXNoJywgZnVuY3Rpb24oJHN0YXRlLCAkcm9vdFNjb3BlLCBBdXRoRmFjdG9yeSl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcblxuICAgICAgICAgICAgcmVtb3RlREIuZ2V0U2Vzc2lvbigpXG4gICAgICAgICAgICAudGhlbihyZXMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJuYW1lID0gcmVzLnVzZXJDdHgubmFtZTtcbiAgICAgICAgICAgICAgICBpZih1c2VybmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRhcHBseShmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gdXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBBdXRoRmFjdG9yeS5zeW5jREIodXNlcm5hbWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChjb25zb2xlLmVycm9yLmJpbmQoY29uc29sZSkpXG5cbiAgICAgICAgICAgIHNjb3BlLnN5bmNpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHJvb3RTY29wZS5zeW5jO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9naW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZighJHJvb3RTY29wZS51c2VyKSAkc3RhdGUuZ28oJ3NpZ251cCcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG59KTtcbiIsImJ1bGxldEFwcC5kaXJlY3RpdmUoJ3NlYXJjaEJhcicsIGZ1bmN0aW9uKGN1cnJlbnRTdGF0ZXMsICRzdGF0ZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc2VhcmNoL3NlYXJjaC50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdldEJ1bGxldHMgPSBmdW5jdGlvbihzZWFyY2gpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQnVsbGV0LmZldGNoQWxsKHNlYXJjaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzY29wZS5nbyA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5jb2xsZWN0aW9ucy5sZW5ndGgpICRzdGF0ZS5nbygnZ2VuZXJpYycsIHtpZDogaXRlbS5jb2xsZWN0aW9uc1swXX0pO1xuICAgICAgICAgICAgICAgIGVsc2UgJHN0YXRlLmdvKCdpbmRleCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCIvKmpzaGludCBub2RlOnRydWUsIGVzdmVyc2lvbjo2Ki9cbmJ1bGxldEFwcC5mYWN0b3J5KCdBdXRoRmFjdG9yeScsIGZ1bmN0aW9uICgkc3RhdGUsICRyb290U2NvcGUsICR0aW1lb3V0KSB7XG5cbiAgICBjb25zdCBBdXRoID0ge307XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VyREIodXNlciwgdmVyYikge1xuICAgICAgICBsZXQgdXNlcm5hbWUgPSB1c2VyLmVtYWlsLnNwbGl0KCdAJylbMF07XG4gICAgICAgIHJldHVybiByZW1vdGVEQlt2ZXJiXSh1c2VybmFtZSwgdXNlci5wYXNzd29yZClcbiAgICAgICAgICAgIC50aGVuKHJlcyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmVyYiA9PT0gJ3NpZ251cCcgPyBBdXRoLmxvZ2luKHVzZXIpIDogcmVzO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKHJlcyA9PiB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYXBwbHkoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gcmVzLm5hbWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coQXV0aC5zeW5jREIodXNlcm5hbWUpKTtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2luZGV4JylcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZXJyID0+IGNvbnNvbGUuZXJyb3IoXCJDb3VsZG4ndCBzaWduaW46IFwiLCBlcnIpKTtcbiAgICB9XG5cbiAgICBBdXRoLnN5bmNEQiA9IGZ1bmN0aW9uKHVzZXJuYW1lKSB7XG4gICAgICAgIHJlbW90ZURCID0gbmV3IFBvdWNoREIocmVtb3RlREJBZGRyZXNzICsgdXNlckRCVXJsKHVzZXJuYW1lKSwge1xuICAgICAgICAgICAgc2tpcFNldHVwOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGIuc3luYyhyZW1vdGVEQiwge1xuICAgICAgICAgICAgICAgIGxpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgcmV0cnk6IHRydWVcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ2FjdGl2ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc3luYyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ3BhdXNlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zeW5jID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIEF1dGgubG9naW4gPSBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gY3JlYXRlVXNlckRCKHVzZXIsICdsb2dpbicpO1xuICAgIH1cblxuICAgIEF1dGguc2lnbnVwID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVVzZXJEQih1c2VyLCAnc2lnbnVwJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEF1dGg7XG59KTtcbiIsImJ1bGxldEFwcC5jb250cm9sbGVyKCdzaWdudXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBBdXRoRmFjdG9yeSl7XG4gICAgYW5ndWxhci5leHRlbmQoJHNjb3BlLCBBdXRoRmFjdG9yeSk7XG59KTtcbiIsImJ1bGxldEFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdzaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcbiIsIi8vIFRoaXMgZmlsZSBpcyByZXF1aXJlZCBieSB0aGUgaW5kZXguaHRtbCBmaWxlIGFuZCB3aWxsXG4vLyBiZSBleGVjdXRlZCBpbiB0aGUgcmVuZGVyZXIgcHJvY2VzcyBmb3IgdGhhdCB3aW5kb3cuXG4vLyBBbGwgb2YgdGhlIE5vZGUuanMgQVBJcyBhcmUgYXZhaWxhYmxlIGluIHRoaXMgcHJvY2Vzcy5cblxuLy8gbGV0IGRiID0gcmVxdWlyZSgnLi9tb2RlbHMnKSgnYnVsbGV0Jywge2F1dG9fY29tcGFjdGlvbjogdHJ1ZX0pO1xuLy8gbGV0IENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL21vZGVscy9jb2xsZWN0aW9uJykoZGIpO1xuLy8gbGV0IEJ1bGxldCA9IHJlcXVpcmUoJy4vbW9kZWxzL2J1bGxldCcpKGRiKTtcbmNvbnN0IHJlbW90ZURCQWRkcmVzcyA9ICdodHRwOi8vNTAuMTEyLjIxOC4zNzo1OTg0Lyc7XG5cbmNvbnN0IHR5cGVEaWN0ID0ge1xuICAgIFwiVGFza1wiOiBcImZhLWNpcmNsZS1vXCIsXG4gICAgXCJFdmVudFwiOiBcImZhLWZpcnN0LW9yZGVyXCIsXG4gICAgXCJOb3RlXCI6IFwiZmEtbG9uZy1hcnJvdy1yaWdodFwiLFxuICAgIFwiaW5jb21wbGV0ZVwiOiBcImZhLWNpcmNsZS1vXCIsXG4gICAgXCJjb21wbGV0ZVwiOiBcImZhLWNoZWNrLWNpcmNsZS1vXCIsIC8vZmEtY2hlY2stc3F1YXJlLW9cIlxuICAgIFwibWlncmF0ZWRcIjogXCJmYS1zaWduLW91dFwiLFxuICAgIFwic2NoZWR1bGVkXCI6IFwiZmEtYW5nbGUtZG91YmxlLWxlZnRcIixcbiAgICBcInN0cnVja1wiOiBcInN0cmlrZXRocm91Z2hcIlxufTtcblxuZnVuY3Rpb24gdXNlckRCVXJsKHVzZXJuYW1lKXtcbiAgICByZXR1cm4gYHVzZXJkYi0ke3VzZXJuYW1lLnRvSGV4KCl9YDtcbn1cblxuU3RyaW5nLnByb3RvdHlwZS50b0hleCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5zcGxpdCgnJykubWFwKGMgPT4gYy5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KSkuam9pbignJyk7XG59O1xuXG5sZXQgcmVtb3RlREIgPSBuZXcgUG91Y2hEQihyZW1vdGVEQkFkZHJlc3MpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
