//janela update
const aVersion = document.getElementById('version');
const uVersion = document.getElementById('newversion');
const updMessage = document.getElementById('message');
const updpercent = document.getElementById('percent');


window.electronAPI.updMessage((data)=>{
    updMessage.innerHTML = data;
});

window.electronAPI.updPercent((data)=>{
    updpercent.innerHTML = data + '%';
});

window.electronAPI.atualVersion((data)=>{
    aVersion.innerHTML = data;
});

window.electronAPI.updNVersion((data)=>{
    uVersion.innerHTML = data;
});