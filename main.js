const { app, BrowserWindow, ipcMain, screen, net, dialog, Menu } = require('electron');
// const { app: singleInstanceLock } = require('electron-single-instance');
const path = require('path');
const fs = require('fs');

const { autoUpdater, AppUpdater } = require('electron-updater');
const pjson = require(path.join(__dirname, '', 'package.json'));

let floatingWin;
let mainWin;
let loginWin;
let operatorWin;
let updateWin;

const dataPath = path.join(__dirname, 'data.json'); // Caminho para o JSON (backup local)
const settingsPath = path.join(app.getPath('userData'), 'settings.json'); // Caminho para as configurações

//! api
const apiUrl = 'https://aapi.linco.work/';
//! pusher 
const pusherUrl = apiUrl;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

//? Função para ler as configurações
function getSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const settingsData = fs.readFileSync(settingsPath, 'utf-8');
            return JSON.parse(settingsData);
        }
    } catch (error) {
        console.error('Erro ao ler arquivo de configurações: ', error);
    }
    return {}; // Retorna objeto vazio se o arquivo não existir ou houver erro
}

//? Função para salvar as configurações
function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Erro ao salvar arquivo de configurações:', error);
    }
}

ipcMain.handle('get-setting', (event, key) => {
    const settings = getSettings();
    return settings[key];
});

ipcMain.on('set-setting', (event, key, value) => {
    const settings = getSettings();
    settings[key] = value;
    saveSettings(settings);
    app.relaunch();
    app.exit();
});
//! final de configurações

//impede que o app seja executado mais de uma vez
const gotTheLock = app.requestSingleInstanceLock();

// Função para configurar inicialização automática
function setAutoLaunch(start) {
    app.setLoginItemSettings({
        openAtLogin: start,
        path: app.getPath('exe'), // Aponta para o executável do seu app
    });
}

// Função modificada para buscar dados da API
async function readData() {
    try {
        // Verifica se existe token de autenticação
        const token = await getAuthToken();
        const colabId = await floatingWin.webContents.executeJavaScript("localStorage.getItem('idOperator')")

        if (!token || !colabId) {
            console.log("Usuário não autenticado, retornando lista vazia");
            return [];
        }

        // Tenta buscar dados da API
        return await fetchDataFromAPI();

    } catch (error) {
        console.error("Erro ao buscar dados da API:", error);
    }
}

// Função para buscar dados da API
async function fetchDataFromAPI() {
    //executa uma vez e a cada 30 segundos

    //!primeira requisição é feita para API
    getFirstData();

    //! as outras é o websockt que solicita a chamada  de requisições em busca de alterações
    const updData = setInterval(() => {
        getDataAndUpdateFloatingBtn();
    }, 30000);

    const updVersion = setTimeout(() => {
        if (pjson.isBuildNow) {
            autoUpdater.checkForUpdates();
        }
    }, 300000);
}

async function getFirstData() {
    const token = await getAuthToken();
    const colab = await getSelectedOperator();
    const colabId = await getSelectedOperatorId();
    const tenantId = await getTenantId();
    const url = apiUrl + 'attendance/next-in-line/' + colabId;

    if (!token || !colabId) {
        console.warn("Token or colabId not found. Skipping API request.");
        return [];
    }

    return new Promise((resolve) => {
        const request = net.request({
            method: 'GET',
            url: url,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
                'x-tenant-id': tenantId,
                'x-colab': colab
            }
        });

        request.on('response', (response) => {
            let rawData = '';
            response.on('data', (chunk) => { rawData += chunk; });
            response.on('end', async () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    let proximos = Array.isArray(parsedData) ? parsedData : [];
                    
                    if (response.statusCode === 200) {
                        const proximosStr = JSON.stringify(proximos);
                        
                        // Sincroniza o localStorage de todas as janelas importantes
                        const updateStorageScript = `localStorage.setItem('proximos', ${JSON.stringify(proximosStr)})`;
                        
                        if (floatingWin && !floatingWin.isDestroyed()) {
                            floatingWin.webContents.executeJavaScript(updateStorageScript);
                            floatingWin.webContents.send('update-count', proximos.length);
                        }
                        
                        // SÓ atualiza a janela principal se NÃO houver atendimento em andamento
                        floatingWin.webContents.executeJavaScript("localStorage.getItem('atendimentoAtual')").then(atendimentoAtualId => {
                            if (!atendimentoAtualId && mainWin && !mainWin.isDestroyed()) {
                                mainWin.webContents.executeJavaScript(updateStorageScript);
                                mainWin.webContents.send('load-data', proximos);
                            }
                            resolve(proximos);
                        }).catch(err => {
                            console.error("Erro ao verificar atendimento atual:", err);
                            resolve(proximos);
                        });
                    } else {
                        console.error(`Erro API: ${response.statusCode}`);
                        resolve([]);
                    }
                } catch (error) {
                    console.error("Erro JSON:", error);
                    resolve([]);
                }
            });
        });

        request.on('error', (error) => {
            console.error("Erro rede:", error);
            resolve([]);
        });

        request.end();
    });
}

