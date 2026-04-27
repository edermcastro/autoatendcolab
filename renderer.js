const listView = document.getElementById('list-view');
const observationView = document.getElementById('obs-view');
const encaminharView = document.getElementById('encaminhar-view');
const itemList = document.getElementById('item-list');
const nextButton = document.getElementById('next-button');
const logoutButton = document.getElementById('logout-button');
const observationText = document.getElementById('observation-text');
const encObservationText = document.getElementById('enc-observation-text');
const saveButton = document.getElementById('save-button');
const selectedItemNameSpan = document.getElementById('selected-item-name');
const queueNumber = document.getElementById('queue-number');
const idAtend = document.getElementById('idAtend');
const counterStart = document.getElementById('counter-start');

let currentData = [];
let selectedItemId = null;
let selectedItemName = '';

window.electronAPI.onLoadData((data) => {
    // Se já estiver em atendimento, ignora atualizações da lista para evitar flickering no botão
    if (localStorage.getItem('atendimentoAtual')) {
        return;
    }
    nextButton.disabled = true;
    if (!data) {
        return;
    }
    populateList(data);
});

async function initializeSocket() {
    if (typeof window.electronAPI === 'undefined' || !window.electronAPI.getPusherConfig) {
        console.error('electronAPI not available or getPusherConfig method missing.');
        return;
    }

    const config = await window.electronAPI.getPusherConfig();
    let host = config.host;

    const tenantId = localStorage.getItem('tenantId');
    const token = localStorage.getItem('authToken');

    //! checa se ja tem o colabId e o tenantId
    if (tenantId && token) {
        // Conexão Socket.io adaptada do Pusher
        const socket = io(host, {
            auth: { token },
            extraHeaders: { 'x-tenant-id': tenantId }
        });

        socket.on('connect', () => {
            console.log('Socket.io conectado ao host: ', host);
        });

        // Evento que substitui o bind do Pusher
        socket.on('queueUpdate', (data) => {
            console.log('Notificação de fila recebida:', data);
            // Avisa o processo principal que houve mudança. 
            // O main vai buscar a lista completa e atualizar todas as janelas.
            window.electronAPI.updateQueue();
        });

        socket.on('error', (err) => {
            console.error('Socket.io connection error: ', err);
        });

    } else {
        console.warn('User not authenticated or tenantId not available. WebSocket not connected.');
    }
}

initializeSocket();

//chama o proximo da fila ao abrir a janela de atendimentos
window.electronAPI.selectAtendID((data) => {
    nextButton.disabled = true;
    if (!data) {
        queueNumber.innerHTML = 'Ninguem aguardando atendimento, fechando a janela em alguns segundos...';
        return;
    }
    // Reseta a view para a lista sempre que os dados são carregados ao clicar no botão para abrir a janela
    populateList(data);
    showListView();

    // Garante que o item selecionado (ID e Nome) seja o que veio da chamada, sobrescrevendo o da lista.
    selectedItemId = data._id ?? null;
    selectedItemName = data.clientName ?? '';

    //data.senhaGen
    queueNumber.innerHTML = data ? `NA VEZ: <u>${data.clientName.toUpperCase()}</u>` : 'Ninguem aguardando atendimento';
    selectedItemNameSpan.innerHTML = data ? `<u> ${data.clientName.toUpperCase()} </u> <i style="float:right;">[ ${data.ticketNumber} ]</i>` : 'Ninguem aguardando atendimento';
});

window.electronAPI.showObservation(() => {
    window.electronAPI.iniciaAtendimento(selectedItemId);
    showObservationView(); // Muda para a tela de observação
});

