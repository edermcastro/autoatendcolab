const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getOperators: () => ipcRenderer.invoke('get-operators'),
    selectOperator: (operatorName) => ipcRenderer.send('select-operator', operatorName),
    showVersion: (version) => ipcRenderer.on('show-version', version),
    onOperatorResponse: (callback) => ipcRenderer.on('operator-response', (_event, response) => callback(response)),
    quitApp : () => ipcRenderer.send('sair'),
});