const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    login: (credentials) => ipcRenderer.send('login-attempt', credentials),
    onLoginResponse: (callback) => ipcRenderer.on('login-response', (_event, response) => callback(response)),
    tokenExists: () => ipcRenderer.send('token-exists')
});