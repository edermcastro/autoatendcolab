const { app, BrowserWindow, ipcMain, screen, net } = require('electron');
const path = require('path');
const fs = require('fs');

const { autoUpdater, AppUpdater } = require('electron-updater');
const pjson = require(path.join(__dirname,'','package.json'));

let floatingWin;
let mainWin;
let loginWin;
let operatorWin;
let updateWin;

const dataPath = path.join(__dirname, 'data.json'); // Caminho para o JSON (backup local)
const apiUrl = 'https://autoatend.linco.work/api/v1/';


autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
// autoUpdater.autoDownloadOnStartup = true;


if(!pjson.isBuildNow){
    require('electron-reload')(__dirname,{
        electron: require(`${__dirname}/node_modules/electron`)
    })
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
        return await fetchDataFromAPI(token,colabId); //não usada aqui vai ser disparada via jquery dentro do modulo

    } catch (error) {
        console.error("Erro ao buscar dados da API:", error);

        // Fallback: tenta ler do arquivo local em caso de falha na API
        try {
            const rawData = fs.readFileSync(dataPath, 'utf-8');
            return JSON.parse(rawData);
        } catch (localError) {
            console.error("Erro ao ler data.json local:", localError);
            return []; // Retorna array vazio em caso de erro
        }
    }
}

