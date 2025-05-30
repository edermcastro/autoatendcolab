const { app, contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onLoadData: (callback) => ipcRenderer.on('load-data', (_event, value) => callback(value)),
    sendNextStep: (itemId) => ipcRenderer.send('next-step', itemId),
    quitApp : () => ipcRenderer.send('sair'),
    saveObservation: (data) => ipcRenderer.send('save-observation', data), // data = { itemId, observation }

    updAvailable: () => ipcRenderer.on('update-available',(event,arg)=>{
        console.log(arg);
    }),
    currVersion: () => ipcRenderer.on('current_version',(event,arg)=>{
        console.log('Versão atual = ' + arg);
    }),
    updError: () => ipcRenderer.on('error',(event,arg)=>{
        console.log('error = ' + arg);
    }),
});