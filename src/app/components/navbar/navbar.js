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