// Atualiza a função de monitoramento para realmente buscar dados a cada 30s (ou o que desejar)
async function getDataAndUpdateFloatingBtn() {
    await getFirstData();
}

// Função para verificar se o token existe no localStorage
async function getAuthToken() {
    return new Promise((resolve) => {
        if (loginWin && !loginWin.isDestroyed()) {
            loginWin.webContents.executeJavaScript('localStorage.getItem("authToken");')
                .then(token => resolve(token))
                .catch(() => resolve(null));
        } else if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.executeJavaScript('localStorage.getItem("authToken");')
                .then(token => resolve(token))
                .catch(() => resolve(null));
        } else if (floatingWin && !floatingWin.isDestroyed()) {
            floatingWin.webContents.executeJavaScript('localStorage.getItem("authToken");')
                .then(token => resolve(token))
                .catch(() => resolve(null));
        } else if (operatorWin && !operatorWin.isDestroyed()) {
            operatorWin.webContents.executeJavaScript('localStorage.getItem("authToken");')
                .then(token => resolve(token))
                .catch(() => resolve(null));
        } else {
            resolve(null);
        }
    });
}

// Função para verificar o tenantId no localStorage
async function getTenantId() {
    const checkWindow = async (win) => {
        if (win && !win.isDestroyed()) {
            try {
                const val = await win.webContents.executeJavaScript('localStorage.getItem("tenantId");');
                return (val && val !== 'null' && val !== 'undefined') ? val : null;
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    // Prioridade para janelas visíveis
    let id = await checkWindow(operatorWin);
    if (!id) id = await checkWindow(mainWin);
    if (!id) id = await checkWindow(floatingWin);
    if (!id) id = await checkWindow(loginWin);

    return id;
}

// Função para criar a janela de login
function createLoginWindow() {
    loginWin = new BrowserWindow({
        width: 500,
        height: 500,
        icon: "icon.ico",
        frame: true,
        autoHideMenuBar: true,

        webPreferences: {
            preload: path.join(__dirname, 'login_preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
        },
    });

    loginWin.loadFile('login.html');

    // loginWin.webContents.openDevTools();

    loginWin.on('closed', () => {
        loginWin = null;
    });
}

// Função para criar a janela de seleção de operador
function createOperatorWindow() {
    operatorWin = new BrowserWindow({
        width: 1200,//500
        height: 600,
        icon: "icon.ico",
        frame: true,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'operator_preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
        },
    });

    // operatorWin.webContents.openDevTools();
    operatorWin.webContents.executeJavaScript('localStorage.setItem("version","' + app.getVersion() + '")');

    operatorWin.loadFile('operator.html');

    operatorWin.on('closed', () => {
        operatorWin = null;
    });
}

function createUpdateWindow() {
    updateWin = new BrowserWindow({
        width: 600,
        height: 300,
        icon: "icon.ico",
        show: false, // Inicia oculta
        frame: true,
        autoHideMenuBar: true, // Oculta a barra de menus
        menuBarVisible: false, // Garante que a barra de menus começa 
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
        },
    });

    updateWin.loadFile('update.html');

    updateWin.on('closed', () => {
        updateWin = null;
    });
}


function createFloatingWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const winWidth = 60;
    const winHeight = 70;

    floatingWin = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        icon: "icon.ico",
        x: screenWidth - winWidth + 0,
        y: screenHeight - winHeight - 180,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        webPreferences: {
            preload: path.join(__dirname, 'floating_preload.js'),
            contextIsolation: true,
            nodeIntegration: true
        },
        backgroundColor: '#00000000',
        titleBarStyle: 'hidden',
        roundedCorners: false
    });


    floatingWin.loadFile('floating.html');

    // Envia a contagem inicial para a janela flutuante
    const data = readData();
    floatingWin.webContents.on('did-finish-load', () => {
        floatingWin.webContents.send('update-count', data.length);
    });

    floatingWin.on('closed', () => {
        floatingWin = null;
    });
}

