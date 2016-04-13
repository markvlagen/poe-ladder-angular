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
    .directive('cellValue', function($compile) {
        'use strict';
        return function (scope, element, attributes) {
            scope.$watch(function(scope) {
                return scope.$eval(attributes.cellValue);
            }, function(value) {
                element.html(value);
    
                $compile(element.contents())(scope);
            });
        };
    });
