;(function(){

'use strict';

angular.module('templates', []).run(['$templateCache', function($templateCache) {

  $templateCache.put('components/grid/grid.html', '<div class="row" ng-if="Grid.state.total > Grid.state.perPage && Grid.pagination !== false"><div class="col-xs-12 text-center"><uib-pagination max-size="10" boundary-links="true" total-items="Grid.state.total" items-per-page="Grid.state.perPage" ng-model="Grid.state.page" class="pagination-sm" previous-text="&lsaquo;" next-text="&rsaquo;" first-text="&laquo;" last-text="&raquo;"></uib-pagination></div></div><div class="row"><div class="col-xs-12"><div class="table-responsive"><table class="table table-striped table-condensed"><thead><tr><th ng-if="!column.hidden" ng-repeat="column in Grid.columnDefinition" ng-class="{\'sorted-asc\': (Grid.state.sort == column[Grid.columnKey || \'name\'] && Grid.state.sortDirection == \'ASC\'), \'sorted-desc\': (Grid.state.sort == column[Grid.columnKey || \'name\'] && Grid.state.sortDirection == \'DESC\'), \'sortable\': Grid.isSortable(column)}" ng-style="{width: column.width || auto}" ng-click="Grid.sort(column)">{{column[Grid.columnName]}}</th></tr></thead><tfoot><tr ng-if="Grid.footer"><td>Foot</td></tr></tfoot><tbody><tr ng-repeat="row in Grid.rows" ng-class="Grid.getClassesForRow(row)" ng-init="$rowIndex = $index + ((Grid.state.page - 1) * Grid.state.perPage || 0)"><td ng-if="!column.hidden" class="{{ column[Grid.columnKey] }}" data-value="{{ row[column[Grid.columnKey]] }}" ng-repeat="column in Grid.columnDefinition" ng-init="$colIndex = $index; $index = $rowIndex" cell-value="::Grid.getValue(row, column, $index)"></td></tr></tbody></table></div></div></div><div class="row" ng-if="Grid.state.total > Grid.state.perPage && Grid.pagination !== false"><div class="col-xs-12 text-center"><uib-pagination max-size="10" boundary-links="true" total-items="Grid.state.total" items-per-page="Grid.state.perPage" ng-model="Grid.state.page" class="pagination-sm" previous-text="&lsaquo;" next-text="&rsaquo;" first-text="&laquo;" last-text="&raquo;"></uib-pagination></div></div>');

  $templateCache.put('components/navbar/navbar.html', '<ul class="nav nav-pills" role="tablist"><li ng-class="{active: Navbar.isActive(module)}" ng-repeat="module in Navbar.ModuleStates | filter:{showInMenu: true} | orderBy:\'priority\'"><a ui-sref="{{module.name}}"><i class="{{module.icon}}"></i> {{module.menuName}}</a></li><form name="register" class="form-inline"><input type="text" id="poe-account" class="form-control" placeholder="SSF_YOUR_ACCOUNT" ng-model="Navbar.accountName" ng-readonly="Navbar.registered"> <button type="button" class="btn btn-primary" ng-click="Navbar.registerAccount(Navbar.accountName)" ng-if="!Navbar.registered">Register Account and Remember</button> <button type="button" class="btn btn-default" ng-click="Navbar.undoStorage()" ng-if="Navbar.registered">Forget</button></form></ul>');

  $templateCache.put('components/status-light/status-light.html', '<div class="status-light" ng-style="StatusLight.style"></div>');

  $templateCache.put('modules/accounts/accounts.html', '<div class="row"><div class="col-xs-12"><h1>Accounts</h1></div></div><div class="row"><div class="col-xs-12"><navbar></navbar></div></div><div class="row"><div class="col-xs-12"><h5>If you do not make your profile **PUBLIC** I wont be able to confirm the legitimacy of the account and list you on our ladder. You will be denied from the standings.</h5></div></div><div class="row"><div class="col-xs-12"><grid data="Accounts.list" get-data="Accounts.getAccounts(state)" pagination="100"></grid></div></div>');

  $templateCache.put('modules/ladder/ladder.html', '<div class="row"><div class="col-xs-12"><h1>Ladder <small>Last update on {{ Ladder.lastUpdateTime | date:"dd-MM-yyyy \'at\' HH:mm:ss" }} which took {{ Ladder.lastProcessTime | secondsToDateTime | date:"m \'minutes and\' s \'seconds\'"}}</small></h1></div></div><div class="row"><div class="col-xs-12"><navbar></navbar></div></div><form name="filter" class="form-horizontal"><div class="form-group"><label for="filter" class="col-sm-1 control-label">Search:</label><div class="col-sm-11"><input class="form-control" type="text" id="filter" ng-model="Ladder.filter" placeholder="SSF_Kripparrian"></div></div></form><div class="row"><div class="col-xs-12"><uib-alert ng-if="Ladder.status" close="Ladder.status = \'\'">{{ Ladder.status }}</uib-alert><grid data="Ladder.characters" get-data="Ladder.getCharacters(state)" get-classes-for-row="Ladder.getClassesForRow" pagination="100"></grid></div></div>');

  $templateCache.put('modules/rules/rules.html', '<div class="row"><div class="col-xs-12"><h1>Rules</h1></div></div><div class="row"><div class="col-xs-12"><navbar></navbar></div></div><div class="row"><div class="col-xs-12"><pre>#SSFChallenge2016\n\nSolo Self-Found Hardcore Challenge\n\nThe objective is to reach level 100. The winner is decided based of the least total /played time of every character in the Hardcore Perandus league. This includes both your main character and any gem mules you have made. Those who do not wish to aim for level 100 may challenge themselves to see how fast they can level to certain stages in the game and compare the results with friends.\n\n\n\n\nADD YOUR ACCOUNT TO THE LIST / LADDER HERE: http://159.203.162.232:9094/signup/AccountNameHere\n\nDISCORD SERVER OPEN TO ANYONE PARTICIPATING: https://discord.gg/0vBZaJGhlkLIRMKE If you need more channels ask a mod to create one for you specifically.\n\nGLOBAL CHANNEL FOR ANYONE PARTICIPATING: /GLOBAL 11 12 13\n\n\n\nRules:\n\n1. You must use a new account with no additional account features. The character and account name needs to contain the tag SSF_. For example "SSF_Kripparrian".  ** YOU MUST UNCHECK THE “HIDE CHARACTER TAB” IN YOUR PRIVACY SETTINGS **\n\n2. Only characters in the Hardcore Perandus League are eligible. If your character dies the challenge ends and you must start over. Unlimited restarts are allowed. The player must make a new account every time they restart to avoid unfair advantages and master crafting experience.\n\n3. The Scion class is allowed but it is not unlocked by default. Time spent unlocking the Scion will not be counted towards the total /played of that account, however, you need to do it in a league that is not Hardcore Perandus to avoid gaining an advantage and master levels.\n\n4. Muling is allowed and it will count towards your global /played time. No deleting characters. The player has full use of their stash.\n\n5. The challenge is purely solo and self-found. You cannot visit other players hideouts or share master crafting.\n\n6. To be clear this is a purely solo race, there is absolutely no situation where it is okay to trade or receive help from other players.\n\n\nFAQ:\nQ:Is there a ladder?\nA: Yes we will have ladder running with people being able to log in and post their results etc. We will also have a separate ladder running that will help detecting potential cheaters etc.\n\nQ: How will you prevent people from cheating?\nA: It\'s a gentlemen\'s agreement for the most part however we do have ways out finding out if you cheated. The rules are clear and you are doing this for yourself. That\'s also the reason there is no prize, to not promote cheating.\n\nQ: Is Leo and PVP allowed?\nA: Yes it is allowed however do keep in mind you still cannot group up, share missions or share masters. All time spent on leveling masters will be counted towards your total /played time.\n\nQ: Do I still need to make a new account if I have no characters in the Perandus Hardcore League and still want to join so I don\'t have to do the Scion quest?\nA: I suggest you make a new account. Obviously we cannot enforce this on anyone and at the end of the day you\'re doing this challenge for yourself HOWEVER if you want to be eligible for the actual competition you should make a new account like the rest of us.</pre></div></div>');

}]);

})();