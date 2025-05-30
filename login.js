const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

// Verifica se já existe um token de autenticação
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se já existe um token no localStorage
    const authToken = localStorage.getItem('authToken');
    
    if (authToken) {
        console.log('Token encontrado, redirecionando para seleção de operador');
        // Informa ao processo principal que já existe um token
        window.electronAPI.tokenExists();
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const login = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Limpa mensagens de erro anteriores
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
    
    // Desabilita o botão durante o login
    const loginButton = document.getElementById('login-button');
    loginButton.disabled = true;
    loginButton.textContent = 'Autenticando...';
    
    // Envia credenciais para o processo principal
    window.electronAPI.login({ login, password });
});

// Recebe resposta do processo de login
window.electronAPI.onLoginResponse((response) => {
    const loginButton = document.getElementById('login-button');
    loginButton.disabled = false;
    loginButton.textContent = 'Entrar';
    
    if (!response.success) {
        // Exibe mensagem de erro
        errorMessage.textContent = response.message;
        errorMessage.style.display = 'block';
    }
    // Se for bem-sucedido, o processo principal fechará esta janela
});