
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
        if(!allCharacters.length) {
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
            name: 'experience'
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
            name: 'experience_last_hour'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbXBvbmVudHMvZ3JpZC9ncmlkLmpzIiwiY29tcG9uZW50cy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tcG9uZW50cy9zdGF0dXMtbGlnaHQvc3RhdHVzLWxpZ2h0LmpzIiwiY29tcG9uZW50cy9zeXN0ZW0vc3lzdGVtLmpzIiwibW9kdWxlcy9hY2NvdW50cy9hY2NvdW50cy5qcyIsIm1vZHVsZXMvbGFkZGVyL2xhZGRlci5qcyIsIm1vZHVsZXMvcnVsZXMvcnVsZXMuanMiLCJhcHAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7MkRBQUEsU0FBQSxlQUFBLFVBQUEsTUFBQSxRQUFBLGtCQUFBLGNBQUE7SUFDQTtJQUNBLElBQUEsT0FBQTtJQUNBLE9BQUEsU0FBQSxPQUFBOztJQUVBLFNBQUEsV0FBQSxNQUFBO1FBQ0EsSUFBQSxtQkFBQTtZQUNBLGFBQUE7WUFDQSxrQkFBQTs7UUFFQSxHQUFBLE1BQUEsUUFBQSxTQUFBLEtBQUEsZUFBQSxPQUFBO1lBQ0EsS0FBQSxRQUFBLFNBQUEsS0FBQTtnQkFDQSxPQUFBLEtBQUEsS0FBQSxRQUFBLFNBQUEsUUFBQTtvQkFDQSxHQUFBLElBQUEsZUFBQSxXQUFBLFdBQUEsUUFBQSxZQUFBLENBQUEsS0FBQSxXQUFBLGFBQUE7d0JBQ0EsSUFBQSxZQUFBO3dCQUNBLFVBQUEsS0FBQSxhQUFBO3dCQUNBLFVBQUEsS0FBQSxjQUFBOzt3QkFFQSxpQkFBQSxLQUFBO3dCQUNBLFdBQUEsS0FBQTs7Ozs7O1FBTUEsR0FBQSxLQUFBLFNBQUEsTUFBQSxRQUFBLEtBQUEsTUFBQSxjQUFBO1lBQ0EsS0FBQSxNQUFBLFlBQUEsUUFBQSxTQUFBLFFBQUE7Z0JBQ0EsR0FBQSxPQUFBLEtBQUEsZUFBQSxhQUFBO29CQUNBOzs7Z0JBR0EsR0FBQSxPQUFBLGtCQUFBO29CQUNBLGlCQUFBLE9BQUEsa0JBQUEsS0FBQSxTQUFBLFVBQUE7d0JBQ0EsSUFBQSxXQUFBLGFBQUE7O3dCQUVBLE9BQUEsV0FBQSxTQUFBLE1BQUEsUUFBQSxLQUFBOzRCQUNBLElBQUEsZUFBQSxLQUFBLEtBQUEsUUFBQTtnQ0FDQSxXQUFBLGlCQUFBLFNBQUE7Z0NBQ0EsV0FBQSxDQUFBLEtBQUEsTUFBQSxPQUFBLEtBQUEsS0FBQSxNQUFBLFVBQUE7Z0NBQ0E7Z0NBQ0E7OzRCQUVBLEdBQUEsZ0JBQUEsT0FBQSxLQUFBLGVBQUEsZ0JBQUEsT0FBQSxLQUFBLFlBQUEsZUFBQTtnQ0FDQSxPQUFBLGdCQUFBLE9BQUEsS0FBQSxZQUFBOzs7NEJBR0EsWUFBQSxPQUFBOzRCQUNBLFVBQUEsU0FBQSxXQUFBOzs0QkFFQSxRQUFBLE9BQUEsV0FBQTtnQ0FDQSxXQUFBO2dDQUNBLFdBQUE7Z0NBQ0EsUUFBQTtnQ0FDQSxNQUFBO2dDQUNBLFFBQUE7Z0NBQ0EsS0FBQTs7OzRCQUdBLFVBQUEsU0FBQTs7NEJBRUEsR0FBQSxDQUFBLGdCQUFBLE9BQUEsS0FBQSxhQUFBO2dDQUNBLGdCQUFBLE9BQUEsS0FBQSxjQUFBOzs7NEJBR0EsZ0JBQUEsT0FBQSxLQUFBLFlBQUEsZ0JBQUE7OzRCQUVBLE9BQUE7Ozs7O2dCQUtBLEdBQUEsV0FBQSxRQUFBLE9BQUEsS0FBQSxnQkFBQSxDQUFBLEdBQUE7b0JBQ0EsaUJBQUEsS0FBQTtvQkFDQSxXQUFBLEtBQUEsT0FBQSxLQUFBO3VCQUNBO29CQUNBLGlCQUFBLFFBQUEsU0FBQSxlQUFBO3dCQUNBLEdBQUEsY0FBQSxLQUFBLGVBQUEsT0FBQSxLQUFBLFlBQUE7NEJBQ0EsT0FBQSxLQUFBLFFBQUEsUUFBQSxTQUFBLFVBQUE7Z0NBQ0EsY0FBQSxZQUFBLE9BQUE7Ozs7Ozs7O1FBUUEsT0FBQTs7O0lBR0EsU0FBQSxXQUFBO1FBQ0EsSUFBQSxVQUFBLEtBQUEsZUFBQSxRQUFBLEtBQUEsZUFBQSxZQUFBLEtBQUEsYUFBQTtRQUNBLEtBQUEsUUFBQSxLQUFBLFNBQUE7WUFDQSxNQUFBO1lBQ0EsZUFBQTtZQUNBLE1BQUE7WUFDQSxTQUFBLEtBQUEsZUFBQSxRQUFBLFVBQUE7WUFDQSxhQUFBO1lBQ0EsU0FBQTs7O1FBR0EsS0FBQSxZQUFBLEtBQUEsYUFBQTtRQUNBLEtBQUEsYUFBQSxLQUFBLGNBQUE7O1FBRUEsS0FBQSxNQUFBO1lBQ0EsU0FBQSxXQUFBO2dCQUNBLEtBQUEsSUFBQTtnQkFDQSxLQUFBLFFBQUE7b0JBQ0EsT0FBQSxLQUFBOzs7Ozs7SUFNQSxTQUFBLFdBQUE7UUFDQTs7O0lBR0EsS0FBQSxhQUFBLFNBQUEsUUFBQTtRQUNBLE9BQUEsT0FBQSxhQUFBLFlBQUEsT0FBQSxPQUFBOzs7SUFHQSxLQUFBLFdBQUEsU0FBQSxLQUFBLFFBQUEsVUFBQTtRQUNBLElBQUE7UUFDQSxHQUFBLE9BQUEsVUFBQTtZQUNBLE9BQUEsT0FBQSxTQUFBLElBQUEsT0FBQSxLQUFBLGFBQUEsUUFBQSxLQUFBO2VBQ0E7WUFDQSxPQUFBLElBQUEsT0FBQSxLQUFBOzs7UUFHQSxPQUFBOzs7SUFHQSxLQUFBLE9BQUEsU0FBQSxRQUFBO1FBQ0EsR0FBQSxPQUFBLGFBQUEsYUFBQSxDQUFBLE9BQUEsVUFBQTtZQUNBOzs7UUFHQSxHQUFBLEtBQUEsTUFBQSxTQUFBLE9BQUEsS0FBQSxZQUFBO1lBQ0EsR0FBQSxLQUFBLE1BQUEsa0JBQUEsUUFBQTtnQkFDQSxLQUFBLE1BQUEsZ0JBQUE7bUJBQ0E7Z0JBQ0EsS0FBQSxNQUFBLE9BQUE7Z0JBQ0EsS0FBQSxNQUFBLGdCQUFBOztlQUVBO1lBQ0EsS0FBQSxNQUFBLE9BQUEsT0FBQSxLQUFBO1lBQ0EsS0FBQSxNQUFBLGdCQUFBOzs7O0lBSUEsT0FBQSxPQUFBLGNBQUEsV0FBQTtRQUNBLEdBQUEsS0FBQSxVQUFBLFdBQUE7WUFDQSxLQUFBLFFBQUE7Z0JBQ0EsT0FBQSxLQUFBOzs7T0FHQTs7SUFFQSxPQUFBLE9BQUEsYUFBQSxXQUFBO1FBQ0EsS0FBQSxPQUFBLEtBQUEsUUFBQTtRQUNBLEtBQUEsbUJBQUEsV0FBQSxLQUFBO1FBQ0EsS0FBQSxPQUFBLEtBQUE7T0FDQTs7O0FBR0EsUUFBQSxPQUFBLFlBQUEsQ0FBQSxnQkFBQTtLQUNBLFdBQUEsa0JBQUE7S0FDQSxVQUFBLFFBQUE7UUFDQSxZQUFBO1FBQ0EsYUFBQTtRQUNBLFVBQUE7WUFDQSxNQUFBO1lBQ0EsT0FBQTtZQUNBLFNBQUE7WUFDQSxXQUFBO1lBQ0EsWUFBQTtZQUNBLFlBQUE7WUFDQSxZQUFBO1lBQ0Esa0JBQUE7WUFDQSxLQUFBOzs7S0FHQSxVQUFBLDBCQUFBLFNBQUEsVUFBQTtRQUNBO1FBQ0EsT0FBQSxVQUFBLE9BQUEsU0FBQSxZQUFBO1lBQ0EsTUFBQSxPQUFBLFNBQUEsT0FBQTtnQkFDQSxPQUFBLE1BQUEsTUFBQSxXQUFBO2VBQ0EsU0FBQSxPQUFBO2dCQUNBLFFBQUEsS0FBQTs7Z0JBRUEsU0FBQSxRQUFBLFlBQUE7Ozs7O0FDOUxBLFNBQUEsaUJBQUEsY0FBQSxRQUFBLE9BQUEsU0FBQTtJQUNBO0lBQ0EsSUFBQSxTQUFBOztJQUVBLE9BQUEsV0FBQSxTQUFBLFFBQUE7UUFDQSxPQUFBLE9BQUEsU0FBQSxPQUFBLGVBQUEsT0FBQTs7O0lBR0EsR0FBQSxRQUFBLGNBQUE7UUFDQSxPQUFBLGNBQUEsUUFBQSxhQUFBLFFBQUE7UUFDQSxHQUFBLE9BQUEsYUFBQTtZQUNBLE9BQUEsYUFBQTs7OztJQUlBLE9BQUEsY0FBQSxXQUFBO1FBQ0EsR0FBQSxRQUFBLGNBQUE7WUFDQSxRQUFBLGFBQUEsUUFBQSxxQkFBQTtZQUNBLE9BQUEsY0FBQTtZQUNBLE9BQUEsYUFBQTs7OztJQUlBLE9BQUEsa0JBQUEsU0FBQSxhQUFBO1FBQ0EsTUFBQSxJQUFBLHFDQUFBLGFBQUEsS0FBQSxXQUFBO1lBQ0EsT0FBQSxhQUFBO1lBQ0EsR0FBQSxRQUFBLGNBQUE7Z0JBQ0EsUUFBQSxhQUFBLFFBQUEscUJBQUE7Ozs7O0lBS0EsT0FBQSxlQUFBOzs7QUFHQSxRQUFBLE9BQUEsY0FBQSxDQUFBLFVBQUE7S0FDQSxXQUFBLG9CQUFBO0tBQ0EsVUFBQSxVQUFBO1FBQ0EsWUFBQTtRQUNBLGFBQUE7O0FDdkNBLFNBQUEsd0JBQUE7SUFDQSxJQUFBLGNBQUE7O0lBRUEsSUFBQSxnQkFBQTtRQUNBLFNBQUE7UUFDQSxJQUFBO1FBQ0EsUUFBQTtRQUNBLFNBQUE7UUFDQSxRQUFBOzs7SUFHQSxZQUFBLFFBQUE7UUFDQSxvQkFBQSxjQUFBLFlBQUEsV0FBQTs7OztBQUlBLFFBQUEsT0FBQSxtQkFBQTtDQUNBLFdBQUEseUJBQUE7Q0FDQSxVQUFBLGVBQUE7UUFDQSxZQUFBO1FBQ0EsYUFBQTtRQUNBLFVBQUE7WUFDQSxVQUFBOzs7O0FDckJBLFNBQUEscUJBQUEsZ0JBQUE7SUFDQTtJQUNBLElBQUEsVUFBQTtRQUNBLGVBQUE7O0lBRUEsS0FBQSxpQkFBQSxTQUFBLE1BQUEsUUFBQTtRQUNBLEdBQUEsUUFBQSxVQUFBLFdBQUE7WUFDQSxRQUFBLEtBQUE7WUFDQTs7O1FBR0EsUUFBQSxLQUFBOztRQUVBLE9BQUEsUUFBQSxTQUFBLE9BQUE7WUFDQSxHQUFBLGFBQUEsUUFBQSxXQUFBLENBQUEsR0FBQTtnQkFDQSxRQUFBLEtBQUE7Z0JBQ0E7OztZQUdBLGVBQUEsTUFBQSxNQUFBLE1BQUEsTUFBQTtZQUNBLGFBQUEsS0FBQTs7OztJQUlBLEtBQUEsT0FBQSxXQUFBO1FBQ0EsT0FBQTs7OztBQUlBLFNBQUEsaUJBQUEsS0FBQTtJQUNBO0lBQ0EsSUFBQSxTQUFBOztJQUVBLE9BQUEsY0FBQTtJQUNBLE9BQUEsY0FBQTs7SUFFQSxPQUFBLFNBQUEsU0FBQSxPQUFBLE1BQUE7UUFDQSxPQUFBLElBQUE7Ozs7QUFJQSxTQUFBLFdBQUEsTUFBQSxPQUFBLElBQUEsaUJBQUE7SUFDQTtJQUNBLElBQUEsTUFBQSxTQUFBLElBQUEsTUFBQTtRQUNBLElBQUEsVUFBQSxrQkFBQSxPQUFBO1lBQ0EsU0FBQTs7UUFFQSxLQUFBLE9BQUEsS0FBQSxPQUFBLEdBQUEsZ0JBQUEsS0FBQSxNQUFBOztRQUVBLEtBQUEsYUFBQSxXQUFBO1lBQ0EsU0FBQTs7O1FBR0EsS0FBQSxVQUFBLFNBQUEsUUFBQTtZQUNBLElBQUEsVUFBQSxHQUFBO2dCQUNBLFNBQUEsVUFBQTs7WUFFQSxHQUFBLFVBQUEsT0FBQSxLQUFBLFVBQUEsWUFBQSxPQUFBLEtBQUEsVUFBQSxTQUFBLFlBQUEsS0FBQSxRQUFBLE9BQUEsS0FBQSxHQUFBO2dCQUNBLEtBQUEsTUFBQTs7Z0JBRUEsUUFBQSxRQUFBLE9BQUEsS0FBQSxVQUFBLFNBQUE7bUJBQ0E7Z0JBQ0EsS0FBQSxNQUFBO2dCQUNBLE1BQUE7b0JBQ0EsUUFBQTtvQkFDQSxLQUFBO29CQUNBLFFBQUE7bUJBQ0EsS0FBQSxTQUFBLFVBQUE7b0JBQ0EsUUFBQSxRQUFBLFNBQUE7O29CQUVBLE9BQUEsS0FBQSxVQUFBLFdBQUE7d0JBQ0EsV0FBQSxLQUFBO3dCQUNBLE1BQUEsU0FBQTs7Ozs7WUFLQSxPQUFBLFFBQUE7OztRQUdBLEtBQUEsU0FBQSxTQUFBLFFBQUE7WUFDQSxPQUFBLE1BQUE7Z0JBQ0EsUUFBQTtnQkFDQSxLQUFBO2dCQUNBLE1BQUE7Ozs7UUFJQSxLQUFBLE9BQUEsU0FBQSxJQUFBO1lBQ0EsT0FBQSxNQUFBO2dCQUNBLFFBQUE7Z0JBQ0EsS0FBQSxVQUFBOzs7O1FBSUEsS0FBQSxTQUFBLFNBQUEsUUFBQTtZQUNBLE9BQUEsTUFBQTtnQkFDQSxRQUFBO2dCQUNBLEtBQUEsVUFBQSxPQUFBO2dCQUNBLE1BQUE7Ozs7UUFJQSxLQUFBLFNBQUEsU0FBQSxRQUFBO1lBQ0EsT0FBQSxNQUFBO2dCQUNBLFFBQUE7Z0JBQ0EsS0FBQSxVQUFBLE9BQUE7Z0JBQ0EsTUFBQTs7OztRQUlBLEtBQUEsbUJBQUEsU0FBQSxNQUFBO1lBQ0EsUUFBQSxTQUFBLE1BQUE7Z0JBQ0EsSUFBQSxXQUFBO29CQUNBO29CQUNBO29CQUNBLGtCQUFBOztnQkFFQSxLQUFBLFFBQUE7Z0JBQ0EsS0FBQSxRQUFBOztnQkFFQSxPQUFBLGVBQUEsTUFBQSxTQUFBO29CQUNBLEtBQUEsV0FBQTt3QkFDQSxPQUFBOztvQkFFQSxLQUFBLFNBQUEsVUFBQTt3QkFDQSxHQUFBLGFBQUEsT0FBQTs0QkFDQTs7O3dCQUdBLEtBQUEsTUFBQTt3QkFDQSxRQUFBO3dCQUNBLGtCQUFBOzs7O2dCQUlBLE9BQUEsZUFBQSxNQUFBLFdBQUE7b0JBQ0EsS0FBQSxXQUFBO3dCQUNBLE9BQUE7O29CQUVBLEtBQUEsU0FBQSxZQUFBO3dCQUNBLEdBQUEsZUFBQSxTQUFBOzRCQUNBOzs7d0JBR0EsS0FBQSxNQUFBO3dCQUNBLFVBQUE7d0JBQ0Esa0JBQUE7Ozs7Z0JBSUEsS0FBQSxNQUFBLFdBQUE7b0JBQ0EsS0FBQSxNQUFBO29CQUNBLElBQUEsV0FBQSxHQUFBOztvQkFFQSxHQUFBLGdCQUFBLFNBQUEsV0FBQSxhQUFBLGdCQUFBLFNBQUEsT0FBQSxTQUFBLFdBQUEsV0FBQTt3QkFDQSxLQUFBLE1BQUEsU0FBQSxPQUFBLFNBQUEsT0FBQTt3QkFDQSxTQUFBLFFBQUEsZ0JBQUEsU0FBQSxPQUFBLFNBQUE7MkJBQ0E7d0JBQ0EsS0FBQSxNQUFBLFNBQUEsT0FBQSxTQUFBLE9BQUE7d0JBQ0EsSUFBQSxPQUFBLE1BQUE7NEJBQ0EsT0FBQSxTQUFBOzRCQUNBLE9BQUEsU0FBQTs0QkFDQSxNQUFBLFNBQUE7NEJBQ0EsS0FBQSxTQUFBOzJCQUNBLEtBQUEsU0FBQSxNQUFBOzRCQUNBLGdCQUFBLFNBQUEsU0FBQSxnQkFBQSxTQUFBLFVBQUE7NEJBQ0EsZ0JBQUEsU0FBQSxPQUFBLFNBQUEsU0FBQTs0QkFDQSxTQUFBLFFBQUE7MkJBQ0EsU0FBQSxRQUFBOzRCQUNBLFNBQUEsT0FBQTs7OztvQkFJQSxPQUFBLFNBQUE7OztnQkFHQSxPQUFBO2NBQ0E7OztJQUdBLE9BQUE7OztJQUdBLE9BQUEsU0FBQSxNQUFBO1FBQ0EsR0FBQSxLQUFBLFVBQUEsV0FBQTtZQUNBLEtBQUEsUUFBQSxJQUFBLElBQUE7O1FBRUEsT0FBQSxLQUFBOzs7O0FBSUEsUUFBQSxPQUFBLFVBQUEsQ0FBQTtLQUNBLFNBQUEsbUJBQUE7S0FDQSxRQUFBLFVBQUE7S0FDQSxTQUFBLGdCQUFBO0tBQ0EsUUFBQSxPQUFBO0FDck1BLFNBQUEsZUFBQSxzQkFBQTtJQUNBO0lBQ0EscUJBQUEsZUFBQSxZQUFBO1FBQ0E7WUFDQSxZQUFBO1lBQ0EsVUFBQTtZQUNBLE1BQUE7WUFDQSxNQUFBO1lBQ0EsVUFBQTtZQUNBLE9BQUE7Z0JBQ0EsS0FBQTtnQkFDQSxPQUFBO29CQUNBLEtBQUE7d0JBQ0EsYUFBQTt3QkFDQSxZQUFBOzs7Ozs7OztBQVFBLFNBQUEsbUJBQUEsUUFBQSxNQUFBLFNBQUEsT0FBQTtJQUNBO0lBQ0EsSUFBQSxXQUFBO0lBQ0EsSUFBQSxjQUFBO0lBQ0EsSUFBQTtJQUNBLEtBQUEsTUFBQTs7SUFFQSxTQUFBLFdBQUE7UUFDQSxVQUFBLFFBQUEsWUFBQTtRQUNBLFNBQUEsT0FBQSxZQUFBLE1BQUEsQ0FBQSxVQUFBLE9BQUEsS0FBQSxVQUFBLFNBQUEsVUFBQSxPQUFBLFVBQUE7OztJQUdBLE1BQUEsSUFBQSxnQkFBQSxLQUFBLFNBQUEsVUFBQTtRQUNBLGNBQUEsU0FBQTtRQUNBOzs7SUFHQSxJQUFBLFVBQUE7UUFDQTtZQUNBLFFBQUE7WUFDQSxNQUFBO1lBQ0EsVUFBQSxVQUFBLE1BQUEsUUFBQSxLQUFBOzs7Z0JBR0EsT0FBQSxjQUFBLElBQUEsY0FBQSx1QkFBQSxPQUFBOzs7UUFHQTtZQUNBLE1BQUE7WUFDQSxRQUFBOzs7O0lBSUEsU0FBQSxjQUFBLFNBQUEsT0FBQTtRQUNBLElBQUEsT0FBQSxNQUFBO1FBQ0EsSUFBQSxZQUFBLE1BQUEsaUJBQUE7O1FBRUEsWUFBQTs7UUFFQSxjQUFBLFFBQUEsV0FBQSxhQUFBLE1BQUEsY0FBQTs7UUFFQTtRQUNBLE1BQUEsY0FBQTs7OztBQUlBLFFBQUEsT0FBQSxnQkFBQSxDQUFBO0tBQ0EsV0FBQSxzQkFBQTtLQUNBLE9BQUE7QUN0RUEsU0FBQSxhQUFBLHNCQUFBO0lBQ0E7SUFDQSxxQkFBQSxlQUFBLFVBQUE7UUFDQTtZQUNBLFlBQUE7WUFDQSxVQUFBO1lBQ0EsTUFBQTtZQUNBLE1BQUE7WUFDQSxVQUFBO1lBQ0EsT0FBQTtnQkFDQSxLQUFBO2dCQUNBLE9BQUE7b0JBQ0EsS0FBQTt3QkFDQSxhQUFBO3dCQUNBLFlBQUE7Ozs7Ozs7O0FBUUEsU0FBQSxpQkFBQSxNQUFBLE9BQUEsU0FBQSxRQUFBLGNBQUE7SUFDQSxJQUFBLFNBQUE7SUFDQSxJQUFBLGdCQUFBO0lBQ0EsSUFBQTtJQUNBLEtBQUEsTUFBQSxhQUFBOztJQUVBLE9BQUEsU0FBQSxhQUFBOztJQUVBLFNBQUEsV0FBQTtRQUNBLEdBQUEsQ0FBQSxjQUFBLFFBQUE7WUFDQTs7O1FBR0EsSUFBQSxxQkFBQTs7UUFFQSxHQUFBLE9BQUEsUUFBQTtZQUNBLHFCQUFBLFFBQUEsVUFBQSxlQUFBLE9BQUE7OztRQUdBLFVBQUEsUUFBQSxtQkFBQTs7UUFFQSxPQUFBLGFBQUEsbUJBQUEsTUFBQSxDQUFBLFVBQUEsT0FBQSxLQUFBLFVBQUEsU0FBQSxVQUFBLE9BQUEsVUFBQTs7O0lBR0EsTUFBQSxJQUFBLGVBQUEsS0FBQSxTQUFBLFVBQUE7UUFDQSxnQkFBQSxTQUFBO1FBQ0E7OztJQUdBLE1BQUEsSUFBQSxZQUFBLEtBQUEsU0FBQSxVQUFBO1FBQ0EsT0FBQSxTQUFBLFNBQUEsS0FBQSxTQUFBO1FBQ0EsT0FBQSxpQkFBQSxTQUFBLEtBQUEscUJBQUE7UUFDQSxPQUFBLGtCQUFBLFNBQUEsS0FBQTs7O0lBR0EsSUFBQSxVQUFBO1FBQ0E7WUFDQSxRQUFBO1lBQ0EsTUFBQTs7UUFFQTtZQUNBLFFBQUE7WUFDQSxNQUFBOztRQUVBO1lBQ0EsUUFBQTtZQUNBLE1BQUE7O1FBRUE7WUFDQSxRQUFBO1lBQ0EsTUFBQTs7UUFFQTtZQUNBLFFBQUE7WUFDQSxNQUFBO1lBQ0EsVUFBQSxTQUFBLE1BQUEsUUFBQSxLQUFBLFVBQUE7O2dCQUVBLEdBQUEsU0FBQSxRQUFBO29CQUNBLE9BQUE7O2dCQUVBLE9BQUEsOEJBQUEsU0FBQSxZQUFBLFdBQUEsUUFBQTs7O1FBR0E7WUFDQSxRQUFBO1lBQ0EsTUFBQTs7UUFFQTtZQUNBLFFBQUE7WUFDQSxNQUFBO1lBQ0EsVUFBQSxVQUFBLE1BQUEsUUFBQSxLQUFBOzs7Z0JBR0EsT0FBQSxjQUFBLElBQUEsY0FBQSx1QkFBQSxPQUFBOzs7UUFHQTtZQUNBLE1BQUE7WUFDQSxRQUFBOzs7O0lBSUEsT0FBQSxPQUFBLGlCQUFBLFNBQUEsVUFBQTtRQUNBLEdBQUEsYUFBQSxXQUFBO1lBQ0E7O1FBRUE7OztJQUdBLE9BQUEsZ0JBQUEsU0FBQSxPQUFBO1FBQ0EsSUFBQSxPQUFBLE1BQUEsUUFBQTtRQUNBLElBQUEsWUFBQSxNQUFBLGlCQUFBOztRQUVBLFlBQUE7O1FBRUEsR0FBQSxTQUFBLGdCQUFBLFNBQUEsU0FBQTtZQUNBLE9BQUEsQ0FBQSxTQUFBOzs7UUFHQSxnQkFBQSxRQUFBLFdBQUEsZUFBQSxNQUFBLGNBQUE7O1FBRUE7UUFDQSxNQUFBLGNBQUE7OztJQUdBLE9BQUEsbUJBQUEsU0FBQSxLQUFBO1FBQ0EsR0FBQSxJQUFBLFdBQUEsUUFBQTtZQUNBLE9BQUE7Ozs7O0FBS0EsUUFBQSxPQUFBLGNBQUEsQ0FBQSxVQUFBLGdCQUFBLFlBQUE7S0FDQSxXQUFBLG9CQUFBO0tBQ0EsT0FBQTtLQUNBLE9BQUEscUJBQUEsV0FBQTtRQUNBLE9BQUEsU0FBQSxTQUFBO1lBQ0EsR0FBQSxZQUFBLFdBQUE7Z0JBQ0EsT0FBQTs7WUFFQSxJQUFBLElBQUEsSUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxFQUFBO1lBQ0EsRUFBQSxXQUFBO1lBQ0EsT0FBQSxFQUFBOzs7QUNoSkEsU0FBQSxZQUFBLHNCQUFBO0lBQ0E7SUFDQSxxQkFBQSxlQUFBLFNBQUE7UUFDQTtZQUNBLFlBQUE7WUFDQSxVQUFBO1lBQ0EsTUFBQTtZQUNBLE1BQUE7WUFDQSxVQUFBO1lBQ0EsT0FBQTtnQkFDQSxLQUFBO2dCQUNBLE9BQUE7b0JBQ0EsS0FBQTt3QkFDQSxhQUFBOzs7Ozs7OztBQVFBLFFBQUEsT0FBQSxhQUFBO0tBQ0EsT0FBQTtBQ3RCQSxTQUFBLFVBQUEsb0JBQUEsY0FBQTtJQUNBO0lBQ0EsbUJBQUEsVUFBQTtJQUNBLGFBQUEsYUFBQTs7O0FBR0EsUUFBQSxPQUFBLGFBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7S0FFQSxPQUFBLFdBQUEiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gR3JpZENvbnRyb2xsZXIoJHRpbWVvdXQsICRsb2csICRzY29wZSwgJHRlbXBsYXRlUmVxdWVzdCwgJGludGVycG9sYXRlKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBHcmlkID0gdGhpcztcbiAgICAkc2NvcGUuUGFyZW50ID0gJHNjb3BlLiRwYXJlbnQ7XG5cbiAgICBmdW5jdGlvbiBnZXRDb2x1bW5zKGRhdGEpIHtcbiAgICAgICAgdmFyIGNvbHVtbkRlZmluaXRpb24gPSBbXSxcbiAgICAgICAgICAgIGNvbHVtbktleXMgPSBbXSxcbiAgICAgICAgICAgIG92ZXJyaWRkZW5DZWxscyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYoQXJyYXkuaXNBcnJheShkYXRhKSAmJiBHcmlkLmF1dG9Db2x1bW4gIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXMocm93KS5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICAgICAgICAgICAgICBpZihyb3cuaGFzT3duUHJvcGVydHkoY29sdW1uKSAmJiBjb2x1bW5LZXlzLmluZGV4T2YoY29sdW1uKSA9PT0gLTEgJiYgY29sdW1uICE9PSAnJCRoYXNoS2V5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0NvbHVtbiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29sdW1uW0dyaWQuY29sdW1uS2V5XSA9IGNvbHVtbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbHVtbltHcmlkLmNvbHVtbk5hbWVdID0gY29sdW1uO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW5EZWZpbml0aW9uLnB1c2gobmV3Q29sdW1uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbktleXMucHVzaChjb2x1bW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYoR3JpZC5zdGF0ZSAmJiBBcnJheS5pc0FycmF5KEdyaWQuc3RhdGUuZ3JpZENvbHVtbnMpKSB7XG4gICAgICAgICAgICBHcmlkLnN0YXRlLmdyaWRDb2x1bW5zLmZvckVhY2goZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICAgICAgICAgICAgaWYoY29sdW1uW0dyaWQuY29sdW1uS2V5XSA9PT0gJyQkaGFzaEtleScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZihjb2x1bW4ub3ZlcnJpZGVUZW1wbGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAkdGVtcGxhdGVSZXF1ZXN0KGNvbHVtbi5vdmVycmlkZVRlbXBsYXRlKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGUgPSAkaW50ZXJwb2xhdGUocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW4ub3ZlcnJpZGUgPSBmdW5jdGlvbihjZWxsLCBjb2x1bW4sIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByb3dJbmRleFBhZ2UgPSBHcmlkLmRhdGEuaW5kZXhPZihyb3cpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xJbmRleCA9IGNvbHVtbkRlZmluaXRpb24ubGVuZ3RoIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93SW5kZXggPSAoR3JpZC5zdGF0ZS5wYWdlIC0gMSkgKiBHcmlkLnN0YXRlLnBlclBhZ2UgKyByb3dJbmRleFBhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbGxTY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKG92ZXJyaWRkZW5DZWxsc1tjb2x1bW5bR3JpZC5jb2x1bW5LZXldXSAmJiBvdmVycmlkZGVuQ2VsbHNbY29sdW1uW0dyaWQuY29sdW1uS2V5XV1bcm93SW5kZXhQYWdlXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3ZlcnJpZGRlbkNlbGxzW2NvbHVtbltHcmlkLmNvbHVtbktleV1dW3Jvd0luZGV4UGFnZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbGxTY29wZSA9ICRzY29wZS4kbmV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2VsbFNjb3BlLiRpbmRleCA9IHJvd0luZGV4ICsgY2VsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmV4dGVuZChjZWxsU2NvcGUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbEluZGV4OiBjb2xJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvd0luZGV4OiByb3dJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGluZGV4OiByb3dJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2VsbDogY2VsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBjb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdzogcm93XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IHRlbXBsYXRlKGNlbGxTY29wZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighb3ZlcnJpZGRlbkNlbGxzW2NvbHVtbltHcmlkLmNvbHVtbktleV1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJyaWRkZW5DZWxsc1tjb2x1bW5bR3JpZC5jb2x1bW5LZXldXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVycmlkZGVuQ2VsbHNbY29sdW1uW0dyaWQuY29sdW1uS2V5XV1bcm93SW5kZXhQYWdlXSA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYoY29sdW1uS2V5cy5pbmRleE9mKGNvbHVtbltHcmlkLmNvbHVtbktleV0pID09PSAtMSkgeyAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uRGVmaW5pdGlvbi5wdXNoKGNvbHVtbik7XG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbktleXMucHVzaChjb2x1bW5bR3JpZC5jb2x1bW5LZXldKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2x1bW5EZWZpbml0aW9uLmZvckVhY2goZnVuY3Rpb24oZGVmaW5lZENvbHVtbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZGVmaW5lZENvbHVtbltHcmlkLmNvbHVtbktleV0gPT09IGNvbHVtbltHcmlkLmNvbHVtbktleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhjb2x1bW4pLmZvckVhY2goZnVuY3Rpb24ocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5lZENvbHVtbltwcm9wZXJ0eV0gPSBjb2x1bW5bcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNvbHVtbkRlZmluaXRpb247XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gICAgICAgIHZhciBwZXJQYWdlID0gR3JpZC5wYWdpbmF0aW9uICE9PSB0cnVlICYmIEdyaWQucGFnaW5hdGlvbiAhPT0gdW5kZWZpbmVkID8gR3JpZC5wYWdpbmF0aW9uIDogMjA7XG4gICAgICAgIEdyaWQuc3RhdGUgPSBHcmlkLnN0YXRlIHx8IHtcbiAgICAgICAgICAgIHNvcnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHNvcnREaXJlY3Rpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHBhZ2U6IDEsXG4gICAgICAgICAgICBwZXJQYWdlOiBHcmlkLnBhZ2luYXRpb24gIT09IGZhbHNlID8gcGVyUGFnZSA6IDAsXG4gICAgICAgICAgICBncmlkQ29sdW1uczogW10sXG4gICAgICAgICAgICByZWZyZXNoOiBmYWxzZVxuICAgICAgICB9O1xuXG4gICAgICAgIEdyaWQuY29sdW1uS2V5ID0gR3JpZC5jb2x1bW5LZXkgfHwgJ25hbWUnO1xuICAgICAgICBHcmlkLmNvbHVtbk5hbWUgPSBHcmlkLmNvbHVtbk5hbWUgfHwgJ2hlYWRlcic7XG4gICAgICAgIFxuICAgICAgICBHcmlkLmFwaSA9IHtcbiAgICAgICAgICAgIHJlZnJlc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRsb2cubG9nKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgR3JpZC5nZXREYXRhKHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IEdyaWQuc3RhdGVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGFjdGl2YXRlKCk7XG4gICAgfSk7XG5cbiAgICBHcmlkLmlzU29ydGFibGUgPSBmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgcmV0dXJuIGNvbHVtbi5zb3J0YWJsZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGNvbHVtbi5zb3J0YWJsZTtcbiAgICB9O1xuICAgIFxuICAgIEdyaWQuZ2V0VmFsdWUgPSBmdW5jdGlvbihyb3csIGNvbHVtbiwgcm93SW5kZXgpIHtcbiAgICAgICAgdmFyIGNlbGw7XG4gICAgICAgIGlmKGNvbHVtbi5vdmVycmlkZSkge1xuICAgICAgICAgICAgY2VsbCA9IGNvbHVtbi5vdmVycmlkZShyb3dbY29sdW1uW0dyaWQuY29sdW1uS2V5XV0sIGNvbHVtbiwgcm93LCByb3dJbmRleCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjZWxsID0gcm93W2NvbHVtbltHcmlkLmNvbHVtbktleV1dO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2VsbDtcbiAgICB9O1xuICAgIFxuICAgIEdyaWQuc29ydCA9IGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICBpZihjb2x1bW4uc29ydGFibGUgIT09IHVuZGVmaW5lZCAmJiAhY29sdW1uLnNvcnRhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmKEdyaWQuc3RhdGUuc29ydCA9PT0gY29sdW1uW0dyaWQuY29sdW1uS2V5XSkge1xuICAgICAgICAgICAgaWYoR3JpZC5zdGF0ZS5zb3J0RGlyZWN0aW9uID09PSAnREVTQycpIHtcbiAgICAgICAgICAgICAgICBHcmlkLnN0YXRlLnNvcnREaXJlY3Rpb24gPSAnQVNDJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgR3JpZC5zdGF0ZS5zb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIEdyaWQuc3RhdGUuc29ydERpcmVjdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEdyaWQuc3RhdGUuc29ydCA9IGNvbHVtbltHcmlkLmNvbHVtbktleV07XG4gICAgICAgICAgICBHcmlkLnN0YXRlLnNvcnREaXJlY3Rpb24gPSAnREVTQyc7XG4gICAgICAgIH1cbiAgICB9O1xuICAgICAgICBcbiAgICAkc2NvcGUuJHdhdGNoKCdHcmlkLnN0YXRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKEdyaWQuc3RhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgR3JpZC5nZXREYXRhKHtcbiAgICAgICAgICAgICAgICBzdGF0ZTogR3JpZC5zdGF0ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LCB0cnVlKTtcbiAgICBcbiAgICAkc2NvcGUuJHdhdGNoKCdHcmlkLmRhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgR3JpZC5kYXRhID0gR3JpZC5kYXRhIHx8IFtdO1xuICAgICAgICBHcmlkLmNvbHVtbkRlZmluaXRpb24gPSBnZXRDb2x1bW5zKEdyaWQuZGF0YSk7XG4gICAgICAgIEdyaWQucm93cyA9IEdyaWQuZGF0YTtcbiAgICB9LCB0cnVlKTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ212bC5ncmlkJywgWyd1aS5ib290c3RyYXAnLCAnbmdTYW5pdGl6ZSddKVxuICAgIC5jb250cm9sbGVyKCdHcmlkQ29udHJvbGxlcicsIEdyaWRDb250cm9sbGVyKVxuICAgIC5jb21wb25lbnQoJ2dyaWQnLCB7XG4gICAgICAgIGNvbnRyb2xsZXI6ICdHcmlkQ29udHJvbGxlciBhcyBHcmlkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2dyaWQvZ3JpZC5odG1sJyxcbiAgICAgICAgYmluZGluZ3M6IHtcbiAgICAgICAgICAgIGRhdGE6ICc8JyxcbiAgICAgICAgICAgIHN0YXRlOiAnPCcsXG4gICAgICAgICAgICBnZXREYXRhOiAnJicsXG4gICAgICAgICAgICBjb2x1bW5LZXk6ICdAJyxcbiAgICAgICAgICAgIGNvbHVtbk5hbWU6ICdAJyxcbiAgICAgICAgICAgIGF1dG9Db2x1bW46ICc8JyxcbiAgICAgICAgICAgIHBhZ2luYXRpb246ICc9PycsXG4gICAgICAgICAgICBnZXRDbGFzc2VzRm9yUm93OiAnPScsXG4gICAgICAgICAgICBhcGk6ICc9PydcbiAgICAgICAgfVxuICAgIH0pXG4gICAgLmRpcmVjdGl2ZSgnY2VsbFZhbHVlJywgZnVuY3Rpb24oJGNvbXBpbGUpIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuJGV2YWwoYXR0cmlidXRlcy5jZWxsVmFsdWUpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwodmFsdWUpO1xuICAgIFxuICAgICAgICAgICAgICAgICRjb21waWxlKGVsZW1lbnQuY29udGVudHMoKSkoc2NvcGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgfSk7XG4iLCJmdW5jdGlvbiBOYXZiYXJDb250cm9sbGVyKE1vZHVsZVN0YXRlcywgJHN0YXRlLCAkaHR0cCwgJHdpbmRvdykge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgTmF2YmFyID0gdGhpcztcbiAgICBcbiAgICBOYXZiYXIuaXNBY3RpdmUgPSBmdW5jdGlvbihtb2R1bGUpIHtcbiAgICAgICAgcmV0dXJuICRzdGF0ZS5pbmNsdWRlcyhtb2R1bGUuYWN0aXZlU3RhdGUgfHwgbW9kdWxlLm5hbWUpO1xuICAgIH07XG4gICAgXG4gICAgaWYoJHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgTmF2YmFyLmFjY291bnROYW1lID0gJHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncmVnaXN0ZXJlZEFjY291bnQnKTtcbiAgICAgICAgaWYoTmF2YmFyLmFjY291bnROYW1lKSB7XG4gICAgICAgICAgICBOYXZiYXIucmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgTmF2YmFyLnVuZG9TdG9yYWdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCR3aW5kb3cubG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICAkd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyZWdpc3RlcmVkQWNjb3VudCcsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBOYXZiYXIuYWNjb3VudE5hbWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBOYXZiYXIucmVnaXN0ZXJlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICBOYXZiYXIucmVnaXN0ZXJBY2NvdW50ID0gZnVuY3Rpb24oYWNjb3VudE5hbWUpIHtcbiAgICAgICAgJGh0dHAuZ2V0KCdodHRwOi8vc3NmLnBvZWxhZGRlci5jb20vc2lnbnVwLycgKyBhY2NvdW50TmFtZSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIE5hdmJhci5yZWdpc3RlcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmKCR3aW5kb3cubG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncmVnaXN0ZXJlZEFjY291bnQnLCBhY2NvdW50TmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgXG4gICAgTmF2YmFyLk1vZHVsZVN0YXRlcyA9IE1vZHVsZVN0YXRlcztcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3BvZS5uYXZiYXInLCBbJ3N5c3RlbScsICd1aS5yb3V0ZXInXSlcbiAgICAuY29udHJvbGxlcignTmF2YmFyQ29udHJvbGxlcicsIE5hdmJhckNvbnRyb2xsZXIpXG4gICAgLmNvbXBvbmVudCgnbmF2YmFyJywge1xuICAgICAgICBjb250cm9sbGVyOiAnTmF2YmFyQ29udHJvbGxlciBhcyBOYXZiYXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvbmF2YmFyL25hdmJhci5odG1sJ1xuICAgIH0pOyIsImZ1bmN0aW9uIFN0YXR1c0xpZ2h0Q29udHJvbGxlcigpIHtcbiAgICB2YXIgU3RhdHVzTGlnaHQgPSB0aGlzO1xuICAgIFxuICAgIHZhciBzdGF0dXNUb0NvbG9yID0ge1xuICAgICAgICB1bmtub3duOiAnI2VlZScsXG4gICAgICAgIG9rOiAnIzVjYjg1YycsXG4gICAgICAgIG5vdGljZTogJyNmZWZmNzgnLFxuICAgICAgICB3YXJuaW5nOiAnI2YwYWQ0ZScsXG4gICAgICAgIGRhbmdlcjogJyNkOTUzNGYnXG4gICAgfTtcbiAgICBcbiAgICBTdGF0dXNMaWdodC5zdHlsZSA9IHtcbiAgICAgICAgJ2JhY2tncm91bmQtY29sb3InOiBzdGF0dXNUb0NvbG9yW1N0YXR1c0xpZ2h0LnN0YXR1c10gfHwgJ3RyYW5zcGFyZW50J1xuICAgIH07XG59XG5cbmFuZ3VsYXIubW9kdWxlKCdtdmwuc3RhdHVzbGlnaHQnLCBbXSlcbi5jb250cm9sbGVyKCdTdGF0dXNMaWdodENvbnRyb2xsZXInLCBTdGF0dXNMaWdodENvbnRyb2xsZXIpXG4uY29tcG9uZW50KCdzdGF0dXNMaWdodCcsIHtcbiAgICAgICAgY29udHJvbGxlcjogJ1N0YXR1c0xpZ2h0Q29udHJvbGxlciBhcyBTdGF0dXNMaWdodCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9zdGF0dXMtbGlnaHQvc3RhdHVzLWxpZ2h0Lmh0bWwnLFxuICAgICAgICBiaW5kaW5nczoge1xuICAgICAgICAgICAgJ3N0YXR1cyc6ICc8J1xuICAgICAgICB9XG4gICAgfSk7IiwiLypnbG9iYWwgY29uc29sZSAqL1xuZnVuY3Rpb24gTW9kdWxlU3RhdGVzUHJvdmlkZXIoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIG1vZHVsZXMgPSBbXSxcbiAgICAgICAgbW9kdWxlU3RhdGVzID0gW107XG5cbiAgICB0aGlzLnJlZ2lzdGVyTW9kdWxlID0gZnVuY3Rpb24obmFtZSwgc3RhdGVzKSB7XG4gICAgICAgIGlmKG1vZHVsZXNbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdNb2R1bGUgYWxyZWFkeSByZWdpc3RlcmVkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIG1vZHVsZXMucHVzaChuYW1lKTtcbiAgICAgICAgXG4gICAgICAgIHN0YXRlcy5mb3JFYWNoKGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgICAgICBpZihtb2R1bGVTdGF0ZXMuaW5kZXhPZihzdGF0ZSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdTdGF0ZSBhbHJlYWR5IHJlZ2lzdGVyZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKHN0YXRlLm5hbWUsIHN0YXRlLnN0YXRlKTtcbiAgICAgICAgICAgIG1vZHVsZVN0YXRlcy5wdXNoKHN0YXRlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuJGdldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbW9kdWxlU3RhdGVzO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIFN5c3RlbUNvbnRyb2xsZXIoQVBJKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBTeXN0ZW0gPSB0aGlzO1xuICAgICAgICBcbiAgICBTeXN0ZW0uc2hvd2luZ1NpZGUgPSBmYWxzZTtcbiAgICBTeXN0ZW0uc2hvd2luZ01lbnUgPSB0cnVlO1xuICAgIFxuICAgIFN5c3RlbS5nZXRBUEkgPSBmdW5jdGlvbiBnZXRBUEkobmFtZSkge1xuICAgICAgICByZXR1cm4gQVBJKG5hbWUpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIEFQSUZhY3RvcnkoJGxvZywgJGh0dHAsICRxLCBBUElCYXNlTG9jYXRpb24pIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIEFQSSA9IGZ1bmN0aW9uIEFQSShuYW1lKSB7XG4gICAgICAgIHZhciBiYXNlVVJMID0gQVBJQmFzZUxvY2F0aW9uICsgbmFtZSArICcvJyxcbiAgICAgICAgICAgIGNhY2hlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc2xpY2UoMSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmNsZWFyQ2FjaGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhY2hlcyA9IFtdO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5yZWFkQWxsID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9ICRxLmRlZmVyKCksXG4gICAgICAgICAgICAgICAgcGFyYW1zID0gZmlsdGVyIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZihjYWNoZXMgJiYgY2FjaGVzW0pTT04uc3RyaW5naWZ5KHBhcmFtcyldICYmIGNhY2hlc1tKU09OLnN0cmluZ2lmeShwYXJhbXMpXS50aW1lc3RhbXAgPiBEYXRlLm5vdygpIC0gMTAwMCAqIDYwICogNSkge1xuICAgICAgICAgICAgICAgICRsb2cuZGVidWcoJ3VwIHRvIGRhdGUgY2FjaGUsIHVzaW5nIGluc3RlYWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXF1ZXN0LnJlc29sdmUoY2FjaGVzW0pTT04uc3RyaW5naWZ5KHBhcmFtcyldLnJvd3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCdnZXR0aW5nIGZyZXNoIGRhdGEnKTtcbiAgICAgICAgICAgICAgICAkaHR0cCh7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogYmFzZVVSTCxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3QucmVzb2x2ZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlc1tKU09OLnN0cmluZ2lmeShwYXJhbXMpXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M6IHJlc3BvbnNlLmRhdGFcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3QucHJvbWlzZTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAoe1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHVybDogYmFzZVVSTCxcbiAgICAgICAgICAgICAgICBkYXRhOiBvYmplY3RcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5yZWFkID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICB1cmw6IGJhc2VVUkwgKyBpZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICAgICAgICAgIHVybDogYmFzZVVSTCArIG9iamVjdC5pZCxcbiAgICAgICAgICAgICAgICBkYXRhOiBvYmplY3RcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgICAgICB1cmw6IGJhc2VVUkwgKyBvYmplY3QuaWQsXG4gICAgICAgICAgICAgICAgZGF0YTogb2JqZWN0XG4gICAgICAgICAgICB9KTsgICAgICAgICAgICBcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuZ2V0VGFibGVSZXNvdXJjZSA9IGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgIHJldHVybiAoZnVuY3Rpb24odGFzaykge1xuICAgICAgICAgICAgICAgIHZhciByZXNvdXJjZSA9IHRoaXMsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyLFxuICAgICAgICAgICAgICAgICAgICBvcmRlckJ5LFxuICAgICAgICAgICAgICAgICAgICBwYWdpbmF0aW9uQ2FjaGUgPSB7fTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLmxpbWl0ID0gMjU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdvcmRlcicsIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvcmRlcjtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbihuZXdPcmRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobmV3T3JkZXIgPT09IG9yZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCduZXcgb3JkZXIsIGNsZWFyaW5nIGNhY2hlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcmRlciA9IG5ld09yZGVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFnaW5hdGlvbkNhY2hlID0ge307XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ29yZGVyQnknLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3JkZXJCeTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbihuZXdPcmRlckJ5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuZXdPcmRlckJ5ID09PSBvcmRlckJ5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKCduZXcgb3JkZXJieSwgY2xlYXJpbmcgY2FjaGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yZGVyQnkgPSBuZXdPcmRlckJ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFnaW5hdGlvbkNhY2hlID0ge307XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmdldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkbG9nLmRlYnVnKHBhZ2luYXRpb25DYWNoZSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZihwYWdpbmF0aW9uQ2FjaGVbcmVzb3VyY2UubGltaXRdICE9PSB1bmRlZmluZWQgJiYgcGFnaW5hdGlvbkNhY2hlW3Jlc291cmNlLmxpbWl0XVtyZXNvdXJjZS5zdGFydF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyhyZXNvdXJjZS5saW1pdCwgcmVzb3VyY2Uuc3RhcnQsICdjYWNoZWQsIGxvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocGFnaW5hdGlvbkNhY2hlW3Jlc291cmNlLmxpbWl0XVtyZXNvdXJjZS5zdGFydF0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvZy5kZWJ1ZyhyZXNvdXJjZS5saW1pdCwgcmVzb3VyY2Uuc3RhcnQsICdub3QgY2FjaGVkLCBsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBBUEkuZG9UYXNrKHRhc2ssIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogcmVzb3VyY2Uuc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGltaXQ6IHJlc291cmNlLmxpbWl0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvcnQ6IHJlc291cmNlLm9yZGVyQnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlyOiByZXNvdXJjZS5vcmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFnaW5hdGlvbkNhY2hlW3Jlc291cmNlLmxpbWl0XSA9IHBhZ2luYXRpb25DYWNoZVtyZXNvdXJjZS5saW1pdF0gfHwge307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFnaW5hdGlvbkNhY2hlW3Jlc291cmNlLmxpbWl0XVtyZXNvdXJjZS5zdGFydF0gPSBkYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSh0YXNrKSk7XG4gICAgICAgIH07XG4gICAgfSxcbiAgICBBUElzID0ge307XG5cbiAgICAgICAgXG4gICAgcmV0dXJuIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgaWYoQVBJc1tuYW1lXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBBUElzW25hbWVdID0gbmV3IEFQSShuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gQVBJc1tuYW1lXTtcbiAgICB9O1xufVxuXG5hbmd1bGFyLm1vZHVsZSgnc3lzdGVtJywgWyd1aS5yb3V0ZXInXSlcbiAgICAuY29uc3RhbnQoJ0FQSUJhc2VMb2NhdGlvbicsICdBUEkvJylcbiAgICAuc2VydmljZSgnU3lzdGVtJywgU3lzdGVtQ29udHJvbGxlcilcbiAgICAucHJvdmlkZXIoJ01vZHVsZVN0YXRlcycsIE1vZHVsZVN0YXRlc1Byb3ZpZGVyKVxuICAgIC5mYWN0b3J5KCdBUEknLCBBUElGYWN0b3J5KTsiLCJmdW5jdGlvbiBBY2NvdW50c0NvbmZpZyhNb2R1bGVTdGF0ZXNQcm92aWRlcikge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBNb2R1bGVTdGF0ZXNQcm92aWRlci5yZWdpc3Rlck1vZHVsZSgnQWNjb3VudHMnLCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHNob3dJbk1lbnU6IHRydWUsXG4gICAgICAgICAgICBtZW51TmFtZTogJ0FjY291bnRzJyxcbiAgICAgICAgICAgIGljb246ICdmYSBmYS11c2VycyBmYS1mdycsXG4gICAgICAgICAgICBuYW1lOiAnYWNjb3VudHMnLFxuICAgICAgICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICAgICAgICBzdGF0ZToge1xuICAgICAgICAgICAgICAgIHVybDogJy9hY2NvdW50cycsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0AnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvYWNjb3VudHMvYWNjb3VudHMuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQWNjb3VudHNDb250cm9sbGVyIGFzIEFjY291bnRzJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgXSk7XG59XG5cbmZ1bmN0aW9uIEFjY291bnRzQ29udHJvbGxlcihTeXN0ZW0sICRsb2csICRmaWx0ZXIsICRodHRwKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBBY2NvdW50cyA9IHRoaXM7XG4gICAgdmFyIGFsbEFjY291bnRzID0gW107XG4gICAgdmFyIGdyaWRTdGF0ZTtcbiAgICAkbG9nLmRlYnVnKEFjY291bnRzKTtcbiAgICBcbiAgICBmdW5jdGlvbiBkb0ZpbHRlcigpIHtcbiAgICAgICAgZ3JpZFN0YXRlLnRvdGFsID0gYWxsQWNjb3VudHMubGVuZ3RoO1xuICAgICAgICBBY2NvdW50cy5saXN0ID0gYWxsQWNjb3VudHMuc2xpY2UoKGdyaWRTdGF0ZS5wYWdlIC0gMSkgKiBncmlkU3RhdGUucGVyUGFnZSwgZ3JpZFN0YXRlLnBhZ2UgKiBncmlkU3RhdGUucGVyUGFnZSk7XG4gICAgfVxuICAgIFxuICAgICRodHRwLmdldCgnYWNjb3VudHMucGhwJykudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBhbGxBY2NvdW50cyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIGRvRmlsdGVyKCk7XG4gICAgfSk7XG4gICAgXG4gICAgdmFyIGNvbHVtbnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ0FjY291bnRzJyxcbiAgICAgICAgICAgIG5hbWU6ICduYW1lJyxcbiAgICAgICAgICAgIG92ZXJyaWRlOiBmdW5jdGlvbiAoY2VsbCwgY29sdW1uLCByb3cpIHtcbiAgICAgICAgICAgICAgICAvLyBqc2hpbnQgdW51c2VkOmZhbHNlXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuICc8YSBocmVmPVwiJyArIHJvdy5hY2NvdW50X3VybCArICdcIiB0YXJnZXQ9XCJfYmxhbmtcIj4nICsgY2VsbCArICc8L2E+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ2FjY291bnRfdXJsJyxcbiAgICAgICAgICAgIGhpZGRlbjogdHJ1ZVxuICAgICAgICB9XG4gICAgXTtcbiAgICBcbiAgICBBY2NvdW50cy5nZXRBY2NvdW50cyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgIHZhciBzb3J0ID0gc3RhdGUuc29ydDtcbiAgICAgICAgdmFyIGRpcmVjdGlvbiA9IHN0YXRlLnNvcnREaXJlY3Rpb24gfHwgJ0RFU0MnO1xuICAgICAgICBcbiAgICAgICAgZ3JpZFN0YXRlID0gc3RhdGU7XG4gICAgICAgIFxuICAgICAgICBhbGxBY2NvdW50cyA9ICRmaWx0ZXIoJ29yZGVyQnknKShhbGxBY2NvdW50cywgc29ydCwgZGlyZWN0aW9uID09PSAnREVTQycpO1xuICAgICAgICBcbiAgICAgICAgZG9GaWx0ZXIoKTtcbiAgICAgICAgc3RhdGUuZ3JpZENvbHVtbnMgPSBjb2x1bW5zO1xuICAgIH07XG59XG5cbmFuZ3VsYXIubW9kdWxlKCdwb2UuYWNjb3VudHMnLCBbJ3N5c3RlbSddKVxuICAgIC5jb250cm9sbGVyKCdBY2NvdW50c0NvbnRyb2xsZXInLCBBY2NvdW50c0NvbnRyb2xsZXIpXG4gICAgLmNvbmZpZyhBY2NvdW50c0NvbmZpZyk7IiwiZnVuY3Rpb24gTGFkZGVyQ29uZmlnKE1vZHVsZVN0YXRlc1Byb3ZpZGVyKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIE1vZHVsZVN0YXRlc1Byb3ZpZGVyLnJlZ2lzdGVyTW9kdWxlKCdMYWRkZXInLCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHNob3dJbk1lbnU6IHRydWUsXG4gICAgICAgICAgICBtZW51TmFtZTogJ0xhZGRlcicsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtYmFyLWNoYXJ0IGZhLWZ3JyxcbiAgICAgICAgICAgIG5hbWU6ICdsYWRkZXInLFxuICAgICAgICAgICAgcHJpb3JpdHk6IDAsXG4gICAgICAgICAgICBzdGF0ZToge1xuICAgICAgICAgICAgICAgIHVybDogJy86ZmlsdGVyJyxcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICAnQCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnbW9kdWxlcy9sYWRkZXIvbGFkZGVyLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0xhZGRlckNvbnRyb2xsZXIgYXMgTGFkZGVyJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgXSk7XG59XG5cbmZ1bmN0aW9uIExhZGRlckNvbnRyb2xsZXIoJGxvZywgJGh0dHAsICRmaWx0ZXIsICRzY29wZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgdmFyIExhZGRlciA9IHRoaXM7XG4gICAgdmFyIGFsbENoYXJhY3RlcnMgPSBbXTtcbiAgICB2YXIgZ3JpZFN0YXRlO1xuICAgICRsb2cuZGVidWcoJHN0YXRlUGFyYW1zLmZpbHRlcik7XG4gICAgXG4gICAgTGFkZGVyLmZpbHRlciA9ICRzdGF0ZVBhcmFtcy5maWx0ZXI7XG4gICAgXG4gICAgZnVuY3Rpb24gZG9GaWx0ZXIoKSB7XG4gICAgICAgIGlmKCFhbGxDaGFyYWN0ZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgZmlsdGVyZWRDaGFyYWN0ZXJzID0gYWxsQ2hhcmFjdGVycztcbiAgICAgICAgXG4gICAgICAgIGlmKExhZGRlci5maWx0ZXIpIHtcbiAgICAgICAgICAgIGZpbHRlcmVkQ2hhcmFjdGVycyA9ICRmaWx0ZXIoJ2ZpbHRlcicpKGFsbENoYXJhY3RlcnMsIExhZGRlci5maWx0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBncmlkU3RhdGUudG90YWwgPSBmaWx0ZXJlZENoYXJhY3RlcnMubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgTGFkZGVyLmNoYXJhY3RlcnMgPSBmaWx0ZXJlZENoYXJhY3RlcnMuc2xpY2UoKGdyaWRTdGF0ZS5wYWdlIC0gMSkgKiBncmlkU3RhdGUucGVyUGFnZSwgZ3JpZFN0YXRlLnBhZ2UgKiBncmlkU3RhdGUucGVyUGFnZSk7XG4gICAgfVxuICAgIFxuICAgICRodHRwLmdldCgnc2NyYXBlci5waHAnKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIGFsbENoYXJhY3RlcnMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICBkb0ZpbHRlcigpO1xuICAgIH0pO1xuICAgIFxuICAgICRodHRwLmdldCgnbWV0YS5waHAnKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIExhZGRlci5zdGF0dXMgPSByZXNwb25zZS5kYXRhLnN0YXR1cyArICcgJztcbiAgICAgICAgTGFkZGVyLmxhc3RVcGRhdGVUaW1lID0gcmVzcG9uc2UuZGF0YS5sYXN0X2xhZGRlcl91cGRhdGUgKyAnMDAwJztcbiAgICAgICAgTGFkZGVyLmxhc3RQcm9jZXNzVGltZSA9IHJlc3BvbnNlLmRhdGEubGFzdF9wcm9jZXNzX3RpbWU7XG4gICAgfSk7XG4gICAgXG4gICAgdmFyIGNvbHVtbnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ1JhbmsnLFxuICAgICAgICAgICAgbmFtZTogJ3JhbmsnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ0NsYXNzJyxcbiAgICAgICAgICAgIG5hbWU6ICdjbGFzcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnTGV2ZWwnLFxuICAgICAgICAgICAgbmFtZTogJ2xldmVsJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdFeHBlcmllbmNlJyxcbiAgICAgICAgICAgIG5hbWU6ICdleHBlcmllbmNlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdTdGF0dXMnLFxuICAgICAgICAgICAgbmFtZTogJ3N0YXR1cycsXG4gICAgICAgICAgICBvdmVycmlkZTogZnVuY3Rpb24oY2VsbCwgY29sdW1uLCByb3csIHJvd0luZGV4KSB7XG4gICAgICAgICAgICAgICAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICAgICAgICAgICAgICAgIGlmKGNlbGwgPT09ICdEZWFkJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2VsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICc8c3RhdHVzLWxpZ2h0IHN0YXR1cz1cIlxcJycgKyAoY2VsbCA9PT0gJ29mZmxpbmUnID8gJ2RhbmdlcicgOiAnb2snKSArICdcXCdcIj48L3N0YXR1cy1saWdodD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdFeHBlcmllbmNlIGdhaW5lZCBsYXN0IGhvdXIgKEFwcHJveC4pJyxcbiAgICAgICAgICAgIG5hbWU6ICdleHBlcmllbmNlX2xhc3RfaG91cidcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnTmFtZScsXG4gICAgICAgICAgICBuYW1lOiAnbmFtZScsXG4gICAgICAgICAgICBvdmVycmlkZTogZnVuY3Rpb24gKGNlbGwsIGNvbHVtbiwgcm93KSB7XG4gICAgICAgICAgICAgICAgLy8ganNoaW50IHVudXNlZDpmYWxzZVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiAnPGEgaHJlZj1cIicgKyByb3cuYWNjb3VudF91cmwgKyAnXCIgdGFyZ2V0PVwiX2JsYW5rXCI+JyArIGNlbGwgKyAnPC9hPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdhY2NvdW50X3VybCcsXG4gICAgICAgICAgICBoaWRkZW46IHRydWVcbiAgICAgICAgfVxuICAgIF07XG4gICAgXG4gICAgJHNjb3BlLiR3YXRjaCgnTGFkZGVyLmZpbHRlcicsIGZ1bmN0aW9uKG5ld1ZhbHVlKSB7XG4gICAgICAgIGlmKG5ld1ZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBkb0ZpbHRlcigpO1xuICAgIH0pO1xuICAgIFxuICAgIExhZGRlci5nZXRDaGFyYWN0ZXJzID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgdmFyIHNvcnQgPSBzdGF0ZS5zb3J0IHx8ICdyYW5rJztcbiAgICAgICAgdmFyIGRpcmVjdGlvbiA9IHN0YXRlLnNvcnREaXJlY3Rpb24gfHwgJ0FTQyc7XG4gICAgICAgIFxuICAgICAgICBncmlkU3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGlmKHNvcnQgPT09ICdleHBlcmllbmNlJyB8fCBzb3J0ID09PSAnbGV2ZWwnKSB7XG4gICAgICAgICAgICBzb3J0ID0gWydsZXZlbCcsICdleHBlcmllbmNlJ107XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGFsbENoYXJhY3RlcnMgPSAkZmlsdGVyKCdvcmRlckJ5JykoYWxsQ2hhcmFjdGVycywgc29ydCwgZGlyZWN0aW9uID09PSAnREVTQycpO1xuICAgICAgICBcbiAgICAgICAgZG9GaWx0ZXIoKTtcbiAgICAgICAgc3RhdGUuZ3JpZENvbHVtbnMgPSBjb2x1bW5zO1xuICAgIH07XG4gICAgXG4gICAgTGFkZGVyLmdldENsYXNzZXNGb3JSb3cgPSBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgaWYocm93LnN0YXR1cyA9PT0gJ0RlYWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2RlYWQnO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3BvZS5sYWRkZXInLCBbJ3N5c3RlbScsICd1aS5ib290c3RyYXAnLCAnbXZsLmdyaWQnLCAnbXZsLnN0YXR1c2xpZ2h0J10pXG4gICAgLmNvbnRyb2xsZXIoJ0xhZGRlckNvbnRyb2xsZXInLCBMYWRkZXJDb250cm9sbGVyKVxuICAgIC5jb25maWcoTGFkZGVyQ29uZmlnKVxuICAgIC5maWx0ZXIoJ3NlY29uZHNUb0RhdGVUaW1lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihzZWNvbmRzKSB7XG4gICAgICAgICAgICBpZihzZWNvbmRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2Vjb25kcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkID0gbmV3IERhdGUoMCwwLDAsMCwwLDAsMCk7XG4gICAgICAgICAgICBkLnNldFNlY29uZHMoc2Vjb25kcyk7XG4gICAgICAgICAgICByZXR1cm4gZC5nZXRUaW1lKCk7XG4gICAgICAgIH07XG4gICAgfSk7IiwiZnVuY3Rpb24gUnVsZXNDb25maWcoTW9kdWxlU3RhdGVzUHJvdmlkZXIpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgTW9kdWxlU3RhdGVzUHJvdmlkZXIucmVnaXN0ZXJNb2R1bGUoJ1J1bGVzJywgW1xuICAgICAgICB7XG4gICAgICAgICAgICBzaG93SW5NZW51OiB0cnVlLFxuICAgICAgICAgICAgbWVudU5hbWU6ICdSdWxlcycsXG4gICAgICAgICAgICBpY29uOiAnZmEgZmEtbGlzdC1vbCBmYS1mdycsXG4gICAgICAgICAgICBuYW1lOiAncnVsZXMnLFxuICAgICAgICAgICAgcHJpb3JpdHk6IDIsXG4gICAgICAgICAgICBzdGF0ZToge1xuICAgICAgICAgICAgICAgIHVybDogJy9ydWxlcycsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0AnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ21vZHVsZXMvcnVsZXMvcnVsZXMuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF0pO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgncG9lLnJ1bGVzJywgW10pXG4gICAgLmNvbmZpZyhSdWxlc0NvbmZpZyk7IiwiZnVuY3Rpb24gQXBwQ29uZmlnKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvZ1Byb3ZpZGVyKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAkbG9nUHJvdmlkZXIuZGVidWdFbmFibGVkKHRydWUpO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgncG9lbGFkZGVyJywgW1xuICAgICAgICAndWkucm91dGVyJyxcbiAgICAgICAgJ3RlbXBsYXRlcycsXG4gICAgICAgICdzeXN0ZW0nLFxuICAgICAgICAncG9lLm5hdmJhcicsXG4gICAgICAgICdwb2UuYWNjb3VudHMnLFxuICAgICAgICAncG9lLnJ1bGVzJyxcbiAgICAgICAgJ3BvZS5sYWRkZXInXG4gICAgXSlcbiAgICAuY29uZmlnKEFwcENvbmZpZyk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