// Função para buscar dados da API
async function fetchDataFromAPI(token,colabId) {
    //refactorado
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
    const winWidth = 50;
    const winHeight = 70;

    floatingWin = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        icon: "icon.ico",
        x: screenWidth - winWidth + 0,
        y: screenHeight - winHeight - 60,
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

    floatingWin.webContents.executeJavaScript('localStorage.setItem("version","'+app.getVersion()+'")');

    // Envia a contagem inicial para a janela flutuante
    const data = readData();
    floatingWin.webContents.on('did-finish-load', () => {
        floatingWin.webContents.send('update-count', data.length);
    });

    floatingWin.on('closed', () => {
        floatingWin = null;
    });
    // floatingWin.webContents.openDevTools();
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

    if(!pjson.isBuildNow) {
        mainWin.webContents.openDevTools(); // Descomente para depurar
    }

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


if(pjson.isBuildNow){
    autoUpdater.on('update-available', () => {
        let pth = autoUpdater.downloadUpdate();
        updateWin.show(); updateWin.focus();
        updateWin.webContents.send('update_message',`Uma nova versão está dispinível.`);
        updateWin.webContents.send('update_percent',pth);
    })
    autoUpdater.on('download-progress',(obj) => {
        updateWin.webContents.send('update_message',`Estamos baixando uma nova atualização.`);
    });
    autoUpdater.on('update-downloaded',(obj) => {
        updateWin.webContents.send('update_message',`Download concluído. Aguarde, vamos reiniciar para instalar!`);
        setTimeout(()=>{
            autoUpdater.quitAndInstall();
        },5000);
    });
    autoUpdater.on('error',err => {
        updateWin.webContents.send('update_message',err);
    });
}



// Inicialização do aplicativo modificada para verificar autenticação
app.whenReady().then(async () => {

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

    if(pjson.isBuildNow){
        autoUpdater.checkForUpdates();
    }

});

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


ipcMain.on('update_version', async (event, arg) => {
    if(updateWin){
        if(!updateWin.isVisible()){
            updateWin.show();
            updateWin.focus();
        }else{
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

// Ouvir pedido para mostrar a janela principal
ipcMain.on('chamar-fila', async () => {

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

    const colabId = await getSelectedOperatorId();
    const token = await getAuthToken('token');
    const url = apiUrl + 'chama-fila-app-colab/'+colabId; // URL de exemplo para enviar a solicitação

    const request = net.request({
        method: 'GET',
        url: url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    });

    request.on('response', (response) => {
        let rawData = '';

        response.on('data', (chunk) => {
            rawData += chunk;
        });

        response.on('end', () => {
            try {
                const parsedData = JSON.parse(rawData);

                if (response.statusCode === 200) {
                    mainWin.webContents.send('select-atend-id', parsedData.data);
                    console.log(parsedData);
                } else {
                    console.error(`Erro na requisição: Status code ${response.statusCode}`, parsedData);
                    // Lidar com o erro adequadamente, talvez enviando uma mensagem para a janela principal
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
        console.error("Erro na requisição:", error);
        mainWin.webContents.send('api-error', {
            message: `Erro ao chamar atendimento: ${error.message}`
        });
    });

    request.end();

});

ipcMain.on('select-atend-id',(itemId)=>{
    selectedItemId = itemId;
    console.log(selectedItemId);
});

// Ouvir clique no botão "Iniciar atendimento"
ipcMain.on('iniciar-atendimento', (event, itemId) => {

    //TODO inicia o atendimento o id do atendimento deve ser requisitado do backend

    const url = apiUrl + 'iniciar-atendimento/'+itemId; // URL de exemplo para enviar a solicitação

    // Simula o envio de uma solicitação POST com o ID do item
    const request = net.request({
        method: 'GET',
        url: url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    });

    request.on('response', (response) => {
        console.log(`STATUS: ${response.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(response.headers)}`);
        response.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        response.on('end', () => {
            console.log('Solicitação concluída.');
            // Avisa a janela principal que a solicitação foi feita (opcional)
            // mainWin.webContents.send('request-done', itemId);
        });
    });
    request.on('error', (error) => {
        console.error(`Erro na solicitação: ${error}`);
        // Poderia notificar a UI sobre o erro
    });

    // Envia o ID como corpo da requisição (exemplo)
    request.write(JSON.stringify({ id: itemId }));
    request.end();

    // Não precisamos esperar a resposta para mudar a UI na janela principal
    // A janela principal já mudou a UI ao enviar o evento 'next-step'
});

// Ouvir clique no botão "Salvar"
ipcMain.on('save-observation', (event, { itemId, observation }) => {

    //TODO salva a observação e finaliza o atendimento

    console.log(`Salvando observação para item ${itemId}: ${observation}`);

    console.log("Observação 'salva' (apenas log por enquanto).");

    // Opcional: Ler dados novamente e atualizar contagem na janela flutuante
    // const data = readData();
    // if (floatingWin) {
    //     floatingWin.webContents.send('update-count', data.length);
    // }

    // Opcional: Fechar ou resetar a janela principal após salvar
    if (mainWin) {
        mainWin.hide(); // Ou mainWin.webContents.send('reset-view');
    }
});

// Permite que a janela flutuante seja arrastada
// REMOVA ou comente este listener inteiro:
/*
ipcMain.on('drag-float-window', (event, { offsetX, offsetY }) => {
    if (floatingWin) {
        const { x, y } = screen.getCursorScreenPoint();
        floatingWin.setPosition(x - offsetX, y - offsetY);
    }
});
*/


ipcMain.on('logout', ()=>{
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
        // Substitua pela URL real da sua API de autenticação
        const route = apiUrl + 'login';
        
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
                console.log("Resposta da API:", responseData); // Adiciona este log para ver a resposta crua
            });
            
            response.on('end', () => {
                try {
                    const data = JSON.parse(responseData);

                    
                    if (data.status === 'Authorized' && data.api_key) {
                        // Login bem-sucedido
                        loginWin.webContents.executeJavaScript(`
                            localStorage.setItem("authToken", "${data.api_key}");
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
                    console.log("Resposta da API:", error);
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
        
        // Envia as credenciais
        request.write(JSON.stringify(credentials));
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
        
        if (!token) {
            return { 
                success: false, 
                message: 'Não autenticado', 
                operators: [] 
            };
        }
        
        // Aqui você pode fazer uma chamada à API para obter os operadores
        // Por enquanto, vamos retornar alguns operadores de exemplo
        // Substitua pela URL real da sua API de autenticação
        const route = apiUrl + 'colabs/list';

        return new Promise((resolve, reject) => {
            const request = net.request({
                method: 'GET',
                url: route,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            let responseData = '';

            request.on('response', (response) => {
                response.on('data', (chunk) => {
                    responseData += chunk.toString();
                    console.log("Resposta da API:", responseData); // Adiciona este log para ver a resposta crua
                });

                response.on('end', () => {
                    try {
                        const data = JSON.parse(responseData);

                        if (data.colabs) {
                            const operators = data.colabs.map(colab => ({
                                id: colab.id,
                                name: colab.nome.toUpperCase(),
                                sala: colab.sala,
                                servicos: colab.servicos
                            }));

                            resolve({
                                success: true,
                                operators: operators
                            });
                        } else {
                                reject({
                                success: false,
                                message: data.message || 'Erro ao obter a lista de colaboradores',
                                operators: []
                            });
                        }
                    } catch (error) {
                        console.log("Erro ao processar resposta da API:", error);
                            reject({
                            success: false,
                            message: 'Erro ao processar resposta do servidor',
                            operators: []
                        });
                    }
                });
            });

            request.on('error', (error) => {
                reject({
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


ipcMain.on('sair', ()=>{
    app.exit();
});