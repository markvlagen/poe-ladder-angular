function RulesConfig(ModuleStatesProvider) {
    'use strict';
    ModuleStatesProvider.registerModule('Rules', [
        {
            showInMenu: true,
            menuName: 'Rules',
            icon: 'fa fa-list-ol fa-fw',
            name: 'rules',
            priority: 0,
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