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
    if(!data){
        return;
    }
    // Reseta a view para a lista sempre que os dados são carregados
    populateList(data[0]); 
});

async function initializePusher() {
    if (typeof window.electronAPI === 'undefined' || !window.electronAPI.getPusherConfig) {
        console.error('electronAPI not available or getPusherConfig method missing.');
        return;
    }

    const pusherConfig = await window.electronAPI.getPusherConfig();
    const PUSHER_APP_KEY = pusherConfig.appKey;
    let host = pusherConfig.host;

    const channelLocal = localStorage.getItem('channel');
    const colabId = localStorage.getItem('idOperator');

    if (channelLocal && PUSHER_APP_KEY) {
        Pusher.logToConsole = true;

        var pusher = new Pusher(PUSHER_APP_KEY, {
            wsHost: host,
            wsPort: 6001,
            wssPort: 6001,
            forceTLS: false,
            enableStats: false,
            enabledTransports: ['ws','wss'],
            cluster: 'mt1'
        });

        var channel = pusher.subscribe('chat.' + channelLocal + '_' + colabId);
        channel.bind('message-sent', function(r) {
            let count = r.data.fila.original.length;
                console.log(r.data.fila.original);
                localStorage.setItem('proximos',JSON.stringify(r.data.fila.original));

            populateList(r.data.currentData.original);

        });

        pusher.connection.bind('error', function(err) {
            console.error('Pusher connection error:', err);
        });

        console.log('Host de conexão:', host);
    } else {
        console.warn('User not authenticated or Pusher APP_KEY not available. Private channel not subscribed.');
    }
}

initializePusher();


//chama o proximo da fila ao abrir a janela de atendimentos
window.electronAPI.selectAtendID((data)=>{
    if(!data){
        queueNumber.innerHTML = 'Ninguem aguardando atendimento, fechando a janela em alguns segundos...';
        setTimeout(() => {
            window.close();
        },5000);
        return;
    }
    // Reseta a view para a lista sempre que os dados são carregados ao clicar no botão para abrir a janela
    nextButton.disabled = true;
    populateList(data);
    showListView();
    selectedItemId = data.id ?? null;
    //data.senhaGen
    queueNumber.innerHTML = data ? `NA VEZ: <u>${data.clientName.toUpperCase()}</u>  -  ${data.descricaoServico.toUpperCase()}` : 'Ninguem aguardando atendimento';
    selectedItemNameSpan.innerHTML = data ? `<u> ${data.clientName.toUpperCase()} </u> <i style="float:right;">[ ${data.senhaGen} ]</i>` : 'Ninguem aguardando atendimento';

});

// Função para popular a lista de itens
function populateList(currentData) {
    let datastorage = localStorage.getItem('proximos');

    // Adiciona os outros itens apenas para visualização (opcional)
    const proximos = JSON.parse(datastorage);
    var count = 8;
    
    itemList.innerHTML = ''; // Limpa a lista anterior
    if (!proximos || proximos.length === 0 || !currentData) {
        itemList.innerHTML = '<li>Fila vazia!</li>';
        const dec_counter = setInterval(() => {
            count = count -1;
            counterStart.innerHTML = `[ ${count} ]`;
            if (count <= 0 || !currentData) {
                counterStart.innerHTML = '';
                nextButton.disabled = false;
                clearInterval(dec_counter);
            }
        },1000);
        return;
    }

    // Seleciona o primeiro item por padrão (ou o próximo disponível)
    // Aqui, vamos apenas pegar o primeiro da lista atual
    const itemToProcess = proximos[0]; // Pega o primeiro item
    if (itemToProcess) {
        
        selectedItemId = itemToProcess.id;
        selectedItemName = itemToProcess.clientName;
        const li = document.createElement('li');
        li.innerHTML = /*${itemToProcess.senhaGen}: */ `<u>${itemToProcess.clientName.toUpperCase()}</u> - ${itemToProcess.attendanceType.toUpperCase()} - ${itemToProcess.descricaoServico.toUpperCase()}`;
        li.dataset.id = itemToProcess.id; // Armazena o ID no elemento
        li.classList.add('selected'); // Marca como selecionado visualmente (precisa de CSS)
        itemList.appendChild(li);

        const dec_counter = setInterval(() => {
            count = count -1;
            counterStart.innerHTML = `[ ${count} ]`;
            if (count <= 0 && currentData) {
                counterStart.innerHTML = '';
                nextButton.disabled = false;
                clearInterval(dec_counter);
            }
        },1000);
        
    } else {
        itemList.innerHTML = '<li>Fila vazia!</li>';
        nextButton.disabled = !currentData;
        selectedItemId = null;
        selectedItemName = '';
    }

    // Adiciona os outros itens apenas para visualização (opcional)
    proximos.slice(1).forEach(item => {
        const li = document.createElement('li');
        //${item.senhaGen}: 
        li.textContent = `${item.clientName.toUpperCase()} - ${item.attendanceType.toUpperCase()} - ${item.descricaoServico.toUpperCase()}`;
        itemList.appendChild(li);
    });
}


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
        window.electronAPI.iniciaAtendimento(selectedItemId);
        showObservationView(); // Muda para a tela de observação
    } else {
        console.warn("Nenhum item selecionado para 'Próximo'");
    }
});



logoutButton.addEventListener('click',()=>{
    window.electronAPI.logoutApp();
});

//
// // Evento do botão "Salvar"
saveButton.addEventListener('click', () => {
    const observation = observationText.value;
    if (selectedItemId !== null) {
        window.electronAPI.saveObservation({ itemId: selectedItemId, observation: observation });
        window.location.reload();
    }
});

// Inicialmente, mostra a view da lista (estará vazia até receber dados)