function createMainWindow() {
    mainWin = new BrowserWindow({
        width: 1024,
        height: 600,
        icon: "icon.ico",
        show: false, // Inicia oculta
        frame: true, // Sem bordas, título, etc.
        autoHideMenuBar: true, // Oculta a barra de menus
        menuBarVisible: false, // Garante que a barra de menus começa 
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
        },
    });

    mainWin.loadFile('index.html');

    // if(!pjson.isBuildNow) {
    //     mainWin.webContents.openDevTools(); // Descomente para depurar
    // }

    mainWin.webContents.send('current_version', pjson.version);

    mainWin.on('close', (event) => {
        // Em vez de fechar, apenas oculta a janela principal
        if (!app.isQuitting) {
            event.preventDefault();
            mainWin.hide();
        }
    });

    mainWin.on('closed', () => {
        mainWin = null;
    });
}


if (pjson.isBuildNow) {
    autoUpdater.on('update-available', () => {
        let pth = autoUpdater.downloadUpdate();
        updateWin.show(); updateWin.focus();
        updateWin.webContents.send('update_message', `Uma nova versão está dispinível.`);
        updateWin.webContents.send('update_percent', pth);
    })
    autoUpdater.on('download-progress', (obj) => {
        updateWin.webContents.send('update_message', `Estamos baixando uma nova atualização.`);
    });
    autoUpdater.on('update-downloaded', (obj) => {
        updateWin.webContents.send('update_message', `Download concluído. Aguarde, vamos reiniciar para instalar!`);
        setTimeout(() => {
            autoUpdater.quitAndInstall();
        }, 5000);
    });
    autoUpdater.on('error', err => {
        updateWin.webContents.send('update_message', err);
    });
}


if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWin) {
            if (mainWin.isMinimized()) {
                mainWin.restore();
            }
            mainWin.focus();
        }
    });

    // Inicialização do aplicativo modificada para verificar autenticação
    app.whenReady().then(async () => {

        //define a inicialização automatica do aplicativo ao entrar no windows
        const settings = getSettings();
        const enableAutoStart = settings.autostart === undefined ? true : settings.autostart;
        setAutoLaunch(enableAutoStart);

        // Verifica se o usuário já está autenticado
        const token = await getAuthToken();

        if (!token) {
            // Se não estiver autenticado, mostra a tela de login
            createLoginWindow();
        } else {
            // Se já estiver autenticado, verifica se tem operador selecionado
            // const operator = await getSelectedOperator();

            if (!operator || operator === 'null' || operator === null || operator === undefined || operator === '') {
                // Se não tiver operador selecionado, mostra a tela de seleção
                createOperatorWindow();
            } else {
                // Se já tiver operador, inicia normalmente
                createFloatingWindow();
                createMainWindow();
            }
        }
        createUpdateWindow();

        app.on('activate', () => {
            // No macOS é comum recriar uma janela no aplicativo quando o
            // ícone do dock é clicado e não há outras janelas abertas.
            if (BrowserWindow.getAllWindows().length === 0) {
                // Poderia recriar a janela principal aqui se necessário,
                // mas como temos a flutuante, talvez não precise.
                if (!floatingWin) createFloatingWindow();
                if (!mainWin) createMainWindow();
                if (!updateWin) createUpdateWindow();
            }
        });

        if (pjson.isBuildNow) {
            autoUpdater.checkForUpdates();
        }

    });

}



