const { app, contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    //carrega todos os atendimentos na fila
    onLoadData: (callback) => ipcRenderer.on('load-data', (_event, data) => callback(data)),

    //seleciona o atendimento atual
    selectAtendID: (callback) => ipcRenderer.on('select-atend-id', (_event, data) => callback(data)),

    //inicia o atendimento atual
    iniciaAtendimento: (itemId) => ipcRenderer.send('iniciar-atendimento', itemId),

    //salva a observação do atendimento
    saveObservation: (data) => ipcRenderer.send('save-observation', data),

    //sai do colaborador atual
    logoutApp: () => ipcRenderer.send('logout'),
    
            
    //sistema de atualizações
    updVersion: (callback) => ipcRenderer.on('update_version',(_event,arg) => callback(arg)),
    updMessage: (callback) => ipcRenderer.on('update_message', (_event,data) => callback(data)),
    updPercent: (callback) => ipcRenderer.on('update_percent',  (_event,data) => callback(data)),
    atualVersion: (callback) => ipcRenderer.on('atual_version',  (_event,data) => callback(data)),
    updNVersion: (callback) => ipcRenderer.on('update_new_version',  (_event,data) => callback(data)),

});