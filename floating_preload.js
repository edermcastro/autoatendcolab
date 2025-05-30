const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateCount: (callback) => ipcRenderer.on('update-count', (_event, value) => callback(value)),
    showMainWindow: () => ipcRenderer.send('show-main-window')
    // Remova a linha abaixo:
    // startDrag: (offset) => ipcRenderer.send('drag-float-window', offset)
});