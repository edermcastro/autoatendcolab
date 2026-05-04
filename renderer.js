const listView = document.getElementById('list-view');
const observationView = document.getElementById('obs-view');

// Novos elementos do layout redesenhado
const queueTableBody = document.getElementById('queue-table-body');
const queueEmpty = document.getElementById('queue-empty');
const queueCount = document.getElementById('queue-count');
const currentCard = document.getElementById('current-card');
const noCurrentCard = document.getElementById('no-current');
const cardTicket = document.getElementById('card-ticket');
const cardStatusBadge = document.getElementById('card-status-badge');
const cardClientName = document.getElementById('card-client-name');
const cardService = document.getElementById('card-service');
const cardType = document.getElementById('card-type');
const nextButton = document.getElementById('next-button');
const recallButton = document.getElementById('recall-button');
const forwardButton = document.getElementById('forward-button');
const logoutButton = document.getElementById('logout-button');
const observationText = document.getElementById('observation-text');
const saveButton = document.getElementById('save-button');
const selectedItemNameSpan = document.getElementById('selected-item-name');
const idAtend = document.getElementById('idAtend');
const counterStart = document.getElementById('counter-start');

// Elementos do Modal de Encaminhamento
const forwardView = document.getElementById('forward-view');
const operatorsList = document.getElementById('operators-list');
const closeForward = document.getElementById('close-forward');
const forwardTicketSpan = document.getElementById('forward-ticket');

let currentData = [];
let selectedItemId = null;
let selectedItemName = '';

// ===========================
// FLAG que trava o ID do atendimento chamado.
// Quando o call-next retorna e define o atendimento atual,
// este flag impede que atualizações da fila sobrescrevam o selectedItemId.
// ===========================
let calledAtendimentoData = null; // Guarda os dados completos do atendimento chamado

window.electronAPI.onLoadData((data) => {
    // Se já estiver em atendimento, ignora atualizações da lista para evitar flickering no botão
    if (localStorage.getItem('atendimentoAtual')) {
        return;
    }
    if (!data) {
        return;
    }
    populateQueueTable(data);
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
        showNoCurrentCard('Ninguém aguardando atendimento');
        return;
    }

    // Trava os dados do atendimento chamado para que atualizações da fila
    // NÃO sobrescrevam quem foi chamado.
    calledAtendimentoData = data;
    selectedItemId = data._id ?? null;
    selectedItemName = data.clientName ?? '';

    // Atualiza a tabela da fila (sem afetar o card atual)
    // populateQueueTable já NÃO mexe no selectedItemId quando calledAtendimentoData está travado
    showListView();

    // Mostra o card do atendimento chamado
    showCurrentCard(data);
});

window.electronAPI.showObservation(() => {
    window.electronAPI.iniciaAtendimento(selectedItemId);
    showObservationView(); // Muda para a tela de observação
});

// Função para popular a tabela da fila
function populateQueueTable(proximos) {
    const atendimentoEmAndamentoId = localStorage.getItem('atendimentoAtual');
    const atendimentoEmAndamentoNome = localStorage.getItem('atendimentoAtualNome');

    if (atendimentoEmAndamentoId) {
        // Em atendimento: mostra card de atendimento no painel direito
        queueTableBody.innerHTML = '';
        queueCount.textContent = '0';
        queueEmpty.style.display = 'flex';
        document.querySelector('.queue-table').style.display = 'none';
        
        // Mostra card como "Atendendo"
        currentCard.style.display = 'flex';
        noCurrentCard.style.display = 'none';
        cardTicket.textContent = '';
        cardStatusBadge.textContent = 'Atendendo';
        cardStatusBadge.className = 'card-badge badge-atendendo';
        cardClientName.textContent = (atendimentoEmAndamentoNome || '').toUpperCase();
        cardService.textContent = '';
        cardType.textContent = '';
        nextButton.disabled = true;
        recallButton.disabled = true;
        forwardButton.disabled = true;
        return;
    }

    // Se não vier dados por parâmetro, tenta pegar do localStorage (fallback)
    if (!Array.isArray(proximos)) {
        let datastorage = localStorage.getItem('proximos');
        proximos = JSON.parse(datastorage || '[]');
    }

    // Limpa e popula a tabela
    queueTableBody.innerHTML = '';

    if (!proximos || proximos.length === 0) {
        queueEmpty.style.display = 'flex';
        document.querySelector('.queue-table').style.display = 'none';
        queueCount.textContent = '0';
    } else {
        queueEmpty.style.display = 'none';
        document.querySelector('.queue-table').style.display = 'table';
        queueCount.textContent = proximos.length;

        proximos.forEach((item, index) => {
            const tr = document.createElement('tr');
            const isPreferencial = item.ticketNumber && item.ticketNumber.startsWith('P');
            
            tr.innerHTML = `
                <td class="ticket-cell ${isPreferencial ? 'ticket-preferencial' : 'ticket-normal'}">${item.ticketNumber || '---'}</td>
                <td>${(item.clientName || '---').toUpperCase()}</td>
                <td>${item.serviceName || 'Atendimento'}</td>
                <td class="${isPreferencial ? 'type-preferencial' : 'type-normal'}">${isPreferencial ? 'PREFERENCIAL' : 'NORMAL'}</td>
            `;
            
            queueTableBody.appendChild(tr);
        });
    }

    // CORREÇÃO DO BUG: Só atualiza selectedItemId se NÃO houver um atendimento já chamado (travado)
    if (!calledAtendimentoData) {
        // Nenhum atendimento foi chamado ainda, pode selecionar o primeiro
        const firstItem = proximos && proximos[0];
        if (firstItem) {
            selectedItemId = firstItem._id;
            selectedItemName = firstItem.clientName;
        } else {
            selectedItemId = null;
            selectedItemName = '';
        }
        // Sem atendimento chamado: não mostra card
        if (!currentCard.style.display || currentCard.style.display === 'none') {
            noCurrentCard.style.display = 'flex';
        }
    }
    // Se calledAtendimentoData está definido, NÃO toca no selectedItemId — mantém o que foi chamado.
}

// Mostra o card do atendimento atual (chamado)
function showCurrentCard(data) {
    currentCard.style.display = 'flex';
    noCurrentCard.style.display = 'none';

    cardTicket.textContent = data.ticketNumber || '---';
    
    const statusText = data.status === 'Atendendo' ? 'Atendendo' : 'Chamado';
    cardStatusBadge.textContent = statusText;
    cardStatusBadge.className = `card-badge ${data.status === 'Atendendo' ? 'badge-atendendo' : 'badge-chamado'}`;
    
    cardClientName.textContent = (data.clientName || '---').toUpperCase();
    cardService.textContent = (data.serviceName || 'ATENDIMENTO').toUpperCase();
    
    const isPreferencial = data.ticketNumber && data.ticketNumber.startsWith('P');
    cardType.textContent = isPreferencial ? 'PREFERENCIAL' : 'NORMAL';
    cardType.className = `card-type ${isPreferencial ? 'type-preferencial' : ''}`;

    // Habilita os botões
    setTimeout(() => {
        nextButton.disabled = false;
        recallButton.disabled = false;
        forwardButton.disabled = false;
    }, 500);
}

function showNoCurrentCard(message) {
    currentCard.style.display = 'none';
    noCurrentCard.style.display = 'flex';
    noCurrentCard.querySelector('p').textContent = message || 'Nenhum atendimento chamado';
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
    forwardView.style.display = 'none';
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

// // Evento do botão "Iniciar atendimento" (INICIAR)
nextButton.addEventListener('click', () => {
    // Usa calledAtendimentoData para garantir que estamos iniciando O ATENDIMENTO CORRETO
    const idToStart = calledAtendimentoData ? calledAtendimentoData._id : selectedItemId;
    const nameToStart = calledAtendimentoData ? calledAtendimentoData.clientName : selectedItemName;

    if (idToStart !== null) {
        // Salva o estado de atendimento no localStorage
        localStorage.setItem('atendimentoAtual', idToStart);
        localStorage.setItem('atendimentoAtualNome', nameToStart);

        // Atualiza o span da tela de observação
        selectedItemId = idToStart;
        selectedItemName = nameToStart;
        selectedItemNameSpan.innerHTML = `<u> ${(nameToStart || '').toUpperCase()} </u>`;

        // Notifica o main process e muda a view
        // IMPORTANTE: iniciaAtendimento deve apenas mudar o status na API, não chamar o próximo.
        window.electronAPI.atendimentoIniciado(idToStart);
        window.electronAPI.iniciaAtendimento(idToStart);

        // Limpa o travamento — atendimento foi iniciado
        calledAtendimentoData = null;

        showObservationView(); // Muda para a tela de observação
    } else {
        console.warn("Nenhum item selecionado para 'Iniciar'");
    }
});

// Evento do botão RECHAMAR
recallButton.addEventListener('click', () => {
    if (calledAtendimentoData) {
        // Re-chama o mesmo atendimento (pode tocar som, exibir no painel, etc.)
        window.electronAPI.rechamarAtendimento(calledAtendimentoData._id);
        
        // Feedback visual
        recallButton.textContent = 'RECHAMANDO...';
        recallButton.disabled = true;
        setTimeout(() => {
            recallButton.textContent = 'RECHAMAR';
            recallButton.disabled = false;
        }, 2000);
    }
});

// Evento do botão ENCAMINHAR
forwardButton.addEventListener('click', async () => {
    if (calledAtendimentoData) {
        forwardTicketSpan.textContent = calledAtendimentoData.ticketNumber;
        forwardView.style.display = 'flex';
        
        // Carrega operadores
        operatorsList.innerHTML = '<p style="color: #aaa; padding: 20px; text-align: center;">Carregando atendentes...</p>';
        const response = await window.electronAPI.getOperators();
        
        if (response.success && response.operators) {
            operatorsList.innerHTML = '';
            
            response.operators.forEach(op => {
                const item = document.createElement('div');
                item.className = 'operator-item';
                item.textContent = op.name;
                item.onclick = () => {
                    if (confirm(`Encaminhar para ${op.name}?`)) {
                        window.electronAPI.encaminharAtendimento({
                            itemId: calledAtendimentoData._id,
                            collaboratorId: op._id
                        });
                        forwardView.style.display = 'none';
                        
                        // Limpa o atendimento atual pois foi encaminhado
                        localStorage.removeItem('atendimentoAtual');
                        localStorage.removeItem('atendimentoAtualNome');
                        calledAtendimentoData = null;
                        selectedItemId = null;
                        showListView();
                    }
                };
                operatorsList.appendChild(item);
            });
            
            if (response.operators.length === 0) {
                operatorsList.innerHTML = '<p style="color: #aaa; padding: 20px; text-align: center;">Nenhum outro atendente disponível.</p>';
            }
        } else {
            operatorsList.innerHTML = `<p style="color: #e74c3c; padding: 20px; text-align: center;">${response.message || 'Erro ao carregar atendentes.'}</p>`;
        }
    }
});

closeForward.addEventListener('click', () => {
    forwardView.style.display = 'none';
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

        // Limpa o travamento
        calledAtendimentoData = null;

        window.electronAPI.saveObservation({ itemId: selectedItemId, observation: observation });
        window.location.reload();
    }
});
