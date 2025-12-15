const floatButton = document.getElementById('float-button');
const countSpan = document.getElementById('count');

// Atualiza a contagem e a cor do botão quando recebe do main process
window.electronAPI.onUpdateCount((value) => {
    // Se estiver em atendimento, ignora qualquer atualização de contagem
    if (floatButton.classList.contains('em-atendimento')) {
        return;
    }

    countSpan.innerHTML = value ?? 0;
    // Verifica a contagem para mudar a cor
    if (value > 0) {
        floatButton.classList.add('has-items'); // Adiciona a classe para cor avermelhada
    } else {
        floatButton.classList.remove('has-items'); // Remove a classe, volta para o azul padrão
    }
});

// Altera a cor do botão com base no status do atendimento
window.electronAPI.onAtendimentoStatusChanged((status) => {
    if (status === 'iniciado') {
        const nomeAtendimento = localStorage.getItem('atendimentoAtualNome');
        floatButton.classList.remove('has-items');
        floatButton.classList.add('em-atendimento');
        countSpan.innerHTML = '-'; // Mostra o hífen
        if (nomeAtendimento) {
            floatButton.setAttribute('title', `Atendendo: ${nomeAtendimento}`);
        }
    } else { // 'finalizado'
        floatButton.classList.remove('em-atendimento');
        floatButton.setAttribute('title', 'Chamar próximo da fila');
        // Solicita uma atualização imediata da contagem para refletir o estado atual da fila
        window.electronAPI.refreshCount();
    }
});

// Ao carregar, verifica se já existe um atendimento em andamento
document.addEventListener('DOMContentLoaded', () => {
    const atendimentoAtual = localStorage.getItem('atendimentoAtual');
    if (atendimentoAtual) {
        const nomeAtendimento = localStorage.getItem('atendimentoAtualNome');
        floatButton.classList.remove('has-items');
        floatButton.classList.add('em-atendimento');
        countSpan.innerHTML = '-'; // Mostra o hífen
        if (nomeAtendimento) {
            floatButton.setAttribute('title', `Atendendo: ${nomeAtendimento}`);
        }
    } else {
        floatButton.setAttribute('title', 'Chamar próximo da fila');
    }
});

// Mostra a janela principal ao clicar
floatButton.addEventListener('click', () => {
    window.electronAPI.showMainWindow();
});

// Adiciona um listener para o evento de clique com o botão direito
floatButton.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Impede o menu padrão do navegador
    window.electronAPI.showMenu(); // Chama a função para mostrar o menu no processo principal
});

// Ajuste inicial do cursor
floatButton.style.cursor = 'pointer';
