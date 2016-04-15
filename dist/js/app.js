
NavbarController.$inject = ["ModuleStates", "$state", "$http", "$window"];
GridController.$inject = ["$timeout", "$log", "$scope", "$templateRequest", "$interpolate"];
SystemController.$inject = ["API"];
ModuleStatesProvider.$inject = ["$stateProvider"];
APIFactory.$inject = ["$log", "$http", "$q", "APIBaseLocation"];
AccountsController.$inject = ["System", "$log", "$filter", "$http"];
AccountsConfig.$inject = ["ModuleStatesProvider"];
LadderController.$inject = ["$log", "$http", "$filter", "$scope", "$stateParams"];
LadderConfig.$inject = ["ModuleStatesProvider"];
RulesConfig.$inject = ["ModuleStatesProvider"];
AppConfig.$inject = ["$urlRouterProvider", "$logProvider"];function NavbarController(ModuleStates, $state, $http, $window) {
    'use strict';
    var Navbar = this;
    
    Navbar.isActive = function(module) {
        return $state.includes(module.activeState || module.name);
    };
    
    if($window.localStorage) {
        Navbar.accountName = $window.localStorage.getItem('registeredAccount');
        if(Navbar.accountName) {
            Navbar.registered = true;
        }
    }
    
    Navbar.undoStorage = function() {
        if($window.localStorage) {
            $window.localStorage.setItem('registeredAccount', undefined);
            Navbar.accountName = undefined;
            Navbar.registered = false;
        }
    };
    
    Navbar.registerAccount = function(accountName) {
        $http.get('http://ssf.poeladder.com/signup/' + accountName).then(function() {
            Navbar.registered = true;
            if($window.localStorage) {
                $window.localStorage.setItem('registeredAccount', accountName);
            }
        });
    };
    
    Navbar.ModuleStates = ModuleStates;
}

angular.module('poe.navbar', ['system', 'ui.router'])
    .controller('NavbarController', NavbarController)
    .component('navbar', {
        controller: 'NavbarController as Navbar',
        templateUrl: 'components/navbar/navbar.html'
    });
function GridController($timeout, $log, $scope, $templateRequest, $interpolate) {
    'use strict';
    var Grid = this;
    $scope.Parent = $scope.$parent;

    function getColumns(data) {
        var columnDefinition = [],
            columnKeys = [],
            overriddenCells = [];
        
        if(Array.isArray(data) && Grid.autoColumn !== false) {
            data.forEach(function(row) {
                Object.keys(row).forEach(function(column) {
                    if(row.hasOwnProperty(column) && columnKeys.indexOf(column) === -1 && column !== '$$hashKey') {
                        var newColumn = {};
                        newColumn[Grid.columnKey] = column;
                        newColumn[Grid.columnName] = column;
                        
                        columnDefinition.push(newColumn);
                        columnKeys.push(column);
                    }
                });
            });
        }
        
        if(Grid.state && Array.isArray(Grid.state.gridColumns)) {
            Grid.state.gridColumns.forEach(function(column) {
                if(column[Grid.columnKey] === '$$hashKey') {
                    return;
                }
                
                if(column.overrideTemplate) {
                    $templateRequest(column.overrideTemplate).then(function(response) {
                        var template = $interpolate(response);
                        
                        column.override = function(cell, column, row) {
                            var rowIndexPage = Grid.data.indexOf(row),
                                colIndex = columnDefinition.length - 1,
                                rowIndex = (Grid.state.page - 1) * Grid.state.perPage + rowIndexPage,
                                cellScope,
                                element;

                            if(overriddenCells[column[Grid.columnKey]] && overriddenCells[column[Grid.columnKey]][rowIndexPage]) {
                                return overriddenCells[column[Grid.columnKey]][rowIndexPage];
                            }
                            
                            cellScope = $scope.$new();
                            cellScope.$index = rowIndex + cell;
                            
                            angular.extend(cellScope, {
                                $colIndex: colIndex,
                                $rowIndex: rowIndex,
                                $index: rowIndex,
                                cell: cell,
                                column: column,
                                row: row
                            });
                            
                            element = template(cellScope);

                            if(!overriddenCells[column[Grid.columnKey]]) {
                                overriddenCells[column[Grid.columnKey]] = [];
                            }
                            
                            overriddenCells[column[Grid.columnKey]][rowIndexPage] = element;
                            
                            return element;
                        };
                    });
                }
                
                if(columnKeys.indexOf(column[Grid.columnKey]) === -1) {                   
                    columnDefinition.push(column);
                    columnKeys.push(column[Grid.columnKey]);
                } else {
                    columnDefinition.forEach(function(definedColumn) {
                        if(definedColumn[Grid.columnKey] === column[Grid.columnKey]) {
                            Object.keys(column).forEach(function(property) {
                                definedColumn[property] = column[property];
                            });
                        }
                    });
                }
            });
        }
        
        return columnDefinition;
    }

    function activate() {
        var perPage = Grid.pagination !== true && Grid.pagination !== undefined ? Grid.pagination : 20;
        Grid.state = Grid.state || {
            sort: undefined,
            sortDirection: undefined,
            page: 1,
            perPage: Grid.pagination !== false ? perPage : 0,
            gridColumns: [],
            refresh: false
        };

        Grid.columnKey = Grid.columnKey || 'name';
        Grid.columnName = Grid.columnName || 'header';
        
        Grid.api = {
            refresh: function() {
                $log.log('refresh');
                Grid.getData({
                    state: Grid.state
                });
            }
        };
    }
    
    $timeout(function() {
        activate();
    });

    Grid.isSortable = function(column) {
        return column.sortable === undefined ? true : column.sortable;
    };
    
    Grid.getValue = function(row, column, rowIndex) {
        var cell;
        if(column.override) {
            cell = column.override(row[column[Grid.columnKey]], column, row, rowIndex);
        } else {
            cell = row[column[Grid.columnKey]];
        }
        
        return cell;
    };
    
    Grid.sort = function(column) {
        if(column.sortable !== undefined && !column.sortable) {
            return;
        }
        
        if(Grid.state.sort === column[Grid.columnKey]) {
            if(Grid.state.sortDirection === 'DESC') {
                Grid.state.sortDirection = 'ASC';
            } else {
                Grid.state.sort = undefined;
                Grid.state.sortDirection = undefined;
            }
        } else {
            Grid.state.sort = column[Grid.columnKey];
            Grid.state.sortDirection = 'DESC';
        }
    };
        
    $scope.$watch('Grid.state', function() {
        if(Grid.state !== undefined) {
            Grid.getData({
                state: Grid.state
            });
        }
    }, true);
    
    $scope.$watch('Grid.data', function() {
        Grid.data = Grid.data || [];
        Grid.columnDefinition = getColumns(Grid.data);
        Grid.rows = Grid.data;
    }, true);
}

angular.module('mvl.grid', ['ui.bootstrap', 'ngSanitize'])
    .controller('GridController', GridController)
    .component('grid', {
        controller: 'GridController as Grid',
        templateUrl: 'components/grid/grid.html',
        bindings: {
            data: '<',
            state: '<',
            getData: '&',
            columnKey: '@',
            columnName: '@',
            autoColumn: '<',
            pagination: '=?',
            getClassesForRow: '=',
            api: '=?'
        }
    })
    .directive('cellValue', ["$compile", function($compile) {
        'use strict';
        return function (scope, element, attributes) {
            scope.$watch(function(scope) {
                return scope.$eval(attributes.cellValue);
            }, function(value) {
                element.html(value);
    
                $compile(element.contents())(scope);
            });
        };
    }]);

/*global console */
function ModuleStatesProvider($stateProvider) {
    'use strict';
    var modules = [],
        moduleStates = [];

    this.registerModule = function(name, states) {
        if(modules[name] !== undefined) {
            console.warn('Module already registered');
            return;
        }
        
        modules.push(name);
        
        states.forEach(function(state) {
            if(moduleStates.indexOf(state) !== -1) {
                console.warn('State already registered');
                return;
            }

            $stateProvider.state(state.name, state.state);
            moduleStates.push(state);
        });
    };

    this.$get = function() {
        return moduleStates;
    };
}

function SystemController(API) {
    'use strict';
    var System = this;
        
    System.showingSide = false;
    System.showingMenu = true;
    
    System.getAPI = function getAPI(name) {
        return API(name);
    };
}

function APIFactory($log, $http, $q, APIBaseLocation) {
    'use strict';
    var API = function API(name) {
        var baseURL = APIBaseLocation + name + '/',
            caches = [];
        
        this.name = name.charAt(0).toUpperCase() + name.slice(1);
        
        this.clearCache = function() {
            caches = [];
        };
        
        this.readAll = function(filter) {
            var request = $q.defer(),
                params = filter || {};
            
            if(caches && caches[JSON.stringify(params)] && caches[JSON.stringify(params)].timestamp > Date.now() - 1000 * 60 * 5) {
                $log.debug('up to date cache, using instead');
                
                request.resolve(caches[JSON.stringify(params)].rows);
            } else {
                $log.debug('getting fresh data');
                $http({
                    method: 'GET',
                    url: baseURL,
                    params: params
                }).then(function(response) {
                    request.resolve(response.data);
                    
                    caches[JSON.stringify(params)] = {
                        timestamp: Date.now(),
                        rows: response.data
                    };
                });
            }
            
            return request.promise;
        };
        
        this.create = function(object) {
            return $http({
                method: 'POST',
                url: baseURL,
                data: object
            });
        };
        
        this.read = function(id) {
            return $http({
                method: 'GET',
                url: baseURL + id
            });
        };
        
        this.update = function(object) {
            return $http({
                method: 'PUT',
                url: baseURL + object.id,
                data: object
            });
        };
        
        this.delete = function(object) {
            return $http({
                method: 'DELETE',
                url: baseURL + object.id,
                data: object
            });            
        };
        
        this.getTableResource = function(task) {
            return (function(task) {
                var resource = this,
                    order,
                    orderBy,
                    paginationCache = {};
                
                this.start = 0;
                this.limit = 25;
                
                Object.defineProperty(this, 'order', {
                    get: function() {
                        return order;
                    },
                    set: function(newOrder) {
                        if(newOrder === order) {
                            return;
                        }
                        
                        $log.debug('new order, clearing cache');
                        order = newOrder;
                        paginationCache = {};
                    }
                });
                
                Object.defineProperty(this, 'orderBy', {
                    get: function() {
                        return orderBy;
                    },
                    set: function(newOrderBy) {
                        if(newOrderBy === orderBy) {
                            return;
                        }
                        
                        $log.debug('new orderby, clearing cache');
                        orderBy = newOrderBy;
                        paginationCache = {};
                    }
                });
                
                this.get = function() {
                    $log.debug(paginationCache);
                    var deferred = $q.defer();
                    
                    if(paginationCache[resource.limit] !== undefined && paginationCache[resource.limit][resource.start] !== undefined) {
                        $log.debug(resource.limit, resource.start, 'cached, loading');
                        deferred.resolve(paginationCache[resource.limit][resource.start]);
                    } else {
                        $log.debug(resource.limit, resource.start, 'not cached, loading');
                        API.doTask(task, {
                            start: resource.start,
                            limit: resource.limit,
                            sort: resource.orderBy,
                            dir: resource.order
                        }).then(function(data) {
                            paginationCache[resource.limit] = paginationCache[resource.limit] || {};
                            paginationCache[resource.limit][resource.start] = data;
                            deferred.resolve(data);
                        }, function(reason) {
                            deferred.reject(reason);
                        });
                    }
                    
                    return deferred.promise;
                };
                
                return this;
            }(task));
        };
    },
    APIs = {};

        
    return function(name) {
        if(APIs[name] === undefined) {
            APIs[name] = new API(name);
        }
        return APIs[name];
    };
}

