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