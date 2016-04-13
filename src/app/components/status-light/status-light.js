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