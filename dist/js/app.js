
GridController.$inject = ["$timeout", "$log", "$scope", "$templateRequest", "$interpolate"];
NavbarController.$inject = ["ModuleStates", "$state", "$http", "$window"];
SystemController.$inject = ["API"];
ModuleStatesProvider.$inject = ["$stateProvider"];
APIFactory.$inject = ["$log", "$http", "$q", "APIBaseLocation"];
AccountsController.$inject = ["System", "$log", "$filter", "$http"];
AccountsConfig.$inject = ["ModuleStatesProvider"];
LadderController.$inject = ["$log", "$http", "$filter", "$scope", "$stateParams"];
LadderConfig.$inject = ["ModuleStatesProvider"];
RulesConfig.$inject = ["ModuleStatesProvider"];
AppConfig.$inject = ["$urlRouterProvider", "$logProvider"];function GridController($timeout, $log, $scope, $templateRequest, $interpolate) {
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

function NavbarController(ModuleStates, $state, $http, $window) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbXBvbmVudHMvZ3JpZC9ncmlkLmpzIiwiY29tcG9uZW50cy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tcG9uZW50cy9zdGF0dXMtbGlnaHQvc3RhdHVzLWxpZ2h0LmpzIiwiY29tcG9uZW50cy9zeXN0ZW0vc3lzdGVtLmpzIiwibW9kdWxlcy9hY2NvdW50cy9hY2NvdW50cy5qcyIsIm1vZHVsZXMvbGFkZGVyL2xhZGRlci5qcyIsIm1vZHVsZXMvcnVsZXMvcnVsZXMuanMiLCJhcHAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7MkRBQUEsU0FBQSxlQUFBLFVBQUEsTUFBQSxRQUFBLGtCQUFBLGNBQUE7SUFDQTtJQUNBLElBQUEsT0FBQTtJQUNBLE9BQUEsU0FBQSxPQUFBOztJQUVBLFNBQUEsV0FBQSxNQUFBO1FBQ0EsSUFBQSxtQkFBQTtZQUNBLGFBQUE7WUFDQSxrQkFBQTs7UUFFQSxHQUFBLE1BQUEsUUFBQSxTQUFBLEtBQUEsZUFBQSxPQUFBO1lBQ0EsS0FBQSxRQUFBLFNBQUEsS0FBQTtnQkFDQSxPQUFBLEtBQUEsS0FBQSxRQUFBLFNBQUEsUUFBQTtvQkFDQSxHQUFBLElBQUEsZUFBQSxXQUFBLFdBQUEsUUFBQSxZQUFBLENBQUEsS0FBQSxXQUFBLGFBQUE7d0JBQ0EsSUFBQSxZQUFBO3dCQUNBLFVBQUEsS0FBQSxhQUFBO3dCQUNBLFVBQUEsS0FBQSxjQUFBOzt3QkFFQSxpQkFBQSxLQUFBO3dCQUNBLFdBQUEsS0FBQTs7Ozs7O1FBTUEsR0FBQSxLQUFBLFNBQUEsTUFBQSxRQUFBLEtBQUEsTUFBQSxjQUFBO1lBQ0EsS0FBQSxNQUFBLFlBQUEsUUFBQSxTQUFBLFFBQUE7Z0JBQ0EsR0FBQSxPQUFBLEtBQUEsZUFBQSxhQUFBO29CQUNBOzs7Z0JBR0EsR0FBQSxPQUFBLGtCQUFBO29CQUNBLGlCQUFBLE9BQUEsa0JBQUEsS0FBQSxTQUFBLFVBQUE7d0JBQ0EsSUFBQSxXQUFBLGFBQUE7O3dCQUVBLE9BQUEsV0FBQSxTQUFBLE1BQUEsUUFBQSxLQUFBOzRCQUNBLElBQUEsZUFBQSxLQUFBLEtBQUEsUUFBQTtnQ0FDQSxXQUFBLGlCQUFBLFNBQUE7Z0NBQ0EsV0FBQSxDQUFBLEtBQUEsTUFBQSxPQUFBLEtBQUEsS0FBQSxNQUFBLFVBQUE7Z0NBQ0E7Z0NBQ0E7OzRCQUVBLEdBQUEsZ0JBQUEsT0FBQSxLQUFBLGVBQUEsZ0JBQUEsT0FBQSxLQUFBLFlBQUEsZUFBQTtnQ0FDQSxPQUFBLGdCQUFBLE9BQUEsS0FBQSxZQUFBOzs7NEJBR0EsWUFBQSxPQUFBOzRCQUNBLFVBQUEsU0FBQSxXQUFBOzs0QkFFQSxRQUFBLE9BQUEsV0FBQTtnQ0FDQSxXQUFBO2dDQUNBLFdBQUE7Z0NBQ0EsUUFBQTtnQ0FDQSxNQUFBO2dDQUNBLFFBQUE7Z0NBQ0EsS0FBQTs7OzRCQUdBLFVBQUEsU0FBQTs7NEJBRUEsR0FBQSxDQUFBLGdCQUFBLE9BQUEsS0FBQSxhQUFBO2dDQUNBLGdCQUFBLE9BQUEsS0FBQSxjQUFBOzs7NEJBR0EsZ0JBQUEsT0FBQSxLQUFBLFlBQUEsZ0JBQUE7OzRCQUVBLE9BQUE7Ozs7O2dCQUtBLEdBQUEsV0FBQSxRQUFBLE9BQUEsS0FBQSxnQkFBQSxDQUFBLEdBQUE7b0JBQ0EsaUJBQUEsS0FBQTtvQkFDQSxXQUFBLEtBQUEsT0FBQSxLQUFBO3VCQUNBO29CQUNBLGlCQUFBLFFBQUEsU0FBQSxlQUFBO3dCQUNBLEdBQUEsY0FBQSxLQUFBLGVBQUEsT0FBQSxLQUFBLFlBQUE7NEJBQ0EsT0FBQSxLQUFBLFFBQUEsUUFBQSxTQUFBLFVBQUE7Z0NBQ0EsY0FBQSxZQUFBLE9BQUE7Ozs7Ozs7O1FBUUEsT0FBQTs7O0lBR0EsU0FBQSxXQUFBO1FBQ0EsSUFBQSxVQUFBLEtBQUEsZUFBQSxRQUFBLEtBQUEsZUFBQSxZQUFBLEtBQUEsYUFBQTtRQUNBLEtBQUEsUUFBQSxLQUFBLFNBQUE7WUFDQSxNQUFBO1lBQ0EsZUFBQTtZQUNBLE1BQUE7WUFDQSxTQUFBLEtBQUEsZUFBQSxRQUFBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsU0FBQTs7O1FBR0EsS0FBQSxZQUFBLEtBQUEsYUFBQTtRQUNBLEtBQUEsYUFBQSxLQUFBLGNBQUE7O1FBRUEsS0FBQSxNQUFBO1lBQ0EsU0FBQSxXQUFBO2dCQUNBLEtBQUEsSUFBQTtnQkFDQSxLQUFBLFFBQUE7b0JBQ0EsT0FBQSxLQUFBOzs7Ozs7SUFNQSxTQUFBLFdBQUE7UUFDQTs7O0lBR0EsS0FBQSxhQUFBLFNBQUEsUUFBQTtRQUNBLE9BQUEsT0FBQSxhQUFBLFlBQUEsT0FBQSxPQUFBOzs7SUFHQSxLQUFBLFdBQUEsU0FBQSxLQUFBLFFBQUEsVUFBQTtRQUNBLElBQUE7UUFDQSxHQUFBLE9BQUEsVUFBQTtZQUNBLE9BQUEsT0FBQSxTQUFBLElBQUEsT0FBQSxLQUFBLGFBQUEsUUFBQSxLQUFBO2VBQ0E7WUFDQSxPQUFBLElBQUEsT0FBQSxLQUFBOzs7UUFHQSxPQUFBOzs7SUFHQSxLQUFBLE9BQUEsU0FBQSxRQUFBO1FBQ0EsR0FBQSxPQUFBLGFBQUEsYUFBQSxDQUFBLE9BQUEsVUFBQTtZQUNBOzs7UUFHQSxHQUFBLEtBQUEsTUFBQSxTQUFBLE9BQUEsS0FBQSxZQUFBO1lBQ0EsR0FBQSxLQUFBLE1BQUEsa0JBQUEsUUFBQTtnQkFDQSxLQUFBLE1BQUEsZ0JBQUE7bUJBQ0E7Z0JBQ0EsS0FBQSxNQUFBLE9BQUE7Z0JBQ0EsS0FBQSxNQUFBLGdCQUFBOztlQUVBO1lBQ0EsS0FBQSxNQUFBLE9BQUEsT0FBQSxLQUFBO1lBQ0EsS0FBQSxNQUFBLGdCQUFBOzs7O0lBSUEsT0FBQSxPQUFBLGNBQUEsV0FBQTtRQUNBLEdBQUEsS0FBQSxVQUFBLFdBQUE7WUFDQSxLQUFBLFFBQUE7Z0JBQ0EsT0FBQSxLQUFBOzs7T0FHQTs7SUFFQSxPQUFBLE9BQUEsYUFBQSxXQUFBO1FBQ0EsS0FBQSxPQUFBLEtBQUEsUUFBQTtRQUNBLEtBQUEsbUJBQUEsV0FBQSxLQUFBO1FBQ0EsS0FBQSxPQUFBLEtBQUE7T0FDQTs7O0FBR0EsUUFBQSxPQUFBLFlBQUEsQ0FBQSxnQkFBQTtLQUNBLFdBQUEsa0JBQUE7S0FDQSxVQUFBLFFBQUE7UUFDQSxZQUFBO1FBQ0EsYUFBQTtRQUNBLFVBQUE7WUFDQSxNQUFBO1lBQ0EsT0FBQTtZQUNBLFNBQUE7WUFDQSxXQUFBO1lBQ0EsWUFBQTtZQUNBLFlBQUE7WUFDQSxZQUFBO1lBQ0Esa0JBQUE7WUFDQSxLQUFBOzs7S0FHQSxVQUFBLDBCQUFBLFNBQUEsVUFBQTtRQUNBO1FBQ0EsT0FBQSxVQUFBLE9BQUEsU0FBQSxZQUFBO1lBQ0EsTUFBQSxPQUFBLFNBQUEsT0FBQTtnQkFDQSxPQUFBLE1BQUEsTUFBQSxXQUFBO2VBQ0EsU0FBQSxPQUFBO2dCQUNBLFFBQUEsS0FBQTs7Z0JBRUEsU0FBQSxRQUFBLFlBQUE7Ozs7O0FDOUxBLFNBQUEsaUJBQUEsY0FBQSxRQUFBLE9BQUEsU0FBQTtJQUNBO0lBQ0EsSUFBQSxTQUFBOztJQUVBLE9BQUEsV0FBQSxTQUFBLFFBQUE7UUFDQSxPQUFBLE9BQUEsU0FBQSxPQUFBLGVBQUEsT0FBQTs7O0lBR0EsR0FBQSxRQUFBLGNBQUE7UUFDQSxPQUFBLGNBQUEsUUFBQSxhQUFBLFFBQUE7UUFDQSxHQUFBLE9BQUEsYUFBQTtZQUNBLE9BQUEsYUFBQTs7OztJQUlBLE9BQUEsY0FBQSxXQUFBO1FBQ0EsR0FBQSxRQUFBLGNBQUE7WUFDQSxRQUFBLGFBQUEsUUFBQSxxQkFBQTtZQUNBLE9BQUEsY0FBQTtZQUNBLE9BQUEsYUFBQTs7OztJQUlBLE9BQUEsa0JBQUEsU0FBQSxhQUFBO1FBQ0EsTUFBQSxJQUFBLHFDQUFBLGFBQUEsS0FBQSxXQUFBO1lBQ0EsT0FBQSxhQUFBO1lBQ0EsR0FBQSxRQUFBLGNBQUE7Z0JBQ0EsUUFBQSxhQUFBLFFBQUEscUJBQUE7Ozs7O0lBS0EsT0FBQSxlQUFBOzs7QUFHQSxRQUFBLE9BQUEsY0FBQSxDQUFBLFVBQUE7S0FDQSxXQUFBLG9CQUFBO0tBQ0EsVUFBQSxVQUFBO1FBQ0EsWUFBQTtRQUNBLGFBQUE7O0FDdkNBLFNBQUEsd0JBQUE7SUFDQSxJQUFBLGNBQUE7O0lBRUEsSUFBQSxnQkFBQTtRQUNBLFNBQUE7UUFDQSxJQUFBO1FBQ0EsUUFBQTtRQUNBLFNBQUE7UUFDQSxRQUFBOzs7SUFHQSxZQUFBLFFBQUE7UUFDQSxvQkFBQSxjQUFBLFlBQUEsV0FBQTs7OztBQUlBLFFBQUEsT0FBQSxtQkFBQTtDQUNBLFdBQUEseUJBQUE7Q0FDQSxVQUFBLGVBQUE7UUFDQSxZQUFBO1FBQ0EsYUFBQTtRQUNBLFVBQUE7WUFDQSxVQUFBOzs7O0FDckJBLFNBQUEscUJBQUEsZ0JBQUE7SUFDQTtJQUNBLElBQUEsVUFBQTtRQUNBLGVBQUE7O0lBRUEsS0FBQSxpQkFBQSxTQUFBLE1BQUEsUUFBQTtRQUNBLEdBQUEsUUFBQSxVQUFBLFdBQUE7WUFDQSxRQUFBLEtBQUE7WUFDQTs7O1FBR0EsUUFBQSxLQUFBOztRQUVBLE9BQUEsUUFBQSxTQUFBLE9BQUE7WUFDQSxHQUFBLGFBQUEsUUFBQSxXQUFBLENBQUEsR0FBQTtnQkFDQSxRQUFBLEtBQUE7Z0JBQ0E7OztZQUdBLGVBQUEsTUFBQSxNQUFBLE1BQUEsTUFBQTtZQUNBLGFBQUEsS0FBQTs7OztJQUlBLEtBQUEsT0FBQSxXQUFBO1FBQ0EsT0FBQTs7OztBQUlBLFNBQUEsaUJBQUEsS0FBQTtJQUNBO0lBQ0EsSUFBQSxTQUFBOztJQUVBLE9BQUEsY0FBQTtJQUNBLE9BQUEsY0FBQTs7SUFFQSxPQUFBLFNBQUEsU0FBQSxPQUFBLE1BQUE7UUFDQSxPQUFBLElBQUE7Ozs7QUFJQSxTQUFBLFdBQUEsTUFBQSxPQUFBLElBQUEsaUJBQUE7SUFDQTtJQUNBLElBQUEsTUFBQSxTQUFBLElBQUEsTUFBQTtRQUNBLElBQUEsVUFBQSxrQkFBQSxPQUFBO1lBQ0EsU0FBQTs7UUFFQSxLQUFBLE9BQUEsS0FBQSxPQUFBLEdBQUEsZ0JBQUEsS0FBQSxNQUFBOztRQUVBLEtBQUEsYUFBQSxXQUFBO1lBQ0EsU0FBQTs7O1FBR0EsS0FBQSxVQUFBLFNBQUEsUUFBQTtZQUNBLElBQUEsVUFBQSxHQUFBO2dCQUNBLFNBQUEsVUFBQTs7WUFFQSxHQUFBLFVBQUEsT0FBQSxLQUFBLFVBQUEsWUFBQSxPQUFBLEtBQUEsVUFBQSxTQUFBLFlBQUEsS0FBQSxRQUFBLE9BQUEsS0FBQSxHQUFBO2dCQUNBLEtBQUEsTUFBQTs7Z0JBRUEsUUFBQSxRQUFBLE9BQUEsS0FBQSxVQUFBLFNBQUE7bUJBQ0E7Z0JBQ0EsS0FBQSxNQUFBO2dCQUNBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBO29CQUNBLFFBQUE7bUJBQ0EsS0FBQSxTQUFBLFVBQUE7b0JBQ0EsUUFBQSxRQUFBLFNBQUE7O29CQUVBLE9BQUEsS0FBQSxVQUFBLFdBQUE7d0JBQ0EsV0FBQSxLQUFBO3dCQUNBLE1BQUEsU0FBQTs7Ozs7WUFLQSxPQUFBLFFBQUE7OztRQUdBLEtBQUEsU0FBQSxTQUFBLFFBQUE7WUFDQSxPQUFBLE1BQUE7Z0JBQ0EsUUFBQTtnQkFDQSxLQUFBO2dCQUNBLE1BQUE7Ozs7UUFJQSxLQUFBLE9BQUEsU0FBQSxJQUFBO1lBQ0EsT0FBQSxNQUFBO2dCQUNBLFFBQUE7Z0JBQ0EsS0FBQSxVQUFBOzs7O1FBSUEsS0FBQSxTQUFBLFNBQUEsUUFBQTtZQUNBLE9BQUEsTUFBQTtnQkFDQSxRQUFBO2dCQUNBLEtBQUEsVUFBQSxPQUFBO2dCQUNBLE1BQUE7Ozs7UUFJQSxLQUFBLFNBQUEsU0FBQSxRQUFBO1lBQ0EsT0FBQSxNQUFBO2dCQUNBLFFBQUE7Z0JBQ0EsS0FBQSxVQUFBLE9BQUE7Z0JBQ0EsTUFBQTs7OztRQUlBLEtBQUEsbUJBQUEsU0FBQSxNQUFBO1lBQ0EsUUFBQSxTQUFBLE1BQUE7Z0JBQ0EsSUFBQSxXQUFBO29CQUNBO29CQUNBO29CQUNBLGtCQUFBOztnQkFFQSxLQUFBLFFBQUE7Z0JBQ0EsS0FBQSxRQUFBOztnQkFFQSxPQUFBLGVBQUEsTUFBQSxTQUFBO29CQUNBLEtBQUEsV0FBQTt3QkFDQSxPQUFBOztvQkFFQSxLQUFBLFNBQUEsVUFBQTt3QkFDQSxHQUFBLGFBQUEsT0FBQTs0QkFDQTs7O3dCQUdBLEtBQUEsTUFBQTt3QkFDQSxRQUFBO3dCQUNBLGtCQUFBOzs7O2dCQUlBLE9BQUEsZUFBQSxNQUFBLFdBQUE7b0JBQ0EsS0FB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UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7O0tBRUEsT0FBQSxXQUFBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIEdyaWRDb250cm9sbGVyKCR0aW1lb3V0LCAkbG9nLCAkc2NvcGUsICR0ZW1wbGF0ZVJlcXVlc3QsICRpbnRlcnBvbGF0ZSkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgR3JpZCA9IHRoaXM7XG4gICAgJHNjb3BlLlBhcmVudCA9ICRzY29wZS4kcGFyZW50O1xuXG4gICAgZnVuY3Rpb24gZ2V0Q29sdW1ucyhkYXRhKSB7XG4gICAgICAgIHZhciBjb2x1bW5EZWZpbml0aW9uID0gW10sXG4gICAgICAgICAgICBjb2x1bW5LZXlzID0gW10sXG4gICAgICAgICAgICBvdmVycmlkZGVuQ2VsbHMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmKEFycmF5LmlzQXJyYXkoZGF0YSkgJiYgR3JpZC5hdXRvQ29sdW1uICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKHJvdykge1xuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJvdykuZm9yRWFjaChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYocm93Lmhhc093blByb3BlcnR5KGNvbHVtbikgJiYgY29sdW1uS2V5cy5pbmRleE9mKGNvbHVtbikgPT09IC0xICYmIGNvbHVtbiAhPT0gJyQkaGFzaEtleScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdDb2x1bW4gPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbHVtbltHcmlkLmNvbHVtbktleV0gPSBjb2x1bW47XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdDb2x1bW5bR3JpZC5jb2x1bW5OYW1lXSA9IGNvbHVtbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uRGVmaW5pdGlvbi5wdXNoKG5ld0NvbHVtbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW5LZXlzLnB1c2goY29sdW1uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmKEdyaWQuc3RhdGUgJiYgQXJyYXkuaXNBcnJheShHcmlkLnN0YXRlLmdyaWRDb2x1bW5zKSkge1xuICAgICAgICAgICAgR3JpZC5zdGF0ZS5ncmlkQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICAgICAgICAgIGlmKGNvbHVtbltHcmlkLmNvbHVtbktleV0gPT09ICckJGhhc2hLZXknKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYoY29sdW1uLm92ZXJyaWRlVGVtcGxhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRlbXBsYXRlUmVxdWVzdChjb2x1bW4ub3ZlcnJpZGVUZW1wbGF0ZSkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlID0gJGludGVycG9sYXRlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uLm92ZXJyaWRlID0gZnVuY3Rpb24oY2VsbCwgY29sdW1uLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcm93SW5kZXhQYWdlID0gR3JpZC5kYXRhLmluZGV4T2Yocm93KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sSW5kZXggPSBjb2x1bW5EZWZpbml0aW9uLmxlbmd0aCAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd0luZGV4ID0gKEdyaWQuc3RhdGUucGFnZSAtIDEpICogR3JpZC5zdGF0ZS5wZXJQYWdlICsgcm93SW5kZXhQYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZWxsU2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihvdmVycmlkZGVuQ2VsbHNbY29sdW1uW0dyaWQuY29sdW1uS2V5XV0gJiYgb3ZlcnJpZGRlbkNlbGxzW2NvbHVtbltHcmlkLmNvbHVtbktleV1dW3Jvd0luZGV4UGFnZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG92ZXJyaWRkZW5DZWxsc1tjb2x1bW5bR3JpZC5jb2x1bW5LZXldXVtyb3dJbmRleFBhZ2VdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZWxsU2NvcGUgPSAkc2NvcGUuJG5ldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbGxTY29wZS4kaW5kZXggPSByb3dJbmRleCArIGNlbGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5leHRlbmQoY2VsbFNjb3BlLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb2xJbmRleDogY29sSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb3dJbmRleDogcm93SW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRpbmRleDogcm93SW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbGw6IGNlbGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3c6IHJvd1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSB0ZW1wbGF0ZShjZWxsU2NvcGUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIW92ZXJyaWRkZW5DZWxsc1tjb2x1bW5bR3JpZC5jb2x1bW5LZXldXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVycmlkZGVuQ2VsbHNbY29sdW1uW0dyaWQuY29sdW1uS2V5XV0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGRlbkNlbGxzW2NvbHVtbltHcmlkLmNvbHVtbktleV1dW3Jvd0luZGV4UGFnZV0gPSBlbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmKGNvbHVtbktleXMuaW5kZXhPZihjb2x1bW5bR3JpZC5jb2x1bW5LZXldKSA9PT0gLTEpIHsgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbkRlZmluaXRpb24ucHVzaChjb2x1bW4pO1xuICAgICAgICAgICAgICAgICAgICBjb2x1bW5LZXlzLnB1c2goY29sdW1uW0dyaWQuY29sdW1uS2V5XSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uRGVmaW5pdGlvbi5mb3JFYWNoKGZ1bmN0aW9uKGRlZmluZWRDb2x1bW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGRlZmluZWRDb2x1bW5bR3JpZC5jb2x1bW5LZXldID09PSBjb2x1bW5bR3JpZC5jb2x1bW5LZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoY29sdW1uKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluZWRDb2x1bW5bcHJvcGVydHldID0gY29sdW1uW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjb2x1bW5EZWZpbml0aW9uO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICAgICAgICB2YXIgcGVyUGFnZSA9IEdyaWQucGFnaW5hdGlvbiAhPT0gdHJ1ZSAmJiBHcmlkLnBhZ2luYXRpb24gIT09IHVuZGVmaW5lZCA/IEdyaWQucGFnaW5hdGlvbiA6IDIwO1xuICAgICAgICBHcmlkLnN0YXRlID0gR3JpZC5zdGF0ZSB8fCB7XG4gICAgICAgICAgICBzb3J0OiB1bmRlZmluZWQsXG4gICAgICAgICAgICBzb3J0RGlyZWN0aW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBwYWdlOiAxLFxuICAgICAgICAgICAgcGVyUGFnZTogR3JpZC5wYWdpbmF0aW9uICE9PSBmYWxzZSA/IHBlclBhZ2UgOiAwLFxuICAgICAgICAgICAgZ3JpZENvbHVtbnM6IFtdLFxuICAgICAgICAgICAgcmVmcmVzaDogZmFsc2VcbiAgICAgICAgfTtcblxuICAgICAgICBHcmlkLmNvbHVtbktleSA9IEdyaWQuY29sdW1uS2V5IHx8ICduYW1lJztcbiAgICAgICAgR3JpZC5jb2x1bW5OYW1lID0gR3JpZC5jb2x1bW5OYW1lIHx8ICdoZWFkZXInO1xuICAgICAgICBcbiAgICAgICAgR3JpZC5hcGkgPSB7XG4gICAgICAgICAgICByZWZyZXNoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmxvZygncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIEdyaWQuZ2V0RGF0YSh7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiBHcmlkLnN0YXRlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBhY3RpdmF0ZSgpO1xuICAgIH0pO1xuXG4gICAgR3JpZC5pc1NvcnRhYmxlID0gZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICAgIHJldHVybiBjb2x1bW4uc29ydGFibGUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBjb2x1bW4uc29ydGFibGU7XG4gICAgfTtcbiAgICBcbiAgICBHcmlkLmdldFZhbHVlID0gZnVuY3Rpb24ocm93LCBjb2x1bW4sIHJvd0luZGV4KSB7XG4gICAgICAgIHZhciBjZWxsO1xuICAgICAgICBpZihjb2x1bW4ub3ZlcnJpZGUpIHtcbiAgICAgICAgICAgIGNlbGwgPSBjb2x1bW4ub3ZlcnJpZGUocm93W2NvbHVtbltHcmlkLmNvbHVtbktleV1dLCBjb2x1bW4sIHJvdywgcm93SW5kZXgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2VsbCA9IHJvd1tjb2x1bW5bR3JpZC5jb2x1bW5LZXldXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNlbGw7XG4gICAgfTtcbiAgICBcbiAgICBHcmlkLnNvcnQgPSBmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgaWYoY29sdW1uLnNvcnRhYmxlICE9PSB1bmRlZmluZWQgJiYgIWNvbHVtbi5zb3J0YWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZihHcmlkLnN0YXRlLnNvcnQgPT09IGNvbHVtbltHcmlkLmNvbHVtbktleV0pIHtcbiAgICAgICAgICAgIGlmKEdyaWQuc3RhdGUuc29ydERpcmVjdGlvbiA9PT0gJ0RFU0MnKSB7XG4gICAgICAgICAgICAgICAgR3JpZC5zdGF0ZS5zb3J0RGlyZWN0aW9uID0gJ0FTQyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIEdyaWQuc3RhdGUuc29ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBHcmlkLnN0YXRlLnNvcnREaXJlY3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBHcmlkLnN0YXRlLnNvcnQgPSBjb2x1bW5bR3JpZC5jb2x1bW5LZXldO1xuICAgICAgICAgICAgR3JpZC5zdGF0ZS5zb3J0RGlyZWN0aW9uID0gJ0RFU0MnO1xuICAgICAgICB9XG4gICAgfTtcbiAgICAgICAgXG4gICAgJHNjb3BlLiR3YXRjaCgnR3JpZC5zdGF0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZihHcmlkLnN0YXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIEdyaWQuZ2V0RGF0YSh7XG4gICAgICAgICAgICAgICAgc3RhdGU6IEdyaWQuc3RhdGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSwgdHJ1ZSk7XG4gICAgXG4gICAgJHNjb3BlLiR3YXRjaCgnR3JpZC5kYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIEdyaWQuZGF0YSA9IEdyaWQuZGF0YSB8fCBbXTtcbiAgICAgICAgR3JpZC5jb2x1bW5EZWZpbml0aW9uID0gZ2V0Q29sdW1ucyhHcmlkLmRhdGEpO1xuICAgICAgICBHcmlkLnJvd3MgPSBHcmlkLmRhdGE7XG4gICAgfSwgdHJ1ZSk7XG59XG5cbmFuZ3VsYXIubW9kdWxlKCdtdmwuZ3JpZCcsIFsndWkuYm9vdHN0cmFwJywgJ25nU2FuaXRpemUnXSlcbiAgICAuY29udHJvbGxlcignR3JpZENvbnRyb2xsZXInLCBHcmlkQ29udHJvbGxlcilcbiAgICAuY29tcG9uZW50KCdncmlkJywge1xuICAgICAgICBjb250cm9sbGVyOiAnR3JpZENvbnRyb2xsZXIgYXMgR3JpZCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9ncmlkL2dyaWQuaHRtbCcsXG4gICAgICAgIGJpbmRpbmdzOiB7XG4gICAgICAgICAgICBkYXRhOiAnPCcsXG4gICAgICAgICAgICBzdGF0ZTogJzwnLFxuICAgICAgICAgICAgZ2V0RGF0YTogJyYnLFxuICAgICAgICAgICAgY29sdW1uS2V5OiAnQCcsXG4gICAgICAgICAgICBjb2x1bW5OYW1lOiAnQCcsXG4gICAgICAgICAgICBhdXRvQ29sdW1uOiAnPCcsXG4gICAgICAgICAgICBwYWdpbmF0aW9uOiAnPT8nLFxuICAgICAgICAgICAgZ2V0Q2xhc3Nlc0ZvclJvdzogJz0nLFxuICAgICAgICAgICAgYXBpOiAnPT8nXG4gICAgICAgIH1cbiAgICB9KVxuICAgIC5kaXJlY3RpdmUoJ2NlbGxWYWx1ZScsIGZ1bmN0aW9uKCRjb21waWxlKSB7XG4gICAgICAgICd1c2Ugc3RyaWN0JztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cmlidXRlcykge1xuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlLiRldmFsKGF0dHJpYnV0ZXMuY2VsbFZhbHVlKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5odG1sKHZhbHVlKTtcbiAgICBcbiAgICAgICAgICAgICAgICAkY29tcGlsZShlbGVtZW50LmNvbnRlbnRzKCkpKHNjb3BlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH0pO1xuIiwiZnVuY3Rpb24gTmF2YmFyQ29udHJvbGxlcihNb2R1bGVTdGF0ZXMsICRzdGF0ZSwgJGh0dHAsICR3aW5kb3cpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIE5hdmJhciA9IHRoaXM7XG4gICAgXG4gICAgTmF2YmFyLmlzQWN0aXZlID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gICAgICAgIHJldHVybiAkc3RhdGUuaW5jbHVkZXMobW9kdWxlLmFjdGl2ZVN0YXRlIHx8IG1vZHVsZS5uYW1lKTtcbiAgICB9O1xuICAgIFxuICAgIGlmKCR3aW5kb3cubG9jYWxTdG9yYWdlKSB7XG4gICAgICAgIE5hdmJhci5hY2NvdW50TmFtZSA9ICR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JlZ2lzdGVyZWRBY2NvdW50Jyk7XG4gICAgICAgIGlmKE5hdmJhci5hY2NvdW50TmFtZSkge1xuICAgICAgICAgICAgTmF2YmFyLnJlZ2lzdGVyZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIE5hdmJhci51bmRvU3RvcmFnZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZigkd2luZG93LmxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgJHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncmVnaXN0ZXJlZEFjY291bnQnLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgTmF2YmFyLmFjY291bnROYW1lID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgTmF2YmFyLnJlZ2lzdGVyZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgTmF2YmFyLnJlZ2lzdGVyQWNjb3VudCA9IGZ1bmN0aW9uKGFjY291bnROYW1lKSB7XG4gICAgICAgICRodHRwLmdldCgnaHR0cDovL3NzZi5wb2VsYWRkZXIuY29tL3NpZ251cC8nICsgYWNjb3VudE5hbWUpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBOYXZiYXIucmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgICAgICAgICBpZigkd2luZG93LmxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgICAgICR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JlZ2lzdGVyZWRBY2NvdW50JywgYWNjb3VudE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFxuICAgIE5hdmJhci5Nb2R1bGVTdGF0ZXMgPSBNb2R1bGVTdGF0ZXM7XG59XG5cbmFuZ3VsYXIubW9kdWxlKCdwb2UubmF2YmFyJywgWydzeXN0ZW0nLCAndWkucm91dGVyJ10pXG4gICAgLmNvbnRyb2xsZXIoJ05hdmJhckNvbnRyb2xsZXInLCBOYXZiYXJDb250cm9sbGVyKVxuICAgIC5jb21wb25lbnQoJ25hdmJhcicsIHtcbiAgICAgICAgY29udHJvbGxlcjogJ05hdmJhckNvbnRyb2xsZXIgYXMgTmF2YmFyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL25hdmJhci9uYXZiYXIuaHRtbCdcbiAgICB9KTsiLCJmdW5jdGlvbiBTdGF0dXNMaWdodENvbnRyb2xsZXIoKSB7XG4gICAgdmFyIFN0YXR1c0xpZ2h0ID0gdGhpcztcbiAgICBcbiAgICB2YXIgc3RhdHVzVG9Db2xvciA9IHtcbiAgICAgICAgdW5rbm93bjogJyNlZWUnLFxuICAgICAgICBvazogJyM1Y2I4NWMnLFxuICAgICAgICBub3RpY2U6ICcjZmVmZjc4JyxcbiAgICAgICAgd2FybmluZzogJyNmMGFkNGUnLFxuICAgICAgICBkYW5nZXI6ICcjZDk1MzRmJ1xuICAgIH07XG4gICAgXG4gICAgU3RhdHVzTGlnaHQuc3R5bGUgPSB7XG4gICAgICAgICdiYWNrZ3JvdW5kLWNvbG9yJzogc3RhdHVzVG9Db2xvcltTdGF0dXNMaWdodC5zdGF0dXNdIHx8ICd0cmFuc3BhcmVudCdcbiAgICB9O1xufVxuXG5hbmd1bGFyLm1vZHVsZSgnbXZsLnN0YXR1c2xpZ2h0JywgW10pXG4uY29udHJvbGxlcignU3RhdHVzTGlnaHRDb250cm9sbGVyJywgU3RhdHVzTGlnaHRDb250cm9sbGVyKVxuLmNvbXBvbmVudCgnc3RhdHVzTGlnaHQnLCB7XG4gICAgICAgIGNvbnRyb2xsZXI6ICdTdGF0dXNMaWdodENvbnRyb2xsZXIgYXMgU3RhdHVzTGlnaHQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvc3RhdHVzLWxpZ2h0L3N0YXR1cy1saWdodC5odG1sJyxcbiAgICAgICAgYmluZGluZ3M6IHtcbiAgICAgICAgICAgICdzdGF0dXMnOiAnPCdcbiAgICAgICAgfVxuICAgIH0pOyIsIi8qZ2xvYmFsIGNvbnNvbGUgKi9cbmZ1bmN0aW9uIE1vZHVsZVN0YXRlc1Byb3ZpZGVyKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBtb2R1bGVzID0gW10sXG4gICAgICAgIG1vZHVsZVN0YXRlcyA9IFtdO1xuXG4gICAgdGhpcy5yZWdpc3Rlck1vZHVsZSA9IGZ1bmN0aW9uKG5hbWUsIHN0YXRlcykge1xuICAgICAgICBpZihtb2R1bGVzW25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignTW9kdWxlIGFscmVhZHkgcmVnaXN0ZXJlZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBtb2R1bGVzLnB1c2gobmFtZSk7XG4gICAgICAgIFxuICAgICAgICBzdGF0ZXMuZm9yRWFjaChmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgICAgICAgaWYobW9kdWxlU3RhdGVzLmluZGV4T2Yoc3RhdGUpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignU3RhdGUgYWxyZWFkeSByZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlci5zdGF0ZShzdGF0ZS5uYW1lLCBzdGF0ZS5zdGF0ZSk7XG4gICAgICAgICAgICBtb2R1bGVTdGF0ZXMucHVzaChzdGF0ZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLiRnZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1vZHVsZVN0YXRlcztcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBTeXN0ZW1Db250cm9sbGVyKEFQSSkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgU3lzdGVtID0gdGhpcztcbiAgICAgICAgXG4gICAgU3lzdGVtLnNob3dpbmdTaWRlID0gZmFsc2U7XG4gICAgU3lzdGVtLnNob3dpbmdNZW51ID0gdHJ1ZTtcbiAgICBcbiAgICBTeXN0ZW0uZ2V0QVBJID0gZnVuY3Rpb24gZ2V0QVBJKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIEFQSShuYW1lKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBBUElGYWN0b3J5KCRsb2csICRodHRwLCAkcSwgQVBJQmFzZUxvY2F0aW9uKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBBUEkgPSBmdW5jdGlvbiBBUEkobmFtZSkge1xuICAgICAgICB2YXIgYmFzZVVSTCA9IEFQSUJhc2VMb2NhdGlvbiArIG5hbWUgKyAnLycsXG4gICAgICAgICAgICBjYWNoZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnNsaWNlKDEpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5jbGVhckNhY2hlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYWNoZXMgPSBbXTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucmVhZEFsbCA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSAkcS5kZWZlcigpLFxuICAgICAgICAgICAgICAgIHBhcmFtcyA9IGZpbHRlciB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYoY2FjaGVzICYmIGNhY2hlc1tKU09OLnN0cmluZ2lmeShwYXJhbXMpXSAmJiBjYWNoZXNbSlNPTi5zdHJpbmdpZnkocGFyYW1zKV0udGltZXN0YW1wID4gRGF0ZS5ub3coKSAtIDEwMDAgKiA2MCAqIDUpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCd1cCB0byBkYXRlIGNhY2hlLCB1c2luZyBpbnN0ZWFkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVxdWVzdC5yZXNvbHZlKGNhY2hlc1tKU09OLnN0cmluZ2lmeShwYXJhbXMpXS5yb3dzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnZ2V0dGluZyBmcmVzaCBkYXRhJyk7XG4gICAgICAgICAgICAgICAgJGh0dHAoe1xuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGJhc2VVUkwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogcGFyYW1zXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LnJlc29sdmUocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjYWNoZXNbSlNPTi5zdHJpbmdpZnkocGFyYW1zKV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICAgICAgICAgICAgICAgICAgICByb3dzOiByZXNwb25zZS5kYXRhXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0LnByb21pc2U7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICB1cmw6IGJhc2VVUkwsXG4gICAgICAgICAgICAgICAgZGF0YTogb2JqZWN0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucmVhZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAoe1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgdXJsOiBiYXNlVVJMICsgaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgICAgICAgICB1cmw6IGJhc2VVUkwgKyBvYmplY3QuaWQsXG4gICAgICAgICAgICAgICAgZGF0YTogb2JqZWN0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAoe1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICAgICAgdXJsOiBiYXNlVVJMICsgb2JqZWN0LmlkLFxuICAgICAgICAgICAgICAgIGRhdGE6IG9iamVjdFxuICAgICAgICAgICAgfSk7ICAgICAgICAgICAgXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmdldFRhYmxlUmVzb3VyY2UgPSBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICByZXR1cm4gKGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzb3VyY2UgPSB0aGlzLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcixcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJCeSxcbiAgICAgICAgICAgICAgICAgICAgcGFnaW5hdGlvbkNhY2hlID0ge307XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydCA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5saW1pdCA9IDI1O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnb3JkZXInLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3JkZXI7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24obmV3T3JkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG5ld09yZGVyID09PSBvcmRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnbmV3IG9yZGVyLCBjbGVhcmluZyBjYWNoZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3JkZXIgPSBuZXdPcmRlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2luYXRpb25DYWNoZSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdvcmRlckJ5Jywge1xuICAgICAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yZGVyQnk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24obmV3T3JkZXJCeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobmV3T3JkZXJCeSA9PT0gb3JkZXJCeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZygnbmV3IG9yZGVyYnksIGNsZWFyaW5nIGNhY2hlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcmRlckJ5ID0gbmV3T3JkZXJCeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2luYXRpb25DYWNoZSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5nZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyhwYWdpbmF0aW9uQ2FjaGUpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYocGFnaW5hdGlvbkNhY2hlW3Jlc291cmNlLmxpbWl0XSAhPT0gdW5kZWZpbmVkICYmIHBhZ2luYXRpb25DYWNoZVtyZXNvdXJjZS5saW1pdF1bcmVzb3VyY2Uuc3RhcnRdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcocmVzb3VyY2UubGltaXQsIHJlc291cmNlLnN0YXJ0LCAnY2FjaGVkLCBsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHBhZ2luYXRpb25DYWNoZVtyZXNvdXJjZS5saW1pdF1bcmVzb3VyY2Uuc3RhcnRdKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2cuZGVidWcocmVzb3VyY2UubGltaXQsIHJlc291cmNlLnN0YXJ0LCAnbm90IGNhY2hlZCwgbG9hZGluZycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgQVBJLmRvVGFzayh0YXNrLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHJlc291cmNlLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbWl0OiByZXNvdXJjZS5saW1pdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3J0OiByZXNvdXJjZS5vcmRlckJ5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcjogcmVzb3VyY2Uub3JkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2luYXRpb25DYWNoZVtyZXNvdXJjZS5saW1pdF0gPSBwYWdpbmF0aW9uQ2FjaGVbcmVzb3VyY2UubGltaXRdIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2luYXRpb25DYWNoZVtyZXNvdXJjZS5saW1pdF1bcmVzb3VyY2Uuc3RhcnRdID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJlYXNvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0odGFzaykpO1xuICAgICAgICB9O1xuICAgIH0sXG4gICAgQVBJcyA9IHt9O1xuXG4gICAgICAgIFxuICAgIHJldHVybiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIGlmKEFQSXNbbmFtZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgQVBJc1tuYW1lXSA9IG5ldyBBUEkobmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEFQSXNbbmFtZV07XG4gICAgfTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3N5c3RlbScsIFsndWkucm91dGVyJ10pXG4gICAgLmNvbnN0YW50KCdBUElCYXNlTG9jYXRpb24nLCAnQVBJLycpXG4gICAgLnNlcnZpY2UoJ1N5c3RlbScsIFN5c3RlbUNvbnRyb2xsZXIpXG4gICAgLnByb3ZpZGVyKCdNb2R1bGVTdGF0ZXMnLCBNb2R1bGVTdGF0ZXNQcm92aWRlcilcbiAgICAuZmFjdG9yeSgnQVBJJywgQVBJRmFjdG9yeSk7IiwiZnVuY3Rpb24gQWNjb3VudHNDb25maWcoTW9kdWxlU3RhdGVzUHJvdmlkZXIpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgTW9kdWxlU3RhdGVzUHJvdmlkZXIucmVnaXN0ZXJNb2R1bGUoJ0FjY291bnRzJywgW1xuICAgICAgICB7XG4gICAgICAgICAgICBzaG93SW5NZW51OiB0cnVlLFxuICAgICAgICAgICAgbWVudU5hbWU6ICdBY2NvdW50cycsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtdXNlcnMgZmEtZncnLFxuICAgICAgICAgICAgbmFtZTogJ2FjY291bnRzJyxcbiAgICAgICAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgICAgICAgc3RhdGU6IHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvYWNjb3VudHMnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgICdAJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdtb2R1bGVzL2FjY291bnRzL2FjY291bnRzLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0FjY291bnRzQ29udHJvbGxlciBhcyBBY2NvdW50cydcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF0pO1xufVxuXG5mdW5jdGlvbiBBY2NvdW50c0NvbnRyb2xsZXIoU3lzdGVtLCAkbG9nLCAkZmlsdGVyLCAkaHR0cCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgQWNjb3VudHMgPSB0aGlzO1xuICAgIHZhciBhbGxBY2NvdW50cyA9IFtdO1xuICAgIHZhciBncmlkU3RhdGU7XG4gICAgJGxvZy5kZWJ1ZyhBY2NvdW50cyk7XG4gICAgXG4gICAgZnVuY3Rpb24gZG9GaWx0ZXIoKSB7XG4gICAgICAgIGdyaWRTdGF0ZS50b3RhbCA9IGFsbEFjY291bnRzLmxlbmd0aDtcbiAgICAgICAgQWNjb3VudHMubGlzdCA9IGFsbEFjY291bnRzLnNsaWNlKChncmlkU3RhdGUucGFnZSAtIDEpICogZ3JpZFN0YXRlLnBlclBhZ2UsIGdyaWRTdGF0ZS5wYWdlICogZ3JpZFN0YXRlLnBlclBhZ2UpO1xuICAgIH1cbiAgICBcbiAgICAkaHR0cC5nZXQoJ2FjY291bnRzLnBocCcpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgYWxsQWNjb3VudHMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICBkb0ZpbHRlcigpO1xuICAgIH0pO1xuICAgIFxuICAgIHZhciBjb2x1bW5zID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdBY2NvdW50cycsXG4gICAgICAgICAgICBuYW1lOiAnbmFtZScsXG4gICAgICAgICAgICBvdmVycmlkZTogZnVuY3Rpb24gKGNlbGwsIGNvbHVtbiwgcm93KSB7XG4gICAgICAgICAgICAgICAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiAnPGEgaHJlZj1cIicgKyByb3cuYWNjb3VudF91cmwgKyAnXCIgdGFyZ2V0PVwiX2JsYW5rXCI+JyArIGNlbGwgKyAnPC9hPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdhY2NvdW50X3VybCcsXG4gICAgICAgICAgICBoaWRkZW46IHRydWVcbiAgICAgICAgfVxuICAgIF07XG4gICAgXG4gICAgQWNjb3VudHMuZ2V0QWNjb3VudHMgPSBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgICB2YXIgc29ydCA9IHN0YXRlLnNvcnQ7XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBzdGF0ZS5zb3J0RGlyZWN0aW9uIHx8ICdERVNDJztcbiAgICAgICAgXG4gICAgICAgIGdyaWRTdGF0ZSA9IHN0YXRlO1xuICAgICAgICBcbiAgICAgICAgYWxsQWNjb3VudHMgPSAkZmlsdGVyKCdvcmRlckJ5JykoYWxsQWNjb3VudHMsIHNvcnQsIGRpcmVjdGlvbiA9PT0gJ0RFU0MnKTtcbiAgICAgICAgXG4gICAgICAgIGRvRmlsdGVyKCk7XG4gICAgICAgIHN0YXRlLmdyaWRDb2x1bW5zID0gY29sdW1ucztcbiAgICB9O1xufVxuXG5hbmd1bGFyLm1vZHVsZSgncG9lLmFjY291bnRzJywgWydzeXN0ZW0nXSlcbiAgICAuY29udHJvbGxlcignQWNjb3VudHNDb250cm9sbGVyJywgQWNjb3VudHNDb250cm9sbGVyKVxuICAgIC5jb25maWcoQWNjb3VudHNDb25maWcpOyIsImZ1bmN0aW9uIExhZGRlckNvbmZpZyhNb2R1bGVTdGF0ZXNQcm92aWRlcikge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBNb2R1bGVTdGF0ZXNQcm92aWRlci5yZWdpc3Rlck1vZHVsZSgnTGFkZGVyJywgW1xuICAgICAgICB7XG4gICAgICAgICAgICBzaG93SW5NZW51OiB0cnVlLFxuICAgICAgICAgICAgbWVudU5hbWU6ICdMYWRkZXInLFxuICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWJhci1jaGFydCBmYS1mdycsXG4gICAgICAgICAgICBuYW1lOiAnbGFkZGVyJyxcbiAgICAgICAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgICAgICAgc3RhdGU6IHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmZpbHRlcicsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0AnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvbGFkZGVyL2xhZGRlci5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdMYWRkZXJDb250cm9sbGVyIGFzIExhZGRlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF0pO1xufVxuXG5mdW5jdGlvbiBMYWRkZXJDb250cm9sbGVyKCRsb2csICRodHRwLCAkZmlsdGVyLCAkc2NvcGUsICRzdGF0ZVBhcmFtcykge1xuICAgIHZhciBMYWRkZXIgPSB0aGlzO1xuICAgIHZhciBhbGxDaGFyYWN0ZXJzID0gW107XG4gICAgdmFyIGdyaWRTdGF0ZTtcbiAgICAkbG9nLmRlYnVnKCRzdGF0ZVBhcmFtcy5maWx0ZXIpO1xuICAgIFxuICAgIExhZGRlci5maWx0ZXIgPSAkc3RhdGVQYXJhbXMuZmlsdGVyO1xuICAgIFxuICAgIGZ1bmN0aW9uIGRvRmlsdGVyKCkge1xuICAgICAgICBpZighYWxsQ2hhcmFjdGVycy5sZW5ndGggfHwgIWdyaWRTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgZmlsdGVyZWRDaGFyYWN0ZXJzID0gYWxsQ2hhcmFjdGVycztcbiAgICAgICAgXG4gICAgICAgIGlmKExhZGRlci5maWx0ZXIpIHtcbiAgICAgICAgICAgIGZpbHRlcmVkQ2hhcmFjdGVycyA9ICRmaWx0ZXIoJ2ZpbHRlcicpKGFsbENoYXJhY3RlcnMsIExhZGRlci5maWx0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBncmlkU3RhdGUudG90YWwgPSBmaWx0ZXJlZENoYXJhY3RlcnMubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgTGFkZGVyLmNoYXJhY3RlcnMgPSBmaWx0ZXJlZENoYXJhY3RlcnMuc2xpY2UoKGdyaWRTdGF0ZS5wYWdlIC0gMSkgKiBncmlkU3RhdGUucGVyUGFnZSwgZ3JpZFN0YXRlLnBhZ2UgKiBncmlkU3RhdGUucGVyUGFnZSk7XG4gICAgfVxuICAgIFxuICAgICRodHRwLmdldCgnc2NyYXBlci5waHAnKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIGFsbENoYXJhY3RlcnMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICBkb0ZpbHRlcigpO1xuICAgIH0pO1xuICAgIFxuICAgICRodHRwLmdldCgnbWV0YS5waHAnKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIExhZGRlci5zdGF0dXMgPSByZXNwb25zZS5kYXRhLnN0YXR1cyArICcgJztcbiAgICAgICAgTGFkZGVyLmxhc3RVcGRhdGVUaW1lID0gcmVzcG9uc2UuZGF0YS5sYXN0X2xhZGRlcl91cGRhdGUgKyAnMDAwJztcbiAgICAgICAgTGFkZGVyLmxhc3RQcm9jZXNzVGltZSA9IHJlc3BvbnNlLmRhdGEubGFzdF9wcm9jZXNzX3RpbWU7XG4gICAgfSk7XG4gICAgXG4gICAgdmFyIGNvbHVtbnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ1JhbmsnLFxuICAgICAgICAgICAgbmFtZTogJ3JhbmsnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ0NsYXNzJyxcbiAgICAgICAgICAgIG5hbWU6ICdjbGFzcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnTGV2ZWwnLFxuICAgICAgICAgICAgbmFtZTogJ2xldmVsJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdFeHBlcmllbmNlJyxcbiAgICAgICAgICAgIG5hbWU6ICdleHBlcmllbmNlJyxcbiAgICAgICAgICAgIG92ZXJyaWRlOiBmdW5jdGlvbihjZWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRmaWx0ZXIoJ251bWJlcicpKGNlbGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdTdGF0dXMnLFxuICAgICAgICAgICAgbmFtZTogJ3N0YXR1cycsXG4gICAgICAgICAgICBvdmVycmlkZTogZnVuY3Rpb24oY2VsbCwgY29sdW1uLCByb3csIHJvd0luZGV4KSB7XG4gICAgICAgICAgICAgICAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICAgICAgICAgICAgICAgIGlmKGNlbGwgPT09ICdEZWFkJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2VsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICc8c3RhdHVzLWxpZ2h0IHN0YXR1cz1cIlxcJycgKyAoY2VsbCA9PT0gJ29mZmxpbmUnID8gJ2RhbmdlcicgOiAnb2snKSArICdcXCdcIj48L3N0YXR1cy1saWdodD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdFeHBlcmllbmNlIGdhaW5lZCBsYXN0IGhvdXIgKEFwcHJveC4pJyxcbiAgICAgICAgICAgIG5hbWU6ICdleHBlcmllbmNlX2xhc3RfaG91cicsXG4gICAgICAgICAgICBvdmVycmlkZTogZnVuY3Rpb24oY2VsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkZmlsdGVyKCdudW1iZXInKShjZWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnTmFtZScsXG4gICAgICAgICAgICBuYW1lOiAnbmFtZScsXG4gICAgICAgICAgICBvdmVycmlkZTogZnVuY3Rpb24gKGNlbGwsIGNvbHVtbiwgcm93KSB7XG4gICAgICAgICAgICAgICAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiAnPGEgaHJlZj1cIicgKyByb3cuYWNjb3VudF91cmwgKyAnXCIgdGFyZ2V0PVwiX2JsYW5rXCI+JyArIGNlbGwgKyAnPC9hPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdhY2NvdW50X3VybCcsXG4gICAgICAgICAgICBoaWRkZW46IHRydWVcbiAgICAgICAgfVxuICAgIF07XG4gICAgXG4gICAgJHNjb3BlLiR3YXRjaCgnTGFkZGVyLmZpbHRlcicsIGZ1bmN0aW9uKG5ld1ZhbHVlKSB7XG4gICAgICAgIGlmKG5ld1ZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBkb0ZpbHRlcigpO1xuICAgIH0pO1xuICAgIFxuICAgIExhZGRlci5nZXRDaGFyYWN0ZXJzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgdmFyIHNvcnQgPSBzdGF0ZS5zb3J0IHx8ICdyYW5rJztcbiAgICAgICAgdmFyIGRpcmVjdGlvbiA9IHN0YXRlLnNvcnREaXJlY3Rpb24gfHwgJ0FTQyc7XG4gICAgICAgIFxuICAgICAgICBncmlkU3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGlmKHNvcnQgPT09ICdleHBlcmllbmNlJyB8fCBzb3J0ID09PSAnbGV2ZWwnKSB7XG4gICAgICAgICAgICBzb3J0ID0gWydsZXZlbCcsICdleHBlcmllbmNlJ107XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGFsbENoYXJhY3RlcnMgPSAkZmlsdGVyKCdvcmRlckJ5JykoYWxsQ2hhcmFjdGVycywgc29ydCwgZGlyZWN0aW9uID09PSAnREVTQycpO1xuICAgICAgICBcbiAgICAgICAgZG9GaWx0ZXIoKTtcbiAgICAgICAgc3RhdGUuZ3JpZENvbHVtbnMgPSBjb2x1bW5zO1xuICAgIH07XG4gICAgXG4gICAgTGFkZGVyLmdldENsYXNzZXNGb3JSb3cgPSBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgaWYocm93LnN0YXR1cyA9PT0gJ0RlYWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2RlYWQnO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3BvZS5sYWRkZXInLCBbJ3N5c3RlbScsICd1aS5ib290c3RyYXAnLCAnbXZsLmdyaWQnLCAnbXZsLnN0YXR1c2xpZ2h0J10pXG4gICAgLmNvbnRyb2xsZXIoJ0xhZGRlckNvbnRyb2xsZXInLCBMYWRkZXJDb250cm9sbGVyKVxuICAgIC5jb25maWcoTGFkZGVyQ29uZmlnKVxuICAgIC5maWx0ZXIoJ3NlY29uZHNUb0RhdGVUaW1lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihzZWNvbmRzKSB7XG4gICAgICAgICAgICBpZihzZWNvbmRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2Vjb25kcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkID0gbmV3IERhdGUoMCwwLDAsMCwwLDAsMCk7XG4gICAgICAgICAgICBkLnNldFNlY29uZHMoc2Vjb25kcyk7XG4gICAgICAgICAgICByZXR1cm4gZC5nZXRUaW1lKCk7XG4gICAgICAgIH07XG4gICAgfSk7IiwiZnVuY3Rpb24gUnVsZXNDb25maWcoTW9kdWxlU3RhdGVzUHJvdmlkZXIpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgTW9kdWxlU3RhdGVzUHJvdmlkZXIucmVnaXN0ZXJNb2R1bGUoJ1J1bGVzJywgW1xuICAgICAgICB7XG4gICAgICAgICAgICBzaG93SW5NZW51OiB0cnVlLFxuICAgICAgICAgICAgbWVudU5hbWU6ICdSdWxlcycsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtbGlzdC1vbCBmYS1mdycsXG4gICAgICAgICAgICBuYW1lOiAncnVsZXMnLFxuICAgICAgICAgICAgcHJpb3JpdHk6IDIsXG4gICAgICAgICAgICBzdGF0ZToge1xuICAgICAgICAgICAgICAgIHVybDogJy9ydWxlcycsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0AnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvcnVsZXMvcnVsZXMuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF0pO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgncG9lLnJ1bGVzJywgW10pXG4gICAgLmNvbmZpZyhSdWxlc0NvbmZpZyk7IiwiZnVuY3Rpb24gQXBwQ29uZmlnKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvZ1Byb3ZpZGVyKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAkbG9nUHJvdmlkZXIuZGVidWdFbmFibGVkKHRydWUpO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgncG9lbGFkZGVyJywgW1xuICAgICAgICAndWkucm91dGVyJyxcbiAgICAgICAgJ3RlbXBsYXRlcycsXG4gICAgICAgICdzeXN0ZW0nLFxuICAgICAgICAncG9lLm5hdmJhcicsXG4gICAgICAgICdwb2UuYWNjb3VudHMnLFxuICAgICAgICAncG9lLnJ1bGVzJyxcbiAgICAgICAgJ3BvZS5sYWRkZXInXG4gICAgXSlcbiAgICAuY29uZmlnKEFwcENvbmZpZyk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