// Função para verificar se já existe um operador selecionado
async function getSelectedOperator() {
    return new Promise((resolve) => {
        if (loginWin && !loginWin.isDestroyed()) {
            loginWin.webContents.executeJavaScript('localStorage.getItem("selectedOperator");')
                .then(operator => resolve(operator))
                .catch(() => resolve(null));
        } else if (operatorWin && !operatorWin.isDestroyed()) {
            operatorWin.webContents.executeJavaScript('localStorage.getItem("selectedOperator");')
                .then(operator => resolve(operator))
                .catch(() => resolve(null));
        } else if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.executeJavaScript('localStorage.getItem("selectedOperator");')
                .then(operator => resolve(operator))
                .catch(() => resolve(null));
        } else if (floatingWin && !floatingWin.isDestroyed()) {
            floatingWin.webContents.executeJavaScript('localStorage.getItem("selectedOperator");')
                .then(operator => resolve(operator))
                .catch(() => resolve(null));
        } else {
            resolve(null);
        }
    });
}

async function getSelectedOperatorId() {
    return new Promise((resolve, reject) => {
        if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.executeJavaScript('localStorage.getItem("idOperator");')
                .then(operatorId => resolve(operatorId))
                .catch(() => resolve(null));
        } else if (floatingWin && !floatingWin.isDestroyed()) {
            floatingWin.webContents.executeJavaScript('localStorage.getItem("idOperator");')
                .then(operatorId => resolve(operatorId))
                .catch(() => resolve(null));
        } else {
            reject(new Error('Nenhum componente aberto'));
        }
    });
}

ipcMain.handle('get-pusher-config', async () => {
    // Garante que o host não termine com barra para o Socket.io
    let host = pusherUrl;
    if (host && host.endsWith('/')) {
        host = host.slice(0, -1); 
    }
    return { host: host };
});

ipcMain.on('update_version', async (event, arg) => {
    if (updateWin) {
        if (!updateWin.isVisible()) {
            updateWin.show();
            updateWin.focus();
        } else {
            updateWin.focus();
        }
    } else {
        createUpdateWindow();
        updateWin.webContents.on('did-finish-load', () => {
            updateWin.show();
            updateWin.focus();
        });
    }
});


// Ouvir pedido para obter contagem (ex: se o JSON for atualizado)
ipcMain.handle('get-count', async () => {
    const data = readData();
    return data.length;
});

let isCallingNext = false;

