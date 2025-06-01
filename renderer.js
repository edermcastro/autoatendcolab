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

let currentData = [];
let selectedItemId = null;
let selectedItemName = '';

window.electronAPI.onLoadData((data) => {
    if(!data){
        return;
    }
    // Reseta a view para a lista sempre que os dados são carregados
    populateList(data[0]);
    showListView();
});

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
    populateList(data);
    showListView();
    selectedItemId = data.id ?? null;
    //data.senhaGen
    queueNumber.innerHTML = data ? `NA VEZ: <u style="color:orange;">${data.clientName.toUpperCase()}</u>  -  ${data.descricaoServico.toUpperCase()}` : 'Ninguem aguardando atendimento';
    selectedItemNameSpan.innerHTML = data ? `<u> ${data.clientName.toUpperCase()} </u> <i style="float:right;">[ ${data.senhaGen} ]</i>` : 'Ninguem aguardando atendimento';

});

// Função para popular a lista de itens
function populateList(currentData) {
    let datastorage = localStorage.getItem('proximos');

    // Adiciona os outros itens apenas para visualização (opcional)
    const proximos = JSON.parse(datastorage);
    
    itemList.innerHTML = ''; // Limpa a lista anterior
    if (!proximos || proximos.length === 0 || !currentData) {
        itemList.innerHTML = '<li>Fila vazia!</li>';
        nextButton.disabled = !currentData;
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
        nextButton.disabled = false;
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
    // nextButton.disabled = !selectedItemId; // Habilita/desabilita baseado na seleção
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
        // A janela será escondida pelo main process após salvar (conforme main.js)
        // Se quiser resetar a view sem esconder, chame showListView() aqui.
    }
});

// Inicialmente, mostra a view da lista (estará vazia até receber dados)
