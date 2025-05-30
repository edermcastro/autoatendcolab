const listView = document.getElementById('list-view');
const observationView = document.getElementById('obs-view');
const encaminharView = document.getElementById('encaminhar-view');
const itemList = document.getElementById('item-list');
const nextButton = document.getElementById('next-button');
const logoutButton = document.getElementById('logout-button');
const observationText = document.getElementById('observation-text');
const saveButton = document.getElementById('save-button');
const selectedItemNameSpan = document.getElementById('selected-item-name');
const queueNumber = document.getElementById('queue-number');

let currentData = [];
let selectedItemId = null;
let selectedItemName = '';

// window.electronAPI.onLoadData(() => {
//     populateList();
//     // Reseta a view para a lista sempre que os dados são carregados
//     showListView();
// });

//chama o proximo da fila ao abrir a janela de atendimentos
window.electronAPI.selectAtendID((data)=>{
    selectedItemId = data.id;
    queueNumber.innerHTML = data ? 'Chamando: '+data.senhaGen + ' - '+ data.clientName.toUpperCase() + ' - ' + data.descricaoServico.toUpperCase() : 'Ninguem aguardando atendimento';
});

// Função para popular a lista de itens
function populateList() {
    let datastorage = localStorage.getItem('proximos');

    // Adiciona os outros itens apenas para visualização (opcional)
    const proximos = JSON.parse(datastorage);

    itemList.innerHTML = ''; // Limpa a lista anterior
    if (!proximos || proximos.length === 0) {
        itemList.innerHTML = '<li>Nenhum item encontrado.</li>';
        nextButton.disabled = true;
        return;
    }

    // Seleciona o primeiro item por padrão (ou o próximo disponível)
    // Aqui, vamos apenas pegar o primeiro da lista atual
    const itemToProcess = proximos[0]; // Pega o primeiro item
    if (itemToProcess) {
        selectedItemId = itemToProcess.id;
        selectedItemName = itemToProcess.clientName;
        const li = document.createElement('li');
        li.textContent = `${itemToProcess.senhaGen}: ${itemToProcess.clientName.toUpperCase()} - ${itemToProcess.attendanceType.toUpperCase()} - ${itemToProcess.descricaoServico.toUpperCase()}`;
        li.dataset.id = itemToProcess.id; // Armazena o ID no elemento
        li.classList.add('selected'); // Marca como selecionado visualmente (precisa de CSS)
        itemList.appendChild(li);
        nextButton.disabled = false;
    } else {
        itemList.innerHTML = '<li>Nenhum item para processar.</li>';
        nextButton.disabled = true;
        selectedItemId = null;
        selectedItemName = '';
    }

    // Adiciona os outros itens apenas para visualização (opcional)
    proximos.slice(1).forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.senhaGen}: ${item.clientName.toUpperCase()} - ${item.attendanceType.toUpperCase()} - ${item.descricaoServico.toUpperCase()}`;
        itemList.appendChild(li);
    });
}


//mostra a tela de listagem e permite iniciar o atendimento
function showListView() {
    // populateList();

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



logoutButton.addEventListener('click',()=>{
    window.electronAPI.logoutApp();
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



//não vai ser usado timer pois é usado no floatbuttom, ele atualiza com timer
//essa função vai ser chamada apenas quando algum registro já estiver sido atendido
function updRemoteList() {
    if (!token && !colabId) {
        console.warn("Token or colabId not found in localStorage. API requests will not be made.");
        return; // Stop the function if token or colabId is missing
    }

    $.ajax(apiUrl + 'get-proximos/'+colabId, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer '+token },
        processData: false,
        contentType: false,
        dataType: 'JSON',
        success: function(response) {
            console.log('Resposta:', response);
            // Ensure the response is valid JSON before parsing
            try {
                localStorage.setItem('proximos', JSON.stringify(response));
            } catch (e) {
                console.error("Error parsing JSON response:", e);
                console.error("Response text:", response); // Log the raw response for debugging
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro na requisição:', status, error);
            console.error('Response Text:', xhr.responseText); // Log the response text for debugging
            // Optionally, handle different error codes:
            if (xhr.status === 401) {
                console.warn("Unauthorized. Token might be invalid.");
                // You could redirect the user to a login page here.
            } else if (xhr.status === 404) {
                console.warn("Resource not found. Check the API endpoint.");
            }
        }
    });

}