angular.module('system', ['ui.router'])
    .constant('APIBaseLocation', 'API/')
    .service('System', SystemController)
    .provider('ModuleStates', ModuleStatesProvider)
    .factory('API', APIFactory);
function StatusLightController() {
    var StatusLight = this;
    
    var statusToColor = {
        unknown: '#eee',
        ok: '#5cb85c',
        notice: '#feff78',
        warning: '#f0ad4e',
        danger: '#d9534f'
    };
    
    StatusLight.style = {
        'background-color': statusToColor[StatusLight.status] || 'transparent'
    };
}

angular.module('mvl.statuslight', [])
.controller('StatusLightController', StatusLightController)
.component('statusLight', {
        controller: 'StatusLightController as StatusLight',
        templateUrl: 'components/status-light/status-light.html',
        bindings: {
            'status': '<'
        }
    });
function AccountsConfig(ModuleStatesProvider) {
    'use strict';
    ModuleStatesProvider.registerModule('Accounts', [
        {
            showInMenu: true,
            menuName: 'Accounts',
            icon: 'fa fa-users fa-fw',
            name: 'accounts',
            priority: 1,
            state: {
                url: '/accounts',
                views: {
                    '@': {
                        templateUrl: 'modules/accounts/accounts.html',
                        controller: 'AccountsController as Accounts'
                    }
                }
            }
        }
    ]);
}

function AccountsController(System, $log, $filter, $http) {
    'use strict';
    var Accounts = this;
    var allAccounts = [];
    var gridState;
    $log.debug(Accounts);
    
    function doFilter() {
        gridState.total = allAccounts.length;
        Accounts.list = allAccounts.slice((gridState.page - 1) * gridState.perPage, gridState.page * gridState.perPage);
    }
    
    $http.get('accounts.php').then(function(response) {
        allAccounts = response.data;
        doFilter();
    });
    
    var columns = [
        {
            header: 'Accounts',
            name: 'name',
            override: function (cell, column, row) {
                // jshint unused:false
                
                return '<a href="' + row.account_url + '" target="_blank">' + cell + '</a>';
            }
        },
        {
            name: 'account_url',
            hidden: true
        }
    ];
    
    Accounts.getAccounts = function(state) {
        var sort = state.sort;
        var direction = state.sortDirection || 'DESC';
        
        gridState = state;
        
        allAccounts = $filter('orderBy')(allAccounts, sort, direction === 'DESC');
        
        doFilter();
        state.gridColumns = columns;
    };
}

angular.module('poe.accounts', ['system'])
    .controller('AccountsController', AccountsController)
    .config(AccountsConfig);
function LadderConfig(ModuleStatesProvider) {
    'use strict';
    ModuleStatesProvider.registerModule('Ladder', [
        {
            showInMenu: true,
            menuName: 'Ladder',
            icon: 'fa fa-bar-chart fa-fw',
            name: 'ladder',
            priority: 0,
            state: {
                url: '/:filter',
                views: {
                    '@': {
                        templateUrl: 'modules/ladder/ladder.html',
                        controller: 'LadderController as Ladder'
                    }
                }
            }
        }
    ]);
}

function LadderController($log, $http, $filter, $scope, $stateParams) {
    var Ladder = this;
    var allCharacters = [];
    var gridState;
    $log.debug($stateParams.filter);
    
    Ladder.filter = $stateParams.filter;
    
    function doFilter() {
        if(!allCharacters.length || !gridState) {
            return;
        }
        
        var filteredCharacters = allCharacters;
        
        if(Ladder.filter) {
            filteredCharacters = $filter('filter')(allCharacters, Ladder.filter);
        }
        
        gridState.total = filteredCharacters.length;
        
        Ladder.characters = filteredCharacters.slice((gridState.page - 1) * gridState.perPage, gridState.page * gridState.perPage);
    }
    
    $http.get('scraper.php').then(function(response) {
        allCharacters = response.data;
        doFilter();
    });
    
    $http.get('meta.php').then(function(response) {
        Ladder.status = response.data.status + ' ';
        Ladder.lastUpdateTime = response.data.last_ladder_update + '000';
        Ladder.lastProcessTime = response.data.last_process_time;
    });
    
    var columns = [
        {
            header: 'Rank',
            name: 'rank'
        },
        {
            header: 'Class',
            name: 'class'
        },
        {
            header: 'Level',
            name: 'level'
        },
        {
            header: 'Experience',
            name: 'experience',
            override: function(cell) {
                return $filter('number')(cell);
            }
        },
        {
            header: 'Status',
            name: 'status',
            override: function(cell, column, row, rowIndex) {
                // jshint unused:false
                if(cell === 'Dead') {
                    return cell;
                }
                return '<status-light status="\'' + (cell === 'offline' ? 'danger' : 'ok') + '\'"></status-light>';
            }
        },
        {
            header: 'Experience gained last hour (Approx.)',
            name: 'experience_last_hour',
            override: function(cell) {
                return $filter('number')(cell);
            }
        },
        {
            header: 'Name',
            name: 'name',
            override: function (cell, column, row) {
                // jshint unused:false
                
                return '<a href="' + row.account_url + '" target="_blank">' + cell + '</a>';
            }
        },
        {
            name: 'account_url',
            hidden: true
        }
    ];
    
    $scope.$watch('Ladder.filter', function(newValue) {
        if(newValue === undefined) {
            return;
        }
        doFilter();
    });
    
    Ladder.getCharacters = function(state) {
        var sort = state.sort || 'rank';
        var direction = state.sortDirection || 'ASC';
        
        gridState = state;
        
        if(sort === 'experience' || sort === 'level') {
            sort = ['level', 'experience'];
        }
        
        allCharacters = $filter('orderBy')(allCharacters, sort, direction === 'DESC');
        
        doFilter();
        state.gridColumns = columns;
    };
    
    Ladder.getClassesForRow = function(row) {
        if(row.status === 'Dead') {
            return 'dead';
        }
    };
}

angular.module('poe.ladder', ['system', 'ui.bootstrap', 'mvl.grid', 'mvl.statuslight'])
    .controller('LadderController', LadderController)
    .config(LadderConfig)
    .filter('secondsToDateTime', function() {
        return function(seconds) {
            if(seconds === undefined) {
                return seconds;
            }
            var d = new Date(0,0,0,0,0,0,0);
            d.setSeconds(seconds);
            return d.getTime();
        };
    });
function RulesConfig(ModuleStatesProvider) {
    'use strict';
    ModuleStatesProvider.registerModule('Rules', [
        {
            showInMenu: true,
            menuName: 'Rules',
            icon: 'fa fa-list-ol fa-fw',
            name: 'rules',
            priority: 2,
            state: {
                url: '/rules',
                views: {
                    '@': {
                        templateUrl: 'modules/rules/rules.html'
                    }
                }
            }
        }
    ]);
}

angular.module('poe.rules', [])
    .config(RulesConfig);
function AppConfig($urlRouterProvider, $logProvider) {
    'use strict';
    $urlRouterProvider.otherwise('/');
    $logProvider.debugEnabled(true);
}

angular.module('poeladder', [
        'ui.router',
        'templates',
        'system',
        'poe.navbar',
        'poe.accounts',
        'poe.rules',
        'poe.ladder'
    ])
    .config(AppConfig);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbXBvbmVudHMvbmF2YmFyL25hdmJhci5qcyIsImNvbXBvbmVudHMvZ3JpZC9ncmlkLmpzIiwiY29tcG9uZW50cy9zeXN0ZW0vc3lzdGVtLmpzIiwiY29tcG9uZW50cy9zdGF0dXMtbGlnaHQvc3RhdHVzLWxpZ2h0LmpzIiwibW9kdWxlcy9hY2NvdW50cy9hY2NvdW50cy5qcyIsIm1vZHVsZXMvbGFkZGVyL2xhZGRlci5qcyIsIm1vZHVsZXMvcnVsZXMvcnVsZXMuanMiLCJhcHAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7MkRBQUEsU0FBQSxpQkFBQSxjQUFBLFFBQUEsT0FBQSxTQUFBO0lBQ0E7SUFDQSxJQUFBLFNBQUE7O0lBRUEsT0FBQSxXQUFBLFNBQUEsUUFBQTtRQUNBLE9BQUEsT0FBQSxTQUFBLE9BQUEsZUFBQSxPQUFBOzs7SUFHQSxHQUFBLFFBQUEsY0FBQTtRQUNBLE9BQUEsY0FBQSxRQUFBLGFBQUEsUUFBQTtRQUNBLEdBQUEsT0FBQSxhQUFBO1lBQ0EsT0FBQSxhQUFBOzs7O0lBSUEsT0FBQSxjQUFBLFdBQUE7UUFDQSxHQUFBLFFBQUEsY0FBQTtZQUNBLFFBQUEsYUFBQSxRQUFBLHFCQUFBO1lBQ0EsT0FBQSxjQUFBO1lBQ0EsT0FBQSxhQUFBOzs7O0lBSUEsT0FBQSxrQkFBQSxTQUFBLGFBQUE7UUFDQSxNQUFBLElBQUEscUNBQUEsYUFBQSxLQUFBLFdBQUE7WUFDQSxPQUFBLGFBQUE7WUFDQSxHQUFBLFFBQUEsY0FBQTtnQkFDQSxRQUFBLGFBQUEsUUFBQSxxQkFBQTs7Ozs7SUFLQSxPQUFBLGVBQUE7OztBQUdBLFFBQUEsT0FBQSxjQUFBLENBQUEsVUFBQTtLQUNBLFdBQUEsb0JBQUE7S0FDQSxVQUFBLFVBQUE7UUFDQSxZQUFBO1FBQ0EsYUFBQTs7QUN2Q0EsU0FBQSxlQUFBLFVBQUEsTUFBQSxRQUFBLGtCQUFBLGNBQUE7SUFDQTtJQUNBLElBQUEsT0FBQTtJQUNBLE9BQUEsU0FBQSxPQUFBOztJQUVB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UUFHQSxPQUFBOzs7SUFHQSxLQUFBLE9BQUEsU0FBQSxRQUFBO1FBQ0EsR0FBQSxPQUFBLGFBQUEsYUFBQSxDQUFBLE9BQUEsVUFBQTtZQUNBOzs7UUFHQSxHQUFBLEtBQUEsTUFBQSxTQUFBLE9BQUEsS0FBQSxZQUFBO1lBQ0EsR0FBQSxLQUFBLE1BQUEsa0JBQUEsUUFBQTtnQkFDQSxLQUFBLE1BQUEsZ0JBQUE7bUJBQ0E7Z0JBQ0EsS0FBQSxNQUFBLE9BQUE7Z0JBQ0EsS0FBQSxNQUFBLGdCQUFBOztlQUVBO1lBQ0EsS0FBQSxNQUFBLE9BQUEsT0FBQSxLQUFBO1lBQ0EsS0FBQSxNQUFBLGdCQUFBOzs7O0lBSUEsT0FBQSxPQUFBLGNBQUEsV0FBQTtRQUNBLEdBQUEsS0FBQSxVQUFBLFdBQUE7WUFDQSxLQUFBLFFBQUE7Z0JBQ0EsT0FBQSxLQUFBOzs7T0FHQTs7SUFFQSxPQUFBLE9BQUEsYUFBQSxXQUFBO1FBQ0EsS0FBQSxPQUFBLEtBQUEsUUFBQTtRQUNBLEtBQUEsbUJBQUEsV0FBQSxLQUFBO1FBQ0EsS0FBQSxPQUFBLEtBQUE7T0FDQTs7O0FBR0EsUUFBQSxPQUFBLFlBQUEsQ0FBQSxnQkFBQTtLQUNBLFdBQUEsa0JBQUE7S0FDQSxVQUFBLFFBQUE7UUFDQSxZQUFBO1FBQ0EsYUFBQTtRQUNBLFVBQUE7WUFDQSxNQUFBO1lBQ0EsT0FBQTtZQUNBLFNBQUE7WUFDQSxXQUFBO1lBQ0EsWUFBQTtZQUNBLFlBQUE7WUFDQSxZQUFBO1lBQ0Esa0JBQUE7WUFDQSxLQUFBOzs7S0FHQSxVQUFBLDBCQUFBLFNBQUEsVUFBQTtRQUNBO1FBQ0EsT0FBQSxVQUFBLE9BQUEsU0FBQSxZQUFBO1lBQ0EsTUFBQSxPQUFBLFNBQUEsT0FBQTtnQkFDQSxPQUFBLE1BQUEsTUFBQSxXQUFBO2VBQ0EsU0FBQSxPQUFBO2dCQUNBLFFBQUEsS0FBQTs7Z0JBRUEsU0FBQSxRQUFBLFlBQUE7Ozs7OztBQzdMQSxTQUFBLHFCQUFBLGdCQUFBO0lBQ0E7SUFDQSxJQUFBLFVBQUE7UUFDQSxlQUFBOztJQUVBLEtBQUEsaUJBQUEsU0FBQSxNQUFBLFFBQUE7UUFDQSxHQUFBLFFBQUEsVUFBQSxXQUFBO1lBQ0EsUUFBQSxLQUFBO1lBQ0E7OztRQUdBLFFBQUEsS0FBQTs7UUFFQSxPQUFBLFFBQUEsU0FBQSxPQUFBO1lBQ0EsR0FBQSxhQUFBLFFBQUEsV0FBQSxDQUFBLEdBQUE7Z0JBQ0EsUUFBQSxLQUFBO2dCQUNBOzs7WUFHQSxlQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUE7WUFDQSxhQUFBLEtBQUE7Ozs7SUFJQSxLQUFBLE9BQUEsV0FBQTtRQUNBLE9BQUE7Ozs7QUFJQSxTQUFBLGlCQUFBLEtBQUE7SUFDQTtJQUNBLElBQUEsU0FBQTs7SUFFQSxPQUFBLGNBQUE7SUFDQSxPQUFBLGNBQUE7O0lBRUEsT0FBQSxTQUFBLFNBQUEsT0FBQSxNQUFBO1FBQ0EsT0FBQSxJQUFBOzs7O0FBSUEsU0FBQSxXQUFBLE1BQUEsT0FBQSxJQUFBLGlCQUFBO0lBQ0E7SUFDQSxJQUFBLE1BQUEsU0FBQSxJQUFBLE1BQUE7UUFDQSxJQUFBLFVBQUEsa0JBQUEsT0FBQTtZQUNBLFNBQUE7O1FBRUEsS0FBQSxPQUFBLEtBQUEsT0FBQSxHQUFBLGdCQUFBLEtBQUEsTUFBQTs7UUFFQSxLQUFBLGFBQUEsV0FBQTtZQUNBLFNBQUE7OztRQUdBLEtBQUEsVUFBQSxTQUFBLFFBQUE7WUFDQSxJQUFBLFVBQUEsR0FBQTtnQkFDQSxTQUFBLFVBQUE7O1lBRUEsR0FBQSxVQUFBLE9BQUEsS0FBQSxVQUFBLFlBQUEsT0FBQSxLQUFBLFVBQUEsU0FBQSxZQUFBLEtBQUEsUUFBQSxPQUFBLEtBQUEsR0FBQTtnQkFDQSxLQUFBLE1BQUE7O2dCQUVBLFFBQUEsUUFBQSxPQUFBLEtBQUEsVUFBQSxTQUFBO21CQUNBO2dCQUNBLEtBQUEsTUFBQTtnQkFDQSxNQUFBO29CQUNBLFFBQUE7b0JBQ0EsS0FBQTtvQkFDQSxRQUFBO21CQUNBLEtBQUEsU0FBQSxVQUFBO29CQUNBLFFBQUEsUUFBQSxTQUFBOztvQkFFQSxPQUFBLEtBQUEsVUFBQSxXQUFBO3dCQUNBLFdBQUEsS0FBQTt3QkFDQSxNQUFBLFNBQUE7Ozs7O1lBS0EsT0FBQSxRQUFBOzs7UUFHQSxLQUFBLFNBQUEsU0FBQSxRQUFBO1lBQ0EsT0FBQSxNQUFBO2dCQUNBLFFBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxNQUFBOzs7O1FBSUEsS0FBQSxPQUFBLFNBQUEsSUFBQTtZQUNBLE9BQUEsTUFBQTtnQkFDQSxRQUFBO2dCQUNBLEtBQUEsVUFBQTs7OztRQUlBLEtBQUEsU0FBQSxTQUFBLFFBQUE7WUFDQSxPQUFBLE1BQUE7Z0JBQ0EsUUFBQTtnQkFDQSxLQUFBLFVBQUEsT0FBQTtnQkFDQSxNQUFBOzs7O1FBSUEsS0FBQSxTQUFBLFNBQUEsUUFBQTtZQUNBLE9BQUEsTUFBQTtnQkFDQSxRQUFBO2dCQUNBLEtBQUEsVUFBQSxPQUFBO2dCQUNBLE1BQUE7Ozs7UUFJQSxLQUFBLG1CQUFBLFNBQUEsTUFBQTtZQUNBLFFBQUEsU0FBQSxNQUFBO2dCQUNBLElBQUEsV0FBQTtvQkFDQTtvQkFDQTtvQkFDQSxrQkFBQTs7Z0JBRUEsS0FBQSxRQUFBO2dCQUNBLEtBQUEsUUFBQTs7Z0JBRUEsT0FBQSxlQUFBLE1BQUEsU0FBQTtvQkFDQSxLQUFBLFdBQUE7d0JBQ0EsT0FBQTs7b0JBRUEsS0FBQSxTQUFBLFVBQUE7d0JBQ0EsR0FBQSxhQUFBLE9BQUE7NEJBQ0E7Ozt3QkFHQSxLQUFBLE1BQUE7d0JBQ0EsUUFBQTt3QkFDQSxrQkFBQTs7OztnQkFJQSxPQUFBLGVBQUEsTUFBQSxXQUFBO29CQUNBLEtBQUEsV0FBQTt3QkFDQSxPQUFBOztvQkFFQSxLQUFBLFNBQUEsWUFBQTt3QkFDQSxHQUFBLGVBQUEsU0FBQTs0QkFDQTs7O3dCQUdBLEtBQUEsTUFBQTt3QkFDQSxVQUFBO3dCQUNBLGtCQUFBOzs7O2dCQUlBLEtBQUEsTUFBQSxXQUFBO29CQUNBLEtBQUEsTUFBQTtvQkFDQSxJQUFBLFdBQUEsR0FBQTs7b0JBRUEsR0FBQSxnQkFBQSxTQUFBLFdBQUEsYUFBQSxnQkFBQSxTQUFBLE9BQUEsU0FBQSxXQUFBLFdBQUE7d0JBQ0EsS0FBQSxNQUFBLFNBQUEsT0FBQSxTQUFBLE9BQUE7d0JBQ0EsU0FBQSxRQUFBLGdCQUFBLFNBQUEsT0FBQSxTQUFBOzJCQUNBO3dCQUNBLEtBQUEsTUFBQSxTQUFBLE9BQUEsU0FBQSxPQUFBO3dCQUNBLElBQUEsT0FBQSxNQUFBOzRCQUNBLE9BQUEsU0FBQTs0QkFDQSxPQUFBLFNBQUE7NEJBQ0EsTUFBQSxTQUFBOzRCQUNBLEtBQUEsU0FBQTsyQkFDQSxLQUFBLFNBQUEsTUFBQTs0QkFDQSxnQkFBQSxTQUFBLFNBQUEsZ0JBQUEsU0FBQSxVQUFBOzRCQUNBLGdCQUFBLFNBQUEsT0FBQSxTQUFBLFNBQUE7NEJBQ0EsU0FBQSxRQUFBOzJCQUNBLFNBQUEsUUFBQTs0QkFDQSxTQUFBLE9BQUE7Ozs7b0JBSUEsT0FBQSxTQUFBOzs7Z0JBR0EsT0FBQTtjQUNBOzs7SUFHQSxPQUFBOzs7SUFHQSxPQUFBLFNBQUEsTUFBQTtRQUNBLEdBQUEsS0FBQSxVQUFBLFdBQUE7WUFDQSxLQUFBLFFBQUEsSUFBQSxJQUFBOztRQUVBLE9BQUEsS0FBQTs7OztBQUlBLFFBQUEsT0FBQSxVQUFBLENBQUE7S0FDQSxTQUFBLG1CQUFBO0tBQ0EsUUFBQSxVQUFBO0tBQ0EsU0FBQSxnQkFBQTtLQUNBLFFBQUEsT0FBQTtBQ3JNQSxTQUFBLHdCQUFBO0lBQ0EsSUFBQSxjQUFBOztJQUVBLElBQUEsZ0JBQUE7UUFDQSxTQUFBO1FBQ0EsSUFBQTtRQUNBLFFBQUE7UUFDQSxTQUFBO1FBQ0EsUUFBQTs7O0lBR0EsWUFBQSxRQUFBO1FBQ0Esb0JBQUEsY0FBQSxZQUFBLFdBQUE7Ozs7QUFJQSxRQUFBLE9BQUEsbUJBQUE7Q0FDQSxXQUFBLHlCQUFBO0NBQ0EsVUFBQSxlQUFBO1FBQ0EsWUFBQTtRQUNBLGFBQUE7UUFDQSxVQUFBO1lBQ0EsVUFBQTs7O0FDdEJBLFNBQUEsZUFBQSxzQkFBQTtJQUNBO0lBQ0EscUJBQUEsZUFBQSxZQUFBO1FBQ0E7WUFDQSxZQUFBO1lBQ0EsVUFBQTtZQUNBLE1BQUE7WUFDQSxNQUFBO1lBQ0EsVUFBQTtZQUNBLE9BQUE7Z0JBQ0EsS0FBQTtnQkFDQSxPQUFBO29CQUNBLEtBQUE7d0JBQ0EsYUFBQTt3QkFDQSxZQUFBOzs7Ozs7OztBQVFBLFNBQUEsbUJBQUEsUUFBQSxNQUFBLFNBQUEsT0FBQTtJQUNBO0lBQ0EsSUFBQSxXQUFBO0lBQ0EsSUFBQSxjQUFBO0lBQ0EsSUFBQTtJQUNBLEtBQUEsTUFBQTs7SUFFQSxTQUFBLFdBQUE7UUFDQSxVQUFBLFFBQUEsWUFBQTtRQUNBLFNBQUEsT0FBQSxZQUFBLE1BQUEsQ0FBQSxVQUFBLE9BQUEsS0FBQSxVQUFBLFNBQUEsVUFBQSxPQUFBLFVBQUE7OztJQUdBLE1BQUEsSUFBQSxnQkFBQSxLQUFBLFNBQUEsVUFBQTtRQUNBLGNBQUEsU0FBQTtRQUNBOzs7SUFHQSxJQUFBLFVBQUE7UUFDQTtZQUNBLFFBQUE7WUFDQSxNQUFBO1lBQ0EsVUFBQSxVQUFBLE1BQUEsUUFBQSxLQUFBOzs7Z0JBR0EsT0FBQSxjQUFBLElBQUEsY0FBQSx1QkFBQSxPQUFBOzs7UUFHQTtZQUNBLE1BQUE7WUFDQSxRQUFBOzs7O0lBSUEsU0FBQSxjQUFBLFNBQUEsT0FBQTtRQUNBLElBQUEsT0FBQSxNQUFBO1FBQ0EsSUFBQSxZQUFBLE1BQUEsaUJBQUE7O1FBRUEsWUFBQTs7UUFFQSxjQUFBLFFBQUEsV0FBQSxhQUFBLE1BQUEsY0FBQTs7UUFFQTtRQUNBLE1BQUEsY0FBQTs7OztBQUlBLFFBQUEsT0FBQSxnQkFBQSxDQUFBO0tBQ0EsV0FBQSxzQkFBQTtLQUNBLE9BQUE7QUN0RUEsU0FBQSxhQUFBLHNCQUFBO0lBQ0E7SUFDQSxxQkFBQSxlQUFBLFVBQUE7UUFDQTtZQUNBLFlBQUE7WUFDQSxVQUFBO1lBQ0EsTUFBQTtZQUNBLE1BQUE7WUFDQSxVQUFBO1lBQ0EsT0FBQTtnQkFDQSxLQUFBO2dCQUNBLE9BQUE7b0JBQ0EsS0FBQTt3QkFDQSxhQUFBO3dCQUNBLFlBQUE7Ozs7Ozs7O0FBUUEsU0FBQSxpQkFBQSxNQUFBLE9BQUEsU0FBQSxRQUFBLGNBQUE7SUFDQSxJQUFBLFNBQUE7SUFDQSxJQUFBLGdCQUFBO0lBQ0EsSUFBQTtJQUNBLEtBQUEsTUFBQSxhQUFBOztJQUVBLE9BQUEsU0FBQSxhQUFBOztJQUVBLFNBQUEsV0FBQTtRQUNBLEdBQUEsQ0FBQSxjQUFBLFVBQUEsQ0FBQSxXQUFBO1lBQ0E7OztRQUdBLElBQUEscUJBQUE7O1FBRUEsR0FBQSxPQUFBLFFBQUE7WUFDQSxxQkFBQSxRQUFBLFVBQUEsZUFBQSxPQUFBOzs7UUFHQSxVQUFBLFFBQUEsbUJBQUE7O1FBRUEsT0FBQSxhQUFBLG1CQUFBLE1BQUEsQ0FBQSxVQUFBLE9BQUEsS0FBQSxVQUFBLFNBQUEsVUFBQSxPQUFBLFVBQUE7OztJQUdBLE1BQUEsSUFBQSxlQUFBLEtBQUEsU0FBQSxVQUFBO1FBQ0EsZ0JBQUEsU0FBQTtRQUNBOzs7SUFHQSxNQUFBLElBQUEsWUFBQSxLQUFBLFNBQUEsVUFBQTtRQUNBLE9BQUEsU0FBQSxTQUFBLEtBQUEsU0FBQTtRQUNBLE9BQUEsaUJBQUEsU0FBQSxLQUFBLHFCQUFBO1FBQ0EsT0FBQSxrQkFBQSxTQUFBLEtBQUE7OztJQUdBLElBQUEsVUFBQTtRQUNBO1lBQ0EsUUFBQTtZQUNBLE1BQUE7O1FBRUE7WUFDQSxRQUFBO1lBQ0EsTUFBQTs7UUFFQTtZQUNBLFFBQUE7WUFDQSxNQUFBOztRQUVBO1lBQ0EsUUFBQTtZQUNBLE1BQUE7WUFDQSxVQUFBLFNBQUEsTUFBQTtnQkFDQSxPQUFBLFFBQUEsVUFBQTs7O1FBR0E7WUFDQSxRQUFBO1lBQ0EsTUFBQTtZQUNBLFVBQUEsU0FBQSxNQUFBLFFBQUEsS0FBQSxVQUFBOztnQkFFQSxHQUFBLFNBQUEsUUFBQTtvQkFDQSxPQUFBOztnQkFFQSxPQUFBLDhCQUFBLFNBQUEsWUFBQSxXQUFBLFFBQUE7OztRQUdBO1lBQ0EsUUFBQTtZQUNBLE1BQUE7WUFDQSxVQUFBLFNBQUEsTUFBQTtnQkFDQSxPQUFBLFFBQUEsVUFBQTs7O1FBR0E7WUFDQSxRQUFBO1lBQ0EsTUFBQTtZQUNBLFVBQUEsVUFBQSxNQUFBLFFBQUEsS0FBQTs7O2dCQUdBLE9BQUEsY0FBQSxJQUFBLGNBQUEsdUJBQUEsT0FBQTs7O1FBR0E7WUFDQSxNQUFBO1lBQ0EsUUFBQTs7OztJQUlBLE9BQUEsT0FBQSxpQkFBQSxTQUFBLFVBQUE7UUFDQSxHQUFBLGFBQUEsV0FBQTtZQUNBOztRQUVBOzs7SUFHQSxPQUFBLGdCQUFBLFNBQUEsT0FBQTtRQUNBLElBQUEsT0FBQSxNQUFBLFFBQUE7UUFDQSxJQUFBLFlBQUEsTUFBQSxpQkFBQTs7UUFFQSxZQUFBOztRQUVBLEdBQUEsU0FBQSxnQkFBQSxTQUFBLFNBQUE7WUFDQSxPQUFBLENBQUEsU0FBQTs7O1FBR0EsZ0JBQUEsUUFBQSxXQUFBLGVBQUEsTUFBQSxjQUFBOztRQUVBO1FBQ0EsTUFBQSxjQUFBOzs7SUFHQSxPQUFBLG1CQUFBLFNBQUEsS0FBQTtRQUNBLEdBQUEsSUFBQSxXQUFBLFFBQUE7WUFDQSxPQUFBOzs7OztBQUtBLFFBQUEsT0FBQSxjQUFBLENBQUEsVUFBQSxnQkFBQSxZQUFBO0tBQ0EsV0FBQSxvQkFBQTtLQUNBLE9BQUE7S0FDQSxPQUFBLHFCQUFBLFdBQUE7UUFDQSxPQUFBLFNBQUEsU0FBQTtZQUNBLEdBQUEsWUFBQSxXQUFBO2dCQUNBLE9BQUE7O1lBRUEsSUFBQSxJQUFBLElBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQTtZQUNBLEVBQUEsV0FBQTtZQUNBLE9BQUEsRUFBQTs7O0FDdEpBLFNBQUEsWUFBQSxzQkFBQTtJQUNBO0lBQ0EscUJBQUEsZUFBQSxTQUFBO1FBQ0E7WUFDQSxZQUFBO1lBQ0EsVUFBQTtZQUNBLE1BQUE7WUFDQSxNQUFBO1lBQ0EsVUFBQTtZQUNBLE9BQUE7Z0JBQ0EsS0FBQTtnQkFDQSxPQUFBO29CQUNBLEtBQUE7d0JBQ0EsYUFBQTs7Ozs7Ozs7QUFRQSxRQUFBLE9BQUEsYUFBQTtLQUNBLE9BQUE7QUN0QkEsU0FBQSxVQUFBLG9CQUFBLGNBQUE7SUFDQTtJQUNBLG1CQUFBLFVBQUE7SUFDQSxhQUFBLGFBQUE7OztBQUdBLFFBQUEsT0FBQSxhQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7O0tBRUEsT0FBQSxXQUFBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIE5hdmJhckNvbnRyb2xsZXIoTW9kdWxlU3RhdGVzLCAkc3RhdGUsICRodHRwLCAkd2luZG93KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBOYXZiYXIgPSB0aGlzO1xuICAgIFxuICAgIE5hdmJhci5pc0FjdGl2ZSA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuICAgICAgICByZXR1cm4gJHN0YXRlLmluY2x1ZGVzKG1vZHVsZS5hY3RpdmVTdGF0ZSB8fCBtb2R1bGUubmFtZSk7XG4gICAgfTtcbiAgICBcbiAgICBpZigkd2luZG93LmxvY2FsU3RvcmFnZSkge1xuICAgICAgICBOYXZiYXIuYWNjb3VudE5hbWUgPSAkd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyZWdpc3RlcmVkQWNjb3VudCcpO1xuICAgICAgICBpZihOYXZiYXIuYWNjb3VudE5hbWUpIHtcbiAgICAgICAgICAgIE5hdmJhci5yZWdpc3RlcmVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBOYXZiYXIudW5kb1N0b3JhZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoJHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgICR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JlZ2lzdGVyZWRBY2NvdW50JywgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIE5hdmJhci5hY2NvdW50TmFtZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIE5hdmJhci5yZWdpc3RlcmVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIE5hdmJhci5yZWdpc3RlckFjY291bnQgPSBmdW5jdGlvbihhY2NvdW50TmFtZSkge1xuICAgICAgICAkaHR0cC5nZXQoJ2h0dHA6Ly9zc2YucG9lbGFkZGVyLmNvbS9zaWdudXAvJyArIGFjY291bnROYW1lKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgTmF2YmFyLnJlZ2lzdGVyZWQgPSB0cnVlO1xuICAgICAgICAgICAgaWYoJHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyZWdpc3RlcmVkQWNjb3VudCcsIGFjY291bnROYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBcbiAgICBOYXZiYXIuTW9kdWxlU3RhdGVzID0gTW9kdWxlU3RhdGVzO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgncG9lLm5hdmJhcicsIFsnc3lzdGVtJywgJ3VpLnJvdXRlciddKVxuICAgIC5jb250cm9sbGVyKCdOYXZiYXJDb250cm9sbGVyJywgTmF2YmFyQ29udHJvbGxlcilcbiAgICAuY29tcG9uZW50KCduYXZiYXInLCB7XG4gICAgICAgIGNvbnRyb2xsZXI6ICdOYXZiYXJDb250cm9sbGVyIGFzIE5hdmJhcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9uYXZiYXIvbmF2YmFyLmh0bWwnXG4gICAgfSk7IiwiZnVuY3Rpb24gR3JpZENvbnRyb2xsZXIoJHRpbWVvdXQsICRsb2csICRzY29wZSwgJHRlbXBsYXRlUmVxdWVzdCwgJGludGVycG9sYXRlKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBHcmlkID0gdGhpcztcbiAgICAkc2NvcGUuUGFyZW50ID0gJHNjb3BlLiRwYXJlbnQ7XG5cbiAgICBmdW5jdGlvbiBnZXRDb2x1bW5zKGRhdGEpIHtcbiAgICAgICAgdmFyIGNvbHVtbkRlZmluaXRpb24gPSBbXSxcbiAgICAgICAgICAgIGNvbHVtbktleXMgPSBbXSxcbiAgICAgICAgICAgIG92ZXJyaWRkZW5DZWxscyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYoQXJyYXkuaXNBcnJheShkYXRhKSAmJiBHcmlkLmF1dG9Db2x1bW4gIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXMocm93KS5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICAgICAgICAgICAgICBpZihyb3cuaGFzT3duUHJvcGVydHkoY29sdW1uKSAmJiBjb2x1bW5LZXlzLmluZGV4T2YoY29sdW1uKSA9PT0gLTEgJiYgY29sdW1uICE9PSAnJCRoYXNoS2V5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0NvbHVtbiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29sdW1uW0dyaWQuY29sdW1uS2V5XSA9IGNvbHVtbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbHVtbltHcmlkLmNvbHVtbk5hbWVdID0gY29sdW1uO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW5EZWZpbml0aW9uLnB1c2gobmV3Q29sdW1uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbktleXMucHVzaChjb2x1bW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYoR3JpZC5zdGF0ZSAmJiBBcnJheS5pc0FycmF5KEdyaWQuc3RhdGUuZ3JpZENvbHVtbnMpKSB7XG4gICAgICAgICAgICBHcmlkLnN0YXRlLmdyaWRDb2x1bW5zLmZvckVhY2goZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICAgICAgICAgICAgaWYoY29sdW1uW0dyaWQuY29sdW1uS2V5XSA9PT0gJyQkaGFzaEtleScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZihjb2x1bW4ub3ZlcnJpZGVUZW1wbGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAkdGVtcGxhdGVSZXF1ZXN0KGNvbHVtbi5vdmVycmlkZVRlbXBsYXRlKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGUgPSAkaW50ZXJwb2xhdGUocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW4ub3ZlcnJpZGUgPSBmdW5jdGlvbihjZWxsLCBjb2x1bW4sIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByb3dJbmRleFBhZ2UgPSBHcmlkLmRhdGEuaW5kZXhPZihyb3cpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xJbmRleCA9IGNvbHVtbkRlZmluaXRpb24ubGVuZ3RoIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93SW5kZXggPSAoR3JpZC5zdGF0ZS5wYWdlIC0gMSkgKiBHcmlkLnN0YXRlLnBlclBhZ2UgKyByb3dJbmRleFBhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbGxTY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKG92ZXJyaWRkZW5DZWxsc1tjb2x1bW5bR3JpZC5jb2x1bW5LZXldXSAmJiBvdmVycmlkZGVuQ2VsbHNbY29sdW1uW0dyaWQuY29sdW1uS2V5XV1bcm93SW5kZXhQYWdlXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3ZlcnJpZGRlbkNlbGxzW2NvbHVtbltHcmlkLmNvbHVtbktleV1dW3Jvd0luZGV4UGFnZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbGxTY29wZSA9ICRzY29wZS4kbmV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2VsbFNjb3BlLiRpbmRleCA9IHJvd0luZGV4ICsgY2VsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmV4dGVuZChjZWxsU2NvcGUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbEluZGV4OiBjb2xJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvd0luZGV4OiByb3dJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGluZGV4OiByb3dJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2VsbDogY2VsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBjb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdzogcm93XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IHRlbXBsYXRlKGNlbGxTY29wZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighb3ZlcnJpZGRlbkNlbGxzW2NvbHVtbltHcmlkLmNvbHVtbktleV1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJyaWRkZW5DZWxsc1tjb2x1bW5bR3JpZC5jb2x1bW5LZXldXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVycmlkZGVuQ2VsbHNbY29sdW1uW0dyaWQuY29sdW1uS2V5XV1bcm93SW5kZXhQYWdlXSA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYoY29sdW1uS2V5cy5pbmRleE9mKGNvbHVtbltHcmlkLmNvbHVtbktleV0pID09PSAtMSkgeyAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uRGVmaW5pdGlvbi5wdXNoKGNvbHVtbik7XG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbktleXMucHVzaChjb2x1bW5bR3JpZC5jb2x1bW5LZXldKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2x1bW5EZWZpbml0aW9uLmZvckVhY2goZnVuY3Rpb24oZGVmaW5lZENvbHVtbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZGVmaW5lZENvbHVtbltHcmlkLmNvbHVtbktleV0gPT09IGNvbHVtbltHcmlkLmNvbHVtbktleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhjb2x1bW4pLmZvckVhY2goZnVuY3Rpb24ocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5lZENvbHVtbltwcm9wZXJ0eV0gPSBjb2x1bW5bcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNvbHVtbkRlZmluaXRpb247XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gICAgICAgIHZhciBwZXJQYWdlID0gR3JpZC5wYWdpbmF0aW9uICE9PSB0cnVlICYmIEdyaWQucGFnaW5hdGlvbiAhPT0gdW5kZWZpbmVkID8gR3JpZC5wYWdpbmF0aW9uIDogMjA7XG4gICAgICAgIEdyaWQuc3RhdGUgPSBHcmlkLnN0YXRlIHx8IHtcbiAgICAgICAgICAgIHNvcnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHNvcnREaXJlY3Rpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHBhZ2U6IDEsXG4gICAgICAgICAgICBwZXJQYWdlOiBHcmlkLnBhZ2luYXRpb24gIT09IGZhbHNlID8gcGVyUGFnZSA6IDAsXG4gICAgICAgICAgICBncmlkQ29sdW1uczogW10sXG4gICAgICAgICAgICByZWZyZXNoOiBmYWxzZVxuICAgICAgICB9O1xuXG4gICAgICAgIEdyaWQuY29sdW1uS2V5ID0gR3JpZC5jb2x1bW5LZXkgfHwgJ25hbWUnO1xuICAgICAgICBHcmlkLmNvbHVtbk5hbWUgPSBHcmlkLmNvbHVtbk5hbWUgfHwgJ2hlYWRlcic7XG4gICAgICAgIFxuICAgICAgICBHcmlkLmFwaSA9IHtcbiAgICAgICAgICAgIHJlZnJlc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgR3JpZC5nZXREYXRhKHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IEdyaWQuc3RhdGVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGFjdGl2YXRlKCk7XG4gICAgfSk7XG5cbiAgICBHcmlkLmlzU29ydGFibGUgPSBmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgcmV0dXJuIGNvbHVtbi5zb3J0YWJsZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGNvbHVtbi5zb3J0YWJsZTtcbiAgICB9O1xuICAgIFxuICAgIEdyaWQuZ2V0VmFsdWUgPSBmdW5jdGlvbihyb3csIGNvbHVtbiwgcm93SW5kZXgpIHtcbiAgICAgICAgdmFyIGNlbGw7XG4gICAgICAgIGlmKGNvbHVtbi5vdmVycmlkZSkge1xuICAgICAgICAgICAgY2VsbCA9IGNvbHVtbi5vdmVycmlkZShyb3dbY29sdW1uW0dyaWQuY29sdW1uS2V5XV0sIGNvbHVtbiwgcm93LCByb3dJbmRleCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjZWxsID0gcm93W2NvbHVtbltHcmlkLmNvbHVtbktleV1dO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2VsbDtcbiAgICB9O1xuICAgIFxuICAgIEdyaWQuc29ydCA9IGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICBpZihjb2x1bW4uc29ydGFibGUgIT09IHVuZGVmaW5lZCAmJiAhY29sdW1uLnNvcnRhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmKEdyaWQuc3RhdGUuc29ydCA9PT0gY29sdW1uW0dyaWQuY29sdW1uS2V5XSkge1xuICAgICAgICAgICAgaWYoR3JpZC5zdGF0ZS5zb3J0RGlyZWN0aW9uID09PSAnREVTQycpIHtcbiAgICAgICAgICAgICAgICBHcmlkLnN0YXRlLnNvcnREaXJlY3Rpb24gPSAnQVNDJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgR3JpZC5zdGF0ZS5zb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIEdyaWQuc3RhdGUuc29ydERpcmVjdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEdyaWQuc3RhdGUuc29ydCA9IGNvbHVtbltHcmlkLmNvbHVtbktleV07XG4gICAgICAgICAgICBHcmlkLnN0YXRlLnNvcnREaXJlY3Rpb24gPSAnREVTQyc7XG4gICAgICAgIH1cbiAgICB9O1xuICAgICAgICBcbiAgICAkc2NvcGUuJHdhdGNoKCdHcmlkLnN0YXRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKEdyaWQuc3RhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgR3JpZC5nZXREYXRhKHtcbiAgICAgICAgICAgICAgICBzdGF0ZTogR3JpZC5zdGF0ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LCB0cnVlKTtcbiAgICBcbiAgICAkc2NvcGUuJHdhdGNoKCdHcmlkLmRhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgR3JpZC5kYXRhID0gR3JpZC5kYXRhIHx8IFtdO1xuICAgICAgICBHcmlkLmNvbHVtbkRlZmluaXRpb24gPSBnZXRDb2x1bW5zKEdyaWQuZGF0YSk7XG4gICAgICAgIEdyaWQucm93cyA9IEdyaWQuZGF0YTtcbiAgICB9LCB0cnVlKTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ212bC5ncmlkJywgWyd1aS5ib290c3RyYXAnLCAnbmdTYW5pdGl6ZSddKVxuICAgIC5jb250cm9sbGVyKCdHcmlkQ29udHJvbGxlcicsIEdyaWRDb250cm9sbGVyKVxuICAgIC5jb21wb25lbnQoJ2dyaWQnLCB7XG4gICAgICAgIGNvbnRyb2xsZXI6ICdHcmlkQ29udHJvbGxlciBhcyBHcmlkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2dyaWQvZ3JpZC5odG1sJyxcbiAgICAgICAgYmluZGluZ3M6IHtcbiAgICAgICAgICAgIGRhdGE6ICc8JyxcbiAgICAgICAgICAgIHN0YXRlOiAnPCcsXG4gICAgICAgICAgICBnZXREYXRhOiAnJicsXG4gICAgICAgICAgICBjb2x1bW5LZXk6ICdAJyxcbiAgICAgICAgICAgIGNvbHVtbk5hbWU6ICdAJyxcbiAgICAgICAgICAgIGF1dG9Db2x1bW46ICc8JyxcbiAgICAgICAgICAgIHBhZ2luYXRpb246ICc9PycsXG4gICAgICAgICAgICBnZXRDbGFzc2VzRm9yUm93OiAnPScsXG4gICAgICAgICAgICBhcGk6ICc9PydcbiAgICAgICAgfVxuICAgIH0pXG4gICAgLmRpcmVjdGl2ZSgnY2VsbFZhbHVlJywgZnVuY3Rpb24oJGNvbXBpbGUpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuJGV2YWwoYXR0cmlidXRlcy5jZWxsVmFsdWUpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwodmFsdWUpO1xuICAgIFxuICAgICAgICAgICAgICAgICRjb21waWxlKGVsZW1lbnQuY29udGVudHMoKSkoc2NvcGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgfSk7XG4iLCIvKmdsb2JhbCBjb25zb2xlICovXG5mdW5jdGlvbiBNb2R1bGVTdGF0ZXNQcm92aWRlcigkc3RhdGVQcm92aWRlcikge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgbW9kdWxlcyA9IFtdLFxuICAgICAgICBtb2R1bGVTdGF0ZXMgPSBbXTtcblxuICAgIHRoaXMucmVnaXN0ZXJNb2R1bGUgPSBmdW5jdGlvbihuYW1lLCBzdGF0ZXMpIHtcbiAgICAgICAgaWYobW9kdWxlc1tuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ01vZHVsZSBhbHJlYWR5IHJlZ2lzdGVyZWQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbW9kdWxlcy5wdXNoKG5hbWUpO1xuICAgICAgICBcbiAgICAgICAgc3RhdGVzLmZvckVhY2goZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgICAgIGlmKG1vZHVsZVN0YXRlcy5pbmRleE9mKHN0YXRlKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1N0YXRlIGFscmVhZHkgcmVnaXN0ZXJlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoc3RhdGUubmFtZSwgc3RhdGUuc3RhdGUpO1xuICAgICAgICAgICAgbW9kdWxlU3RhdGVzLnB1c2goc3RhdGUpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy4kZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2R1bGVTdGF0ZXM7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gU3lzdGVtQ29udHJvbGxlcihBUEkpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIFN5c3RlbSA9IHRoaXM7XG4gICAgICAgIFxuICAgIFN5c3RlbS5zaG93aW5nU2lkZSA9IGZhbHNlO1xuICAgIFN5c3RlbS5zaG93aW5nTWVudSA9IHRydWU7XG4gICAgXG4gICAgU3lzdGVtLmdldEFQSSA9IGZ1bmN0aW9uIGdldEFQSShuYW1lKSB7XG4gICAgICAgIHJldHVybiBBUEkobmFtZSk7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gQVBJRmFjdG9yeSgkbG9nLCAkaHR0cCwgJHEsIEFQSUJhc2VMb2NhdGlvbikge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgQVBJID0gZnVuY3Rpb24gQVBJKG5hbWUpIHtcbiAgICAgICAgdmFyIGJhc2VVUkwgPSBBUElCYXNlTG9jYXRpb24gKyBuYW1lICsgJy8nLFxuICAgICAgICAgICAgY2FjaGVzID0gW107XG4gICAgICAgIFxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zbGljZSgxKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FjaGVzID0gW107XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnJlYWRBbGwgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gJHEuZGVmZXIoKSxcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSBmaWx0ZXIgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmKGNhY2hlcyAmJiBjYWNoZXNbSlNPTi5zdHJpbmdpZnkocGFyYW1zKV0gJiYgY2FjaGVzW0pTT04uc3RyaW5naWZ5KHBhcmFtcyldLnRpbWVzdGFtcCA+IERhdGUubm93KCkgLSAxMDAwICogNjAgKiA1KSB7XG4gICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygndXAgdG8gZGF0ZSBjYWNoZSwgdXNpbmcgaW5zdGVhZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlcXVlc3QucmVzb2x2ZShjYWNoZXNbSlNPTi5zdHJpbmdpZnkocGFyYW1zKV0ucm93cyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ2dldHRpbmcgZnJlc2ggZGF0YScpO1xuICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBiYXNlVVJMLFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5yZXNvbHZlKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVzW0pTT04uc3RyaW5naWZ5KHBhcmFtcyldID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcm93czogcmVzcG9uc2UuZGF0YVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdC5wcm9taXNlO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgdXJsOiBiYXNlVVJMLFxuICAgICAgICAgICAgICAgIGRhdGE6IG9iamVjdFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnJlYWQgPSBmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIHVybDogYmFzZVVSTCArIGlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAoe1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgICAgICAgdXJsOiBiYXNlVVJMICsgb2JqZWN0LmlkLFxuICAgICAgICAgICAgICAgIGRhdGE6IG9iamVjdFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICAgICAgICAgIHVybDogYmFzZVVSTCArIG9iamVjdC5pZCxcbiAgICAgICAgICAgICAgICBkYXRhOiBvYmplY3RcbiAgICAgICAgICAgIH0pOyAgICAgICAgICAgIFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5nZXRUYWJsZVJlc291cmNlID0gZnVuY3Rpb24odGFzaykge1xuICAgICAgICAgICAgcmV0dXJuIChmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc291cmNlID0gdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXIsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyQnksXG4gICAgICAgICAgICAgICAgICAgIHBhZ2luYXRpb25DYWNoZSA9IHt9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnQgPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMubGltaXQgPSAyNTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ29yZGVyJywge1xuICAgICAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yZGVyO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKG5ld09yZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuZXdPcmRlciA9PT0gb3JkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ25ldyBvcmRlciwgY2xlYXJpbmcgY2FjaGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yZGVyID0gbmV3T3JkZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYWdpbmF0aW9uQ2FjaGUgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnb3JkZXJCeScsIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvcmRlckJ5O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKG5ld09yZGVyQnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG5ld09yZGVyQnkgPT09IG9yZGVyQnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ25ldyBvcmRlcmJ5LCBjbGVhcmluZyBjYWNoZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3JkZXJCeSA9IG5ld09yZGVyQnk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYWdpbmF0aW9uQ2FjaGUgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcocGFnaW5hdGlvbkNhY2hlKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmKHBhZ2luYXRpb25DYWNoZVtyZXNvdXJjZS5saW1pdF0gIT09IHVuZGVmaW5lZCAmJiBwYWdpbmF0aW9uQ2FjaGVbcmVzb3VyY2UubGltaXRdW3Jlc291cmNlLnN0YXJ0XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKHJlc291cmNlLmxpbWl0LCByZXNvdXJjZS5zdGFydCwgJ2NhY2hlZCwgbG9hZGluZycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShwYWdpbmF0aW9uQ2FjaGVbcmVzb3VyY2UubGltaXRdW3Jlc291cmNlLnN0YXJ0XSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKHJlc291cmNlLmxpbWl0LCByZXNvdXJjZS5zdGFydCwgJ25vdCBjYWNoZWQsIGxvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEFQSS5kb1Rhc2sodGFzaywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiByZXNvdXJjZS5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW1pdDogcmVzb3VyY2UubGltaXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc29ydDogcmVzb3VyY2Uub3JkZXJCeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXI6IHJlc291cmNlLm9yZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWdpbmF0aW9uQ2FjaGVbcmVzb3VyY2UubGltaXRdID0gcGFnaW5hdGlvbkNhY2hlW3Jlc291cmNlLmxpbWl0XSB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWdpbmF0aW9uQ2FjaGVbcmVzb3VyY2UubGltaXRdW3Jlc291cmNlLnN0YXJ0XSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9KHRhc2spKTtcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIEFQSXMgPSB7fTtcblxuICAgICAgICBcbiAgICByZXR1cm4gZnVuY3Rpb24obmFtZSkge1xuICAgICAgICBpZihBUElzW25hbWVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIEFQSXNbbmFtZV0gPSBuZXcgQVBJKG5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBBUElzW25hbWVdO1xuICAgIH07XG59XG5cbmFuZ3VsYXIubW9kdWxlKCdzeXN0ZW0nLCBbJ3VpLnJvdXRlciddKVxuICAgIC5jb25zdGFudCgnQVBJQmFzZUxvY2F0aW9uJywgJ0FQSS8nKVxuICAgIC5zZXJ2aWNlKCdTeXN0ZW0nLCBTeXN0ZW1Db250cm9sbGVyKVxuICAgIC5wcm92aWRlcignTW9kdWxlU3RhdGVzJywgTW9kdWxlU3RhdGVzUHJvdmlkZXIpXG4gICAgLmZhY3RvcnkoJ0FQSScsIEFQSUZhY3RvcnkpOyIsImZ1bmN0aW9uIFN0YXR1c0xpZ2h0Q29udHJvbGxlcigpIHtcbiAgICB2YXIgU3RhdHVzTGlnaHQgPSB0aGlzO1xuICAgIFxuICAgIHZhciBzdGF0dXNUb0NvbG9yID0ge1xuICAgICAgICB1bmtub3duOiAnI2VlZScsXG4gICAgICAgIG9rOiAnIzVjYjg1YycsXG4gICAgICAgIG5vdGljZTogJyNmZWZmNzgnLFxuICAgICAgICB3YXJuaW5nOiAnI2YwYWQ0ZScsXG4gICAgICAgIGRhbmdlcjogJyNkOTUzNGYnXG4gICAgfTtcbiAgICBcbiAgICBTdGF0dXNMaWdodC5zdHlsZSA9IHtcbiAgICAgICAgJ2JhY2tncm91bmQtY29sb3InOiBzdGF0dXNUb0NvbG9yW1N0YXR1c0xpZ2h0LnN0YXR1c10gfHwgJ3RyYW5zcGFyZW50J1xuICAgIH07XG59XG5cbmFuZ3VsYXIubW9kdWxlKCdtdmwuc3RhdHVzbGlnaHQnLCBbXSlcbi5jb250cm9sbGVyKCdTdGF0dXNMaWdodENvbnRyb2xsZXInLCBTdGF0dXNMaWdodENvbnRyb2xsZXIpXG4uY29tcG9uZW50KCdzdGF0dXNMaWdodCcsIHtcbiAgICAgICAgY29udHJvbGxlcjogJ1N0YXR1c0xpZ2h0Q29udHJvbGxlciBhcyBTdGF0dXNMaWdodCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9zdGF0dXMtbGlnaHQvc3RhdHVzLWxpZ2h0Lmh0bWwnLFxuICAgICAgICBiaW5kaW5nczoge1xuICAgICAgICAgICAgJ3N0YXR1cyc6ICc8J1xuICAgICAgICB9XG4gICAgfSk7IiwiZnVuY3Rpb24gQWNjb3VudHNDb25maWcoTW9kdWxlU3RhdGVzUHJvdmlkZXIpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgTW9kdWxlU3RhdGVzUHJvdmlkZXIucmVnaXN0ZXJNb2R1bGUoJ0FjY291bnRzJywgW1xuICAgICAgICB7XG4gICAgICAgICAgICBzaG93SW5NZW51OiB0cnVlLFxuICAgICAgICAgICAgbWVudU5hbWU6ICdBY2NvdW50cycsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtdXNlcnMgZmEtZncnLFxuICAgICAgICAgICAgbmFtZTogJ2FjY291bnRzJyxcbiAgICAgICAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgICAgICAgc3RhdGU6IHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvYWNjb3VudHMnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICdAJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2FjY291bnRzL2FjY291bnRzLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0FjY291bnRzQ29udHJvbGxlciBhcyBBY2NvdW50cydcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF0pO1xufVxuXG5mdW5jdGlvbiBBY2NvdW50c0NvbnRyb2xsZXIoU3lzdGVtLCAkbG9nLCAkZmlsdGVyLCAkaHR0cCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgQWNjb3VudHMgPSB0aGlzO1xuICAgIHZhciBhbGxBY2NvdW50cyA9IFtdO1xuICAgIHZhciBncmlkU3RhdGU7XG4gICAgJGxvZy5kZWJ1ZyhBY2NvdW50cyk7XG4gICAgXG4gICAgZnVuY3Rpb24gZG9GaWx0ZXIoKSB7XG4gICAgICAgIGdyaWRTdGF0ZS50b3RhbCA9IGFsbEFjY291bnRzLmxlbmd0aDtcbiAgICAgICAgQWNjb3VudHMubGlzdCA9IGFsbEFjY291bnRzLnNsaWNlKChncmlkU3RhdGUucGFnZSAtIDEpICogZ3JpZFN0YXRlLnBlclBhZ2UsIGdyaWRTdGF0ZS5wYWdlICogZ3JpZFN0YXRlLnBlclBhZ2UpO1xuICAgIH1cbiAgICBcbiAgICAkaHR0cC5nZXQoJ2FjY291bnRzLnBocCcpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgYWxsQWNjb3VudHMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICBkb0ZpbHRlcigpO1xuICAgIH0pO1xuICAgIFxuICAgIHZhciBjb2x1bW5zID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdBY2NvdW50cycsXG4gICAgICAgICAgICBuYW1lOiAnbmFtZScsXG4gICAgICAgICAgICBvdmVycmlkZTogZnVuY3Rpb24gKGNlbGwsIGNvbHVtbiwgcm93KSB7XG4gICAgICAgICAgICAgICAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiAnPGEgaHJlZj1cIicgKyByb3cuYWNjb3VudF91cmwgKyAnXCIgdGFyZ2V0PVwiX2JsYW5rXCI+JyArIGNlbGwgKyAnPC9hPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdhY2NvdW50X3VybCcsXG4gICAgICAgICAgICBoaWRkZW46IHRydWVcbiAgICAgICAgfVxuICAgIF07XG4gICAgXG4gICAgQWNjb3VudHMuZ2V0QWNjb3VudHMgPSBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgICB2YXIgc29ydCA9IHN0YXRlLnNvcnQ7XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBzdGF0ZS5zb3J0RGlyZWN0aW9uIHx8ICdERVNDJztcbiAgICAgICAgXG4gICAgICAgIGdyaWRTdGF0ZSA9IHN0YXRlO1xuICAgICAgICBcbiAgICAgICAgYWxsQWNjb3VudHMgPSAkZmlsdGVyKCdvcmRlckJ5JykoYWxsQWNjb3VudHMsIHNvcnQsIGRpcmVjdGlvbiA9PT0gJ0RFU0MnKTtcbiAgICAgICAgXG4gICAgICAgIGRvRmlsdGVyKCk7XG4gICAgICAgIHN0YXRlLmdyaWRDb2x1bW5zID0gY29sdW1ucztcbiAgICB9O1xufVxuXG5hbmd1bGFyLm1vZHVsZSgncG9lLmFjY291bnRzJywgWydzeXN0ZW0nXSlcbiAgICAuY29udHJvbGxlcignQWNjb3VudHNDb250cm9sbGVyJywgQWNjb3VudHNDb250cm9sbGVyKVxuICAgIC5jb25maWcoQWNjb3VudHNDb25maWcpOyIsImZ1bmN0aW9uIExhZGRlckNvbmZpZyhNb2R1bGVTdGF0ZXNQcm92aWRlcikge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBNb2R1bGVTdGF0ZXNQcm92aWRlci5yZWdpc3Rlck1vZHVsZSgnTGFkZGVyJywgW1xuICAgICAgICB7XG4gICAgICAgICAgICBzaG93SW5NZW51OiB0cnVlLFxuICAgICAgICAgICAgbWVudU5hbWU6ICdMYWRkZXInLFxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWJhci1jaGFydCBmYS1mdycsXG4gICAgICAgICAgICBuYW1lOiAnbGFkZGVyJyxcbiAgICAgICAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgICAgICAgc3RhdGU6IHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmZpbHRlcicsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0AnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvbGFkZGVyL2xhZGRlci5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdMYWRkZXJDb250cm9sbGVyIGFzIExhZGRlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF0pO1xufVxuXG5mdW5jdGlvbiBMYWRkZXJDb250cm9sbGVyKCRsb2csICRodHRwLCAkZmlsdGVyLCAkc2NvcGUsICRzdGF0ZVBhcmFtcykge1xuICAgIHZhciBMYWRkZXIgPSB0aGlzO1xuICAgIHZhciBhbGxDaGFyYWN0ZXJzID0gW107XG4gICAgdmFyIGdyaWRTdGF0ZTtcbiAgICAkbG9nLmRlYnVnKCRzdGF0ZVBhcmFtcy5maWx0ZXIpO1xuICAgIFxuICAgIExhZGRlci5maWx0ZXIgPSAkc3RhdGVQYXJhbXMuZmlsdGVyO1xuICAgIFxuICAgIGZ1bmN0aW9uIGRvRmlsdGVyKCkge1xuICAgICAgICBpZighYWxsQ2hhcmFjdGVycy5sZW5ndGggfHwgIWdyaWRTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgZmlsdGVyZWRDaGFyYWN0ZXJzID0gYWxsQ2hhcmFjdGVycztcbiAgICAgICAgXG4gICAgICAgIGlmKExhZGRlci5maWx0ZXIpIHtcbiAgICAgICAgICAgIGZpbHRlcmVkQ2hhcmFjdGVycyA9ICRmaWx0ZXIoJ2ZpbHRlcicpKGFsbENoYXJhY3RlcnMsIExhZGRlci5maWx0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBncmlkU3RhdGUudG90YWwgPSBmaWx0ZXJlZENoYXJhY3RlcnMubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgTGFkZGVyLmNoYXJhY3RlcnMgPSBmaWx0ZXJlZENoYXJhY3RlcnMuc2xpY2UoKGdyaWRTdGF0ZS5wYWdlIC0gMSkgKiBncmlkU3RhdGUucGVyUGFnZSwgZ3JpZFN0YXRlLnBhZ2UgKiBncmlkU3RhdGUucGVyUGFnZSk7XG4gICAgfVxuICAgIFxuICAgICRodHRwLmdldCgnc2NyYXBlci5waHAnKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIGFsbENoYXJhY3RlcnMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICBkb0ZpbHRlcigpO1xuICAgIH0pO1xuICAgIFxuICAgICRodHRwLmdldCgnbWV0YS5waHAnKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIExhZGRlci5zdGF0dXMgPSByZXNwb25zZS5kYXRhLnN0YXR1cyArICcgJztcbiAgICAgICAgTGFkZGVyLmxhc3RVcGRhdGVUaW1lID0gcmVzcG9uc2UuZGF0YS5sYXN0X2xhZGRlcl91cGRhdGUgKyAnMDAwJztcbiAgICAgICAgTGFkZGVyLmxhc3RQcm9jZXNzVGltZSA9IHJlc3BvbnNlLmRhdGEubGFzdF9wcm9jZXNzX3RpbWU7XG4gICAgfSk7XG4gICAgXG4gICAgdmFyIGNvbHVtbnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ1JhbmsnLFxuICAgICAgICAgICAgbmFtZTogJ3JhbmsnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ0NsYXNzJyxcbiAgICAgICAgICAgIG5hbWU6ICdjbGFzcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnTGV2ZWwnLFxuICAgICAgICAgICAgbmFtZTogJ2xldmVsJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdFeHBlcmllbmNlJyxcbiAgICAgICAgICAgIG5hbWU6ICdleHBlcmllbmNlJyxcbiAgICAgICAgICAgIG92ZXJyaWRlOiBmdW5jdGlvbihjZWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRmaWx0ZXIoJ251bWJlcicpKGNlbGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdTdGF0dXMnLFxuICAgICAgICAgICAgbmFtZTogJ3N0YXR1cycsXG4gICAgICAgICAgICBvdmVycmlkZTogZnVuY3Rpb24oY2VsbCwgY29sdW1uLCByb3csIHJvd0luZGV4KSB7XG4gICAgICAgICAgICAgICAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICAgICAgICAgICAgICAgIGlmKGNlbGwgPT09ICdEZWFkJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2VsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICc8c3RhdHVzLWxpZ2h0IHN0YXR1cz1cIlxcJycgKyAoY2VsbCA9PT0gJ29mZmxpbmUnID8gJ2RhbmdlcicgOiAnb2snKSArICdcXCdcIj48L3N0YXR1cy1saWdodD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdFeHBlcmllbmNlIGdhaW5lZCBsYXN0IGhvdXIgKEFwcHJveC4pJyxcbiAgICAgICAgICAgIG5hbWU6ICdleHBlcmllbmNlX2xhc3RfaG91cicsXG4gICAgICAgICAgICBvdmVycmlkZTogZnVuY3Rpb24oY2VsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkZmlsdGVyKCdudW1iZXInKShjZWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnTmFtZScsXG4gICAgICAgICAgICBuYW1lOiAnbmFtZScsXG4gICAgICAgICAgICBvdmVycmlkZTogZnVuY3Rpb24gKGNlbGwsIGNvbHVtbiwgcm93KSB7XG4gICAgICAgICAgICAgICAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiAnPGEgaHJlZj1cIicgKyByb3cuYWNjb3VudF91cmwgKyAnXCIgdGFyZ2V0PVwiX2JsYW5rXCI+JyArIGNlbGwgKyAnPC9hPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdhY2NvdW50X3VybCcsXG4gICAgICAgICAgICBoaWRkZW46IHRydWVcbiAgICAgICAgfVxuICAgIF07XG4gICAgXG4gICAgJHNjb3BlLiR3YXRjaCgnTGFkZGVyLmZpbHRlcicsIGZ1bmN0aW9uKG5ld1ZhbHVlKSB7XG4gICAgICAgIGlmKG5ld1ZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBkb0ZpbHRlcigpO1xuICAgIH0pO1xuICAgIFxuICAgIExhZGRlci5nZXRDaGFyYWN0ZXJzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgdmFyIHNvcnQgPSBzdGF0ZS5zb3J0IHx8ICdyYW5rJztcbiAgICAgICAgdmFyIGRpcmVjdGlvbiA9IHN0YXRlLnNvcnREaXJlY3Rpb24gfHwgJ0FTQyc7XG4gICAgICAgIFxuICAgICAgICBncmlkU3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGlmKHNvcnQgPT09ICdleHBlcmllbmNlJyB8fCBzb3J0ID09PSAnbGV2ZWwnKSB7XG4gICAgICAgICAgICBzb3J0ID0gWydsZXZlbCcsICdleHBlcmllbmNlJ107XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGFsbENoYXJhY3RlcnMgPSAkZmlsdGVyKCdvcmRlckJ5JykoYWxsQ2hhcmFjdGVycywgc29ydCwgZGlyZWN0aW9uID09PSAnREVTQycpO1xuICAgICAgICBcbiAgICAgICAgZG9GaWx0ZXIoKTtcbiAgICAgICAgc3RhdGUuZ3JpZENvbHVtbnMgPSBjb2x1bW5zO1xuICAgIH07XG4gICAgXG4gICAgTGFkZGVyLmdldENsYXNzZXNGb3JSb3cgPSBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgaWYocm93LnN0YXR1cyA9PT0gJ0RlYWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2RlYWQnO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3BvZS5sYWRkZXInLCBbJ3N5c3RlbScsICd1aS5ib290c3RyYXAnLCAnbXZsLmdyaWQnLCAnbXZsLnN0YXR1c2xpZ2h0J10pXG4gICAgLmNvbnRyb2xsZXIoJ0xhZGRlckNvbnRyb2xsZXInLCBMYWRkZXJDb250cm9sbGVyKVxuICAgIC5jb25maWcoTGFkZGVyQ29uZmlnKVxuICAgIC5maWx0ZXIoJ3NlY29uZHNUb0RhdGVUaW1lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihzZWNvbmRzKSB7XG4gICAgICAgICAgICBpZihzZWNvbmRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2Vjb25kcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkID0gbmV3IERhdGUoMCwwLDAsMCwwLDAsMCk7XG4gICAgICAgICAgICBkLnNldFNlY29uZHMoc2Vjb25kcyk7XG4gICAgICAgICAgICByZXR1cm4gZC5nZXRUaW1lKCk7XG4gICAgICAgIH07XG4gICAgfSk7IiwiZnVuY3Rpb24gUnVsZXNDb25maWcoTW9kdWxlU3RhdGVzUHJvdmlkZXIpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgTW9kdWxlU3RhdGVzUHJvdmlkZXIucmVnaXN0ZXJNb2R1bGUoJ1J1bGVzJywgW1xuICAgICAgICB7XG4gICAgICAgICAgICBzaG93SW5NZW51OiB0cnVlLFxuICAgICAgICAgICAgbWVudU5hbWU6ICdSdWxlcycsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtbGlzdC1vbCBmYS1mdycsXG4gICAgICAgICAgICBuYW1lOiAncnVsZXMnLFxuICAgICAgICAgICAgcHJpb3JpdHk6IDIsXG4gICAgICAgICAgICBzdGF0ZToge1xuICAgICAgICAgICAgICAgIHVybDogJy9ydWxlcycsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0AnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvcnVsZXMvcnVsZXMuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF0pO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgncG9lLnJ1bGVzJywgW10pXG4gICAgLmNvbmZpZyhSdWxlc0NvbmZpZyk7IiwiZnVuY3Rpb24gQXBwQ29uZmlnKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvZ1Byb3ZpZGVyKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAkbG9nUHJvdmlkZXIuZGVidWdFbmFibGVkKHRydWUpO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgncG9lbGFkZGVyJywgW1xuICAgICAgICAndWkucm91dGVyJyxcbiAgICAgICAgJ3RlbXBsYXRlcycsXG4gICAgICAgICdzeXN0ZW0nLFxuICAgICAgICAncG9lLm5hdmJhcicsXG4gICAgICAgICdwb2UuYWNjb3VudHMnLFxuICAgICAgICAncG9lLnJ1bGVzJyxcbiAgICAgICAgJ3BvZS5sYWRkZXInXG4gICAgXSlcbiAgICAuY29uZmlnKEFwcENvbmZpZyk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