// Ouvir pedido para mostrar a janela principal
ipcMain.on('chamar-fila', async () => {
    // Evita múltiplas chamadas simultâneas
    if (isCallingNext) return;
    isCallingNext = true;

    // Primeiro, verifica se já existe um atendimento em andamento
    const atendimentoAtualId = await floatingWin.webContents.executeJavaScript("localStorage.getItem('atendimentoAtual')");

    const showMainWindow = () => {
        if (mainWin) {
            if (!mainWin.isVisible()) {
                mainWin.show();
                mainWin.focus();
            } else {
                mainWin.focus();
            }
        } else {
            createMainWindow(); // Cria se não existir
            mainWin.webContents.on('did-finish-load', () => {
                mainWin.show();
                mainWin.focus();
            });
        }
    }

    // Se um atendimento já estiver em andamento, apenas mostra a janela principal.
    if (atendimentoAtualId) {
        showMainWindow();
        isCallingNext = false;
        return;
    }

    const requestData = async () => {
        const colabId = await getSelectedOperatorId();
        const colab = await getSelectedOperator();
        const token = await getAuthToken();
        const tenantId = await getTenantId();
        const url = apiUrl + 'attendance/call-next/' + colabId;

        const request = net.request({
            method: 'POST',
            url: url,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
                'x-tenant-id': tenantId,
                'x-colab': colab
            }
        });

        request.on('response', (response) => {
            let rawData = '';
            response.on('data', (chunk) => { rawData += chunk; });
            response.on('end', () => {
                isCallingNext = false;
                try {
                    const parsedData = JSON.parse(rawData);
                    if (response.statusCode === 201 || response.statusCode === 200) {
                        if (parsedData) {
                            mainWin.webContents.send('select-atend-id', parsedData);
                            if (parsedData.status === 'Fila' || parsedData.status === 'Chamado') { 
                                showMainWindow(); 
                            } else if (parsedData.status === 'Atendendo') {
                                let options2 = {
                                    'title': 'Precisa finalizar antes de chamar o próximo.',
                                    'message': 'Em andamento',
                                    'detail': 'Já possui um atendimento em andamento (Atendendo: ' + parsedData.clientName + '), continue e finalize por favor!',
                                    'type': 'error',
                                    'buttons': ['Depois', 'Continuar'],
                                };
                                dialog.showMessageBox(floatingWin, options2).then(result => {
                                    if (result.response) {
                                        mainWin.webContents.send('show-observation');
                                        showMainWindow();
                                    } else {
                                        mainWin.hide();
                                    };
                                });
                            }
                        } else {
                            mainWin.webContents.send('select-atend-id', null);
                        }
                    } else {
                        console.error(`Erro na requisição: Status code ${response.statusCode}`, parsedData);
                        mainWin.webContents.send('api-error', {
                            message: `Erro ao chamar atendimento: ${parsedData.message || 'Erro desconhecido'}`
                        });
                    }
                } catch (error) {
                    console.error("Erro ao analisar a resposta JSON:", error);
                    mainWin.webContents.send('api-error', {
                        message: `Erro ao processar resposta do servidor.`
                    });
                }
            });
        });

        request.on('error', (error) => {
            isCallingNext = false;
            console.error("Erro na requisição:", error);
            mainWin.webContents.send('api-error', {
                message: `Erro ao chamar atendimento: ${error.message}`
            });
        });

        request.end();
    };

    const countFilaValue = async () => {
        const stored = await floatingWin.webContents.executeJavaScript("localStorage.getItem('proximos')");
        const proximos = JSON.parse(stored || '[]');
        return proximos.length;
    }

    let options = {
        'title': 'Incie o atendimento quando o cliente chegar na sala.',
        'message': 'Chamar um cliente da fila?',
        'type': 'warning',
        'noLink': true,
        'buttons': ['Não', 'Sim'],
    };

    const count = await countFilaValue();
    if (count > 0) {
        dialog.showMessageBox(floatingWin, options).then(result => {
            if (result.response === 1) { // 1 é 'Sim'
                requestData();
            } else {
                isCallingNext = false;
            }
        });
    } else {
        // Se a fila estiver vazia, apenas abre a janela principal para visualização
        showMainWindow();
        isCallingNext = false;
    }
});

// Ouve um pedido da janela flutuante para forçar a atualização da contagem
ipcMain.on('refresh-count', async () => {
    if (floatingWin) {
        const stored = await floatingWin.webContents.executeJavaScript("localStorage.getItem('proximos')");
        const proximos = JSON.parse(stored || '[]');
        floatingWin.webContents.send('update-count', proximos.length);
    }
});

ipcMain.on('select-atend-id', (itemId) => {
    selectedItemId = itemId;
    console.log(selectedItemId);
});

// Ouvir clique no botão "Iniciar atendimento"
ipcMain.on('iniciar-atendimento', async (event, itemId) => {

    const token = await getAuthToken();
    const tenantId = await getTenantId();
    const colabId = await getSelectedOperatorId();
    const colab = await getSelectedOperator();
    const url = apiUrl + 'attendance/' + itemId + '/start';

    // envio de uma solicitação POST com o ID do item
    const request = net.request({
        method: 'PATCH',
        url: url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'x-tenant-id': tenantId,
            'x-colab': colab
        }
    });

    request.on('response', (response) => {
        response.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        response.on('end', () => {
            console.log('Solicitação concluída.');
        });
    });
    request.on('error', (error) => {
        console.error(`Erro na solicitação: ${error}`);
    });

    request.end();
});

