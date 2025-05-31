const { app, contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onLoadData: (callback) => ipcRenderer.on('load-data', (_event, value) => callback(value)),
    selectAtendID: (callback) => ipcRenderer.on('select-atend-id', (_event, data) => callback(data)),
    iniciaAtendimento: (itemId) => ipcRenderer.send('iniciar-atendimento', itemId),

    logoutApp: () => ipcRenderer.send('logout'),
    saveObservation: (data) => ipcRenderer.send('save-observation', data),
    
            
    updVersion: (callback) => ipcRenderer.on('update_version',(_event,arg) => callback(arg)),
    updMessage: (callback) => ipcRenderer.on('update_message', (_event,data) => callback(data)),
    updPercent: (callback) => ipcRenderer.on('update_percent',  (_event,data) => callback(data)),
    atualVersion: (callback) => ipcRenderer.on('atual_version',  (_event,data) => callback(data)),
    updNVersion: (callback) => ipcRenderer.on('update_new_version',  (_event,data) => callback(data)),

    // updateMessage: (data) => ipcRenderer.send('update_message', data),
    // updPercent: (data) => ipcRenderer.send('update_percent', data),
    // atualVersion: (data) => ipcRenderer.send('atual_version', data),
    // updNVersion: (data) => ipcRenderer.send('update_new_version', data),
    
});