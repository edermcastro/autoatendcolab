const floatButton = document.getElementById('float-button');
const countSpan = document.getElementById('count');

// Atualiza a contagem e a cor do botão quando recebe do main process
window.electronAPI.onUpdateCount((value) => {
    countSpan.innerHTML = value ?? 0;
    // Verifica a contagem para mudar a cor
    if (value > 0) {
        floatButton.classList.add('has-items'); // Adiciona a classe para cor avermelhada
    } else {
        floatButton.classList.remove('has-items'); // Remove a classe, volta para o azul padrão
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