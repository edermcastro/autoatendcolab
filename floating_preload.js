const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateCount: (callback) => ipcRenderer.on('update-count', (_event, value) => callback(value)),
    showMainWindow: () => ipcRenderer.send('chamar-fila'),
    showMenu: () => ipcRenderer.send('show-context-menu')
});