const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateCount: (callback) => ipcRenderer.on('update-count', (_event, value) => callback(value)),
    onAtendimentoStatusChanged: (callback) => ipcRenderer.on('atendimento-status-changed', (_event, status) => callback(status)),
    refreshCount: () => ipcRenderer.send('refresh-count'),
    showMainWindow: () => ipcRenderer.send('chamar-fila'),
    showMenu: () => ipcRenderer.send('show-context-menu')
});