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