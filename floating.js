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

// Ajuste inicial do cursor
floatButton.style.cursor = 'pointer';