// Ouvir clique no botão "Rechamar" - chama novamente o mesmo atendimento
ipcMain.on('rechamar-atendimento', async (event, itemId) => {

    const token = await getAuthToken();
    const tenantId = await getTenantId();
    const colabId = await getSelectedOperatorId();
    const colab = await getSelectedOperator();
    // Rota correta para atualizar o status do item específico e disparar o chamado na TV
    const url = apiUrl + 'attendance/' + itemId + '/status';

    const request = net.request({
        method: 'PATCH',
        url: url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'x-tenant-id': tenantId,
            'x-colab': colab
        }
    });

    // Enviar o corpo com o status "Chamado"
    request.write(JSON.stringify({ 
        status: 'Chamado',
        collaboratorId: colabId 
    }));

    request.on('response', (response) => {
        response.on('data', (chunk) => {
            console.log(`Rechamar BODY: ${chunk}`);
        });
        response.on('end', () => {
            console.log('Rechamada concluída.');
        });
    });
    request.on('error', (error) => {
        console.error(`Erro na rechamada: ${error}`);
    });

    request.end();
});

// Encaminhar atendimento para outro colaborador
ipcMain.on('encaminhar-atendimento', async (event, { itemId, collaboratorId }) => {
    const token = await getAuthToken();
    const tenantId = await getTenantId();
    const colabId = await getSelectedOperatorId();
    const colab = await getSelectedOperator();
    const url = apiUrl + 'attendance/' + itemId + '/forward';

    const request = net.request({
        method: 'PATCH',
        url: url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'x-tenant-id': tenantId,
            'x-colab': colab
        }
    });

    request.write(JSON.stringify({ collaboratorId }));

    request.on('response', (response) => {
        response.on('data', (chunk) => {
            console.log(`Encaminhar BODY: ${chunk}`);
        });
        response.on('end', () => {
            console.log('Encaminhamento concluído.');
        });
    });
    request.on('error', (error) => {
        console.error(`Erro no encaminhamento: ${error}`);
    });

    request.end();
});

// Ouve quando um atendimento é iniciado e notifica a janela flutuante
ipcMain.on('atendimento-iniciado', (event, itemId) => {
    if (floatingWin) {
        floatingWin.webContents.send('atendimento-status-changed', 'iniciado');
    }
});

// Ouve quando um atendimento é finalizado e notifica a janela flutuante
ipcMain.on('atendimento-finalizado', () => {
    if (floatingWin) {
        floatingWin.webContents.send('atendimento-status-changed', 'finalizado');
    }
});

// Ouve atualização da fila vinda do renderer (via socket)
ipcMain.on('update-queue', (event, data) => {
    // Sempre busca dados frescos da API quando o socket notifica mudança,
    // pois o socket pode enviar apenas o objeto da mudança e não a lista completa.
    getFirstData();
});

// Ouvir clique no botão "Salvar"
ipcMain.on('save-observation', async (event, { itemId, observation }) => {

    console.log(`Salvando observação para item ${itemId}: ${observation}`);

    const token = await getAuthToken();
    const tenantId = await getTenantId();
    const colabId = await getSelectedOperatorId();
    const colab = await getSelectedOperator();
    const url = apiUrl + 'attendance/' + itemId + '/finish';

    const fmData = JSON.stringify({
        "observation": observation
    });


    // Simula o envio de uma solicitação POST com o ID do item
    const request = net.request({
        method: 'POST',
        url: url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'x-tenant-id': tenantId,
            'x-colab': colab
        }
    });

    request.on('response', (response) => {
        response.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        response.on('end', () => {
            console.log('Solicitação concluída.');
        });
    });
    request.on('error', (error) => {
        console.error(`Erro na solicitação: ${error}`);
    });

    // Envia o ID como corpo da requisição (exemplo)
    request.write(fmData);
    request.end();


    // Opcional: Fechar ou resetar a janela principal após salvar
    if (mainWin) {
        mainWin.hide();
    }
});

ipcMain.on('logout', () => {
    mainWin.webContents.executeJavaScript(`
            localStorage.removeItem("idOperator");
            localStorage.removeItem("selectedOperator");
            localStorage.removeItem("salaOperator");
            localStorage.removeItem("servicosOperator");
        `).then(() => {
        // Fecha a janela main e abre a janela de operador e inicia o aplicativo
        mainWin.hide();
        floatingWin.hide();
        createOperatorWindow();
        app.isReady();
    });
});

// Handler para login
ipcMain.on('login-attempt', async (event, credentials) => {
    try {
        const route = apiUrl + 'auth/login';

        const request = net.request({
            method: 'POST',
            url: route,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        let responseData = '';

        request.on('response', (response) => {
            response.on('data', (chunk) => {
                responseData += chunk.toString();
            });

            response.on('end', () => {
                try {
                    const data = JSON.parse(responseData);

                    if (data.access_token) {
                        // Tenta encontrar o tenantId em diferentes locais possíveis da resposta
                        const tenantId = data.tenantId || (data.user && data.user.tenantId) || (data.user && data.user.tenant_id);
                        
                        console.log(`Login bem-sucedido. Token presente. TenantId encontrado: ${tenantId}`);

                        // Login bem-sucedido
                        loginWin.webContents.executeJavaScript(`
                            localStorage.setItem("authToken", "${data.access_token}");
                            localStorage.setItem("tenantId", "${tenantId || ''}");
                        `).then(() => {
                            // Fecha a janela de login e abre a de seleção de operador
                            event.reply('login-response', { success: true });
                            loginWin.close();
                            createOperatorWindow();
                        });

                    } else {
                        // Login falhou
                        event.reply('login-response', {
                            success: false,
                            message: data.message || 'Falha na autenticação'
                        });
                    }
                } catch (error) {
                    event.reply('login-response', {
                        success: false,
                        message: 'Erro ao processar resposta do servidor'
                    });
                }
            });
        });

        request.on('error', (error) => {
            event.reply('login-response', {
                success: false,
                message: `Erro de conexão: ${error.message}`
            });
        });

        // Remove máscara do login (CPF/CNPJ) e da senha antes de enviar para a API
        const cleanLogin = credentials.login.replace(/[.\-\/]/g, '');
        const cleanPassword = credentials.password.replace(/[.\-\/]/g, '');

        // Envia as credenciais
        request.write(JSON.stringify({ login: cleanLogin, password: cleanPassword }));
        request.end();
    } catch (error) {
        event.reply('login-response', {
            success: false,
            message: `Erro: ${error.message}`
        });
    }
});

// Handler para seleção de operador
ipcMain.on('select-operator', async (event, operator) => {
    try {
        // Salva o operador selecionado
        operatorWin.webContents.executeJavaScript(`
            localStorage.setItem("idOperator", "${operator.id}");
            localStorage.setItem("selectedOperator", "${operator.name}");
            localStorage.setItem("salaOperator", "${operator.sala}");
            localStorage.setItem("servicosOperator", "${operator.servicos}");
        `).then(() => {
            // Fecha a janela de operador e inicia o aplicativo
            operatorWin.close();
            createFloatingWindow();
            createMainWindow();
            createUpdateWindow();
        });
    } catch (error) {
        event.reply('operator-response', {
            success: false,
            message: `Erro: ${error.message}`
        });
    }
});

// Handler para buscar lista de operadores
ipcMain.handle('get-operators', async () => {
    try {
        // Verifica se existe token de autenticação
        const token = await getAuthToken();
        const tenantId = await getTenantId();

        console.log(`Buscando operadores - TenantId: ${tenantId}, Token presente: ${!!token}`);

        if (!token) {
            return {
                success: false,
                message: 'Não autenticado',
                operators: []
            };
        }

        const route = apiUrl + 'collaborators';

        return new Promise(async (resolve) => {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // Garante que o tenantId é uma string válida e não "null" ou "undefined"
            if (tenantId && tenantId !== 'null' && tenantId !== 'undefined') {
                headers['x-tenant-id'] = tenantId;
            }

            // Adiciona x-colab se disponível
            const colab = await getSelectedOperator().catch(() => null);
            if (colab && colab !== 'null' && colab !== 'undefined') {
                headers['x-colab'] = colab;
            }

            const request = net.request({
                method: 'GET',
                url: route,
                headers: headers
            });

            let responseData = '';

            request.on('response', (response) => {
                let body = '';
                response.on('data', (chunk) => {
                    body += chunk.toString();
                });

                response.on('end', () => {
                    if (response.statusCode !== 200) {
                        console.error(`Erro na API (${response.statusCode}):`, body);
                        resolve({
                            success: false,
                            message: `Erro ${response.statusCode}: ${body}`,
                            operators: []
                        });
                        return;
                    }

                    try {
                        const data = JSON.parse(body);

                        if (Array.isArray(data)) {
                            const operators = data.map(colab => ({
                                id: colab._id,
                                name: colab.name.toUpperCase(),
                                sala: colab.roomId?.name || 'Sala',
                                servicos: colab.serviceIds?.map(s => s.name).join(',') || ''
                            }));

                            resolve({
                                success: true,
                                operators: operators
                            });
                        } else {
                            resolve({
                                success: false,
                                message: 'Resposta da API não é uma lista válida',
                                operators: []
                            });
                        }
                    } catch (error) {
                        resolve({
                            success: false,
                            message: 'Erro ao processar resposta do servidor',
                            operators: []
                        });
                    }
                });
            });

            request.on('error', (error) => {
                resolve({
                    success: false,
                    message: `Erro de conexão: ${error.message}`,
                    operators: []
                });
            });

            request.end();
        });
    } catch (error) {
        console.error('Erro ao obter operadores:', error);
        return {
            success: false,
            message: `Erro: ${error.message}`,
            operators: []
        };
    }
});

// Handler para verificar se o token já existe
ipcMain.on('token-exists', async () => {
    // Checa se o operador já foi selecionado
    const operator = await getSelectedOperator();

    // Fecha a janela de login, independentemente do operador já ter sido selecionado
    if (loginWin && !loginWin.isDestroyed()) {
        loginWin.close();
        loginWin = null; // Garante que a referência seja limpa
    }

    if (!operator || operator === 'null' || operator === null || operator === undefined || operator === '') {
        // Se não tiver operador selecionado, mostra a tela de seleção
        createOperatorWindow();
    } else {
        // Se já tiver operador, inicia normalmente
        createFloatingWindow();
        createMainWindow();
    }
    //TODO sempre que já existir um token ele checa por novas atualizações
    createUpdateWindow();
});


ipcMain.on('sair', () => {
    let exec = `
            localStorage.removeItem("idOperator");
            localStorage.removeItem("selectedOperator");
            localStorage.removeItem("salaOperator");
            localStorage.removeItem("servicosOperator");
        `;

    let options = {
        'title': 'Deseja realmente sair?',
        'message': 'Tem certeza que deseja fechar o Auto Atendimento?',
        'type': 'question',
        'buttons': ['Não', 'Sim'],
        'defaultId': 0,
        'cancelId': 0,
    };

    dialog.showMessageBox(floatingWin, options).then(result => {
        if (result.response === 1) { // Se o usuário clicou em "Sim" (índice 1)
            if (floatingWin) {
                floatingWin.webContents.executeJavaScript(exec).then(() => { app.exit(); });
            } else if (operatorWin) {
                operatorWin.webContents.executeJavaScript(exec).then(() => { app.exit(); });
            }
        }
    });

});


ipcMain.on('show-context-menu', (event) => {
    const template = [
        {
            label: 'Chamar Fila',
            click: () => {
                // Lógica para chamar atendimento
                if (floatingWin) {
                    ipcMain.emit('chamar-fila');
                }
            }
        },
        {
            label: 'Trocar Colab',
            click: () => {
                // Lógica para chamar atendimento
                if (floatingWin) {
                    ipcMain.emit('logout');
                }
            }
        },
        {
            label: 'Sair',
            click: () => {
                // Lógica para fechar o aplicativo
                if (floatingWin) {
                    ipcMain.emit('sair');
                }
            }
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: floatingWin });
});
