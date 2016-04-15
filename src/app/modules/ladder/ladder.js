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