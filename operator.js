const operatorSelect = document.getElementById('operator-select');
const selectButton = document.getElementById('select-button');
const errorMessage = document.getElementById('error-message');

// Carrega a lista de operadores ao iniciar
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await window.electronAPI.getOperators();

        //colabs/list
        
        if (response.success) {
            // Preenche o select com os operadores
            response.operators.forEach(operator => {
                const option = document.createElement('option');
                option.value = operator.name;
                option.textContent = operator.name;
                option.setAttribute('data-sala', operator.sala);
                option.setAttribute('data-servicos', operator.servicos);
                option.setAttribute('data-id', operator.id);
                operatorSelect.appendChild(option);
            });
        } else {
            // Exibe mensagem de erro
            errorMessage.textContent = response.message;
            errorMessage.style.display = 'block';
            
            // Se houver operadores de fallback, preenche com eles
            if (response.operators && response.operators.length > 0) {
                response.operators.forEach(operator => {
                    const option = document.createElement('option');
                    option.value = operator.name;
                    option.textContent = operator.name;
                    operatorSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        errorMessage.textContent = `Erro ao carregar operadores: ${error.message}`;
        errorMessage.style.display = 'block';
    }
});

// Habilita/desabilita o botão com base na seleção
operatorSelect.addEventListener('change', () => {
    selectButton.disabled = !operatorSelect.value;
});

// Envia o operador selecionado
selectButton.addEventListener('click', () => {
const selectedOperatorValue = operatorSelect.value;

    if (selectedOperatorValue) {
        const selectedOption = operatorSelect.options[operatorSelect.selectedIndex];
        const selectedOperator = {
            value: selectedOperatorValue,
            name: selectedOperatorValue, // Assuming name is the same as value
            sala: selectedOption.getAttribute('data-sala'),
            servicos: selectedOption.getAttribute('data-servicos'),
            id: selectedOption.getAttribute('data-id'),
        };

        selectButton.disabled = true;
        selectButton.textContent = 'Processando...';
        
        window.electronAPI.selectOperator(selectedOperator);
    }
});

// Recebe resposta do processo de seleção
window.electronAPI.onOperatorResponse((response) => {
    if (!response.success) {
        // Exibe mensagem de erro
        errorMessage.textContent = response.message;
        errorMessage.style.display = 'block';
        
        selectButton.disabled = false;
        selectButton.textContent = 'Continuar';
    }
    // Se for bem-sucedido, o processo principal fechará esta janela
});