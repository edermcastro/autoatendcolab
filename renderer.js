const listView = document.getElementById('list-view');
const observationView = document.getElementById('obs-view');
const encaminharView = document.getElementById('encaminhar-view');
const itemList = document.getElementById('item-list');
const nextButton = document.getElementById('next-button');
const quitButton = document.getElementById('sair-button');
const observationText = document.getElementById('observation-text');
const saveButton = document.getElementById('save-button');
const selectedItemNameSpan = document.getElementById('selected-item-name');

let currentData = [];
let selectedItemId = null;
let selectedItemName = '';

window.electronAPI.onLoadData(() => {
    populateList();
    // Reseta a view para a lista sempre que os dados são carregados
    showListView();
});

// Função para popular a lista de itens
function populateList() {
    // let datastorage = localStorage.getItem('proximos');
    //
    // // Adiciona os outros itens apenas para visualização (opcional)
    // const proximos = JSON.parse(datastorage);
    //
    // itemList.innerHTML = ''; // Limpa a lista anterior
    // if (!proximos || proximos.length === 0) {
    //     itemList.innerHTML = '<li>Nenhum item encontrado.</li>';
    //     nextButton.disabled = true;
    //     return;
    // }
    //
    // // Seleciona o primeiro item por padrão (ou o próximo disponível)
    // // Aqui, vamos apenas pegar o primeiro da lista atual
    // const itemToProcess = proximos[0]; // Pega o primeiro item
    // if (itemToProcess) {
    //     selectedItemId = itemToProcess.id;
    //     selectedItemName = itemToProcess.clientName;
    //     const li = document.createElement('li');
    //     li.textContent = `${itemToProcess.senhaGen}: ${itemToProcess.clientName.toUpperCase()} - ${itemToProcess.attendanceType.toUpperCase()} - ${itemToProcess.descricaoServico.toUpperCase()}`;
    //     li.dataset.id = itemToProcess.id; // Armazena o ID no elemento
    //     li.classList.add('selected'); // Marca como selecionado visualmente (precisa de CSS)
    //     itemList.appendChild(li);
    //     nextButton.disabled = false;
    // } else {
    //     itemList.innerHTML = '<li>Nenhum item para processar.</li>';
    //     nextButton.disabled = true;
    //     selectedItemId = null;
    //     selectedItemName = '';
    // }
    //
    // // Adiciona os outros itens apenas para visualização (opcional)
    // proximos.slice(1).forEach(item => {
    //     const li = document.createElement('li');
    //     li.textContent = `${item.senhaGen}: ${item.clientName.toUpperCase()} - ${item.attendanceType.toUpperCase()} - ${item.descricaoServico.toUpperCase()}`;
    //     itemList.appendChild(li);
    // });
}


//mostra a tela de listagem e permite iniciar o atendimento
function showListView() {
    populateList();

    listView.style.display = 'block';
    encaminharView.style.display = 'none';
    observationView.style.display = 'none';
    observationText.value = ''; // Limpa a textarea

    window.electronAPI.currVersion(()=>{});

    // nextButton.disabled = !selectedItemId; // Habilita/desabilita baseado na seleção
}

showListView();


//inicia o atendimento
function showObservationView() {
    if (!selectedItemId) return; // Não muda se nada estiver selecionado

    //obter o id do atendimento de modo asyncrono
    selectedItemNameSpan.textContent = selectedItemName || `ID ${selectedItemId}`; // Mostra nome ou ID
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



quitButton.addEventListener('click',()=>{
    window.electronAPI.quitApp();
});

//
// // Evento do botão "Salvar"
// saveButton.addEventListener('click', () => {
//     const observation = observationText.value.trim();
//     if (selectedItemId !== null) {
//         window.electronAPI.saveObservation({ itemId: selectedItemId, observation: observation });
//         window.location.reload();
//         // A janela será escondida pelo main process após salvar (conforme main.js)
//         // Se quiser resetar a view sem esconder, chame showListView() aqui.
//     }
// });

// Inicialmente, mostra a view da lista (estará vazia até receber dados)