// Função para popular a lista de itens
function populateList(proximos) {
    const atendimentoEmAndamentoId = localStorage.getItem('atendimentoAtual');
    const atendimentoEmAndamentoNome = localStorage.getItem('atendimentoAtualNome');

    if (atendimentoEmAndamentoId) {
        itemList.innerHTML = `<li>Atendimento com <strong>${(atendimentoEmAndamentoNome || '').toUpperCase()}</strong> em andamento.</li>`;
        queueNumber.innerHTML = `EM ATENDIMENTO: <u>${(atendimentoEmAndamentoNome || '').toUpperCase()}</u>`;
        nextButton.disabled = true;
        return;
    }

    // Se não vier dados por parâmetro, tenta pegar do localStorage (fallback)
    if (!Array.isArray(proximos)) {
        let datastorage = localStorage.getItem('proximos');
        proximos = JSON.parse(datastorage || '[]');
    }

    itemList.innerHTML = '';

    setTimeout(() => {
        nextButton.disabled = !proximos || proximos.length === 0;
    }, 1000);

    // Seleciona o primeiro item por padrão (ou o próximo disponível)
    // Aqui, vamos apenas pegar o primeiro da lista atual
    const itemToProcess = proximos[0]; // Pega o primeiro item
    if (itemToProcess) {
        selectedItemId = itemToProcess._id;
        selectedItemName = itemToProcess.clientName;
        const li = document.createElement('li');
        li.innerHTML = /*${itemToProcess.ticketNumber}: */ `<u>${itemToProcess.clientName.toUpperCase()}</u> - ${itemToProcess.ticketNumber}`;
        li.dataset.id = itemToProcess._id; // Armazena o ID no elemento
        li.classList.add('selected'); // Marca como selecionado visualmente (precisa de CSS)
        itemList.appendChild(li);
    } else {
        itemList.innerHTML = '<li>Fila vazia!</li>';
        nextButton.disabled = true;
        selectedItemId = null;
        selectedItemName = '';
    }

    // Adiciona os outros itens apenas para visualização (opcional)
    proximos.slice(1).forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.clientName.toUpperCase()} - ${item.ticketNumber}`;
        itemList.appendChild(li);
    });
}


// Verifica o estado ao carregar a janela
document.addEventListener('DOMContentLoaded', () => {
    const atendimentoEmAndamentoId = localStorage.getItem('atendimentoAtual');
    if (atendimentoEmAndamentoId) {
        // Se um atendimento está em andamento, a tela de observação deve ser mostrada
        selectedItemId = atendimentoEmAndamentoId;
        selectedItemName = localStorage.getItem('atendimentoAtualNome');
        selectedItemNameSpan.innerHTML = `<u> ${(selectedItemName || '').toUpperCase()} </u>`;
        showObservationView();
    }
});


//mostra a tela de listagem e permite iniciar o atendimento
function showListView() {
    listView.style.display = 'block';
    encaminharView.style.display = 'none';
    observationView.style.display = 'none';
    observationText.value = ''; // Limpa a textarea
}

showListView();


//inicia o atendimento
function showObservationView() {
    if (!selectedItemId) return; // Não muda se nada estiver selecionado
    listView.style.display = 'none';
    observationView.style.display = 'block';
}

// // Evento do botão "Iniciar atendimento"
nextButton.addEventListener('click', () => {
    if (selectedItemId !== null) {
        // Salva o estado de atendimento no localStorage
        localStorage.setItem('atendimentoAtual', selectedItemId);
        localStorage.setItem('atendimentoAtualNome', selectedItemName);

        // Notifica o main process e muda a view
        // IMPORTANTE: iniciaAtendimento deve apenas mudar o status na API, não chamar o próximo.
        window.electronAPI.atendimentoIniciado(selectedItemId);
        window.electronAPI.iniciaAtendimento(selectedItemId);
        showObservationView(); // Muda para a tela de observação
    } else {
        console.warn("Nenhum item selecionado para 'Próximo'");
    }
});



logoutButton.addEventListener('click', () => {
    window.electronAPI.logoutApp();
});

//
// // Evento do botão "Salvar"
saveButton.addEventListener('click', () => {
    const observation = observationText.value;
    if (selectedItemId !== null) {
        // Limpa o estado de atendimento
        localStorage.removeItem('atendimentoAtual');
        localStorage.removeItem('atendimentoAtualNome');
        window.electronAPI.atendimentoFinalizado();

        window.electronAPI.saveObservation({ itemId: selectedItemId, observation: observation });
        window.location.reload();
    }
});
