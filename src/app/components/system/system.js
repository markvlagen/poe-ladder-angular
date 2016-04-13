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