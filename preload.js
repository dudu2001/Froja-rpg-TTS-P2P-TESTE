const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    ligarServidor: () => ipcRenderer.send('solicitar-ligar-servidor'),
    onServidorPronto: (callback) => ipcRenderer.on('servidor-pronto', (event, url) => callback(url))
});