const DEVELOPMENT_MODE = false; // ← MUDE PARA false PARA PRODUÇÃO
const PORTAL_URL = 'https://ir-comercio-portal-zcan.onrender.com';
const API_URL = 'https://pregoes.onrender.com/api'; // USAR RENDER

let pregoes = [];
let mesSelecionado = 'TODOS';
let mesesDisponiveis = new Set();
let pregaoAtual = null;
let sessionToken = null;
let isOnline = false;
let lastDataHash = '';

const mesesNomes = {
    '01': 'JANEIRO', '02': 'FEVEREIRO', '03': 'MARÇO', '04': 'ABRIL',
    '05': 'MAIO', '06': 'JUNHO', '07': 'JULHO', '08': 'AGOSTO',
    '09': 'SETEMBRO', '10': 'OUTUBRO', '11': 'NOVEMBRO', '12': 'DEZEMBRO'
};

console.log('🚀 Pregões iniciado');
console.log('📍 API URL:', API_URL);
console.log('🔧 Modo desenvolvimento:', DEVELOPMENT_MODE);

document.addEventListener('DOMContentLoaded', () => {
    if (DEVELOPMENT_MODE) {
        console.log('⚠️ MODO DESENVOLVIMENTO ATIVADO');
        sessionToken = 'dev-mode';
        inicializarApp();
    } else {
        verificarAutenticacao();
    }
});

function verificarAutenticacao() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('sessionToken');

    if (tokenFromUrl) {
        sessionToken = tokenFromUrl;
        sessionStorage.setItem('pregoesSession', tokenFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        sessionToken = sessionStorage.getItem('pregoesSession');
    }

    if (!sessionToken) {
        mostrarTelaAcessoNegado();
        return;
    }

    inicializarApp();
}

function mostrarTelaAcessoNegado(mensagem = 'NÃO AUTORIZADO') {
    document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: var(--bg-primary); color: var(--text-primary); text-align: center; padding: 2rem;">
            <h1 style="font-size: 2.2rem; margin-bottom: 1rem;">${mensagem}</h1>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">Somente usuários autenticados podem acessar esta área.</p>
            <a href="${PORTAL_URL}" style="display: inline-block; background: var(--btn-register); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Ir para o Portal</a>
        </div>
    `;
}

function inicializarApp() {
    atualizarMesesDisponiveis();
    renderMesesFilter();
    filterPregoes();
    checkServerStatus();
    setInterval(checkServerStatus, 15000);
    startPolling();
}

async function checkServerStatus() {
    try {
        const headers = {
            'Accept': 'application/json'
        };
        
        if (!DEVELOPMENT_MODE && sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }

        const response = await fetch(`${API_URL}/pregoes`, {
            method: 'GET',
            headers: headers,
            mode: 'cors'
        });

        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('pregoesSession');
            mostrarTelaAcessoNegado('Sua sessão expirou');
            return false;
        }

        const wasOffline = !isOnline;
        isOnline = response.ok;
        
        if (wasOffline && isOnline) {
            console.log('✅ SERVIDOR ONLINE');
            await loadPregoes();
        }
        
        updateConnectionStatus();
        return isOnline;
    } catch (error) {
        console.error('❌ Erro ao verificar servidor:', error);
        isOnline = false;
        updateConnectionStatus();
        return false;
    }
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.className = isOnline ? 'connection-status online' : 'connection-status offline';
    }
}

function startPolling() {
    loadPregoes();
    setInterval(() => {
        if (isOnline) loadPregoes();
    }, 10000);
}

async function loadPregoes() {
    if (!isOnline && !DEVELOPMENT_MODE) return;

    try {
        const headers = {
            'Accept': 'application/json'
        };
        
        if (!DEVELOPMENT_MODE && sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }

        const response = await fetch(`${API_URL}/pregoes`, {
            method: 'GET',
            headers: headers,
            mode: 'cors'
        });

        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('pregoesSession');
            mostrarTelaAcessoNegado('Sua sessão expirou');
            return;
        }

        if (!response.ok) {
            console.error('❌ Erro ao carregar pregões:', response.status);
            return;
        }

        const data = await response.json();
        pregoes = data.map(p => convertFromDatabase(p));
        
        const newHash = JSON.stringify(pregoes.map(p => p.id));
        if (newHash !== lastDataHash) {
            lastDataHash = newHash;
            atualizarMesesDisponiveis();
            renderMesesFilter();
            filterPregoes();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
    }
}

function convertFromDatabase(dbPregao) {
    return {
        id: dbPregao.id,
        orgao: dbPregao.orgao || '',
        uasg: dbPregao.uasg || '',
        numeroPregao: dbPregao.numero_pregao,
        data: dbPregao.data,
        sistema: dbPregao.sistema || '',
        vendedor: dbPregao.vendedor || '',
        status: dbPregao.status || 'aberto',
        cidadeUf: dbPregao.cidade_uf || '',
        telefone: dbPregao.telefone || '',
        email: dbPregao.email || '',
        modoDisputa: dbPregao.modo_disputa || 'ABERTO',
        selecionaveis: dbPregao.selecionaveis || {},
        margemVenda: dbPregao.margem_venda || 149,
        itens: dbPregao.itens || [],
        proposta: dbPregao.proposta
    };
}

function convertToDatabase(pregao) {
    return {
        id: pregao.id,
        orgao: pregao.orgao,
        uasg: pregao.uasg,
        numeroPregao: pregao.numeroPregao,
        data: pregao.data,
        sistema: pregao.sistema,
        vendedor: pregao.vendedor,
        status: pregao.status,
        cidadeUf: pregao.cidadeUf,
        telefone: pregao.telefone,
        email: pregao.email,
        modoDisputa: pregao.modoDisputa,
        selecionaveis: pregao.selecionaveis,
        margemVenda: pregao.margemVenda,
        itens: pregao.itens,
        proposta: pregao.proposta
    };
}


// ============================================
// STATUS DE CONEXÃO
// ============================================
function checkConnection() {
    fetch(`${API_URL}/health`)
        .then(res => res.json())
        .then(() => updateConnectionStatus(true))
        .catch(() => updateConnectionStatus(false));
}

setInterval(checkConnection, 30000); // Check a cada 30 segundos

// ============================================
// FILTRO POR MÊS
// ============================================
function atualizarMesesDisponiveis() {
    mesesDisponiveis.clear();
    pregoes.forEach(p => {
        if (p.data) {
            const mes = p.data.substring(5, 7);
            mesesDisponiveis.add(mes);
        }
    });
}

function renderMesesFilter() {
    const container = document.getElementById('mesesFilter');
    if (!container) return;

    const mesesArray = Array.from(mesesDisponiveis).sort();
    const fragment = document.createDocumentFragment();
    
    const btnTodos = document.createElement('button');
    btnTodos.className = `mes-button ${mesSelecionado === 'TODOS' ? 'active' : ''}`;
    btnTodos.textContent = 'TODOS';
    btnTodos.onclick = () => window.selecionarMes('TODOS');
    fragment.appendChild(btnTodos);
    
    mesesArray.forEach(mes => {
        const button = document.createElement('button');
        button.className = `mes-button ${mes === mesSelecionado ? 'active' : ''}`;
        button.textContent = mesesNomes[mes];
        button.onclick = () => window.selecionarMes(mes);
        fragment.appendChild(button);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

window.selecionarMes = function(mes) {
    mesSelecionado = mes;
    renderMesesFilter();
    filterPregoes();
};

// ============================================
// FILTROS
// ============================================
function filterPregoes() {
    const searchTerm = document.getElementById('search')?.value.toLowerCase() || '';
    const filterVendedor = document.getElementById('filterVendedor')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    
    let filtered = [...pregoes];

    if (mesSelecionado !== 'TODOS') {
        filtered = filtered.filter(p => {
            const mes = p.data.substring(5, 7);
            return mes === mesSelecionado;
        });
    }

    if (filterVendedor) {
        filtered = filtered.filter(p => p.vendedor === filterVendedor);
    }

    if (filterStatus) {
        filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.orgao?.toLowerCase().includes(searchTerm) ||
            p.uasg?.toLowerCase().includes(searchTerm) ||
            p.numeroPregao?.toLowerCase().includes(searchTerm) ||
            p.vendedor?.toLowerCase().includes(searchTerm)
        );
    }

    filtered.sort((a, b) => new Date(b.data) - new Date(a.data));
    renderPregoes(filtered);
}

// ============================================
// MODAL DE CONFIRMAÇÃO
// ============================================
function showConfirm(message, options = {}) {
    return new Promise((resolve) => {
        const { title = 'Confirmação', confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' } = options;

        const modalHTML = `
            <div class="modal-overlay" id="confirmModal" style="z-index: 10001;">
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                    </div>
                    <p style="margin: 1.5rem 0; color: var(--text-primary); font-size: 1rem; line-height: 1.6;">${message}</p>
                    <div class="modal-actions">
                        <button class="secondary" id="modalCancelBtn">${cancelText}</button>
                        <button class="${type === 'warning' ? 'danger' : 'success'}" id="modalConfirmBtn">${confirmText}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('confirmModal');
        const confirmBtn = document.getElementById('modalConfirmBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');

        const cleanup = () => {
            modal.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => modal.remove(), 200);
        };

        confirmBtn.onclick = () => {
            cleanup();
            resolve(true);
        };

        cancelBtn.onclick = () => {
            cleanup();
            resolve(false);
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                cleanup();
                resolve(false);
            }
        };
    });
}

// Funções básicas de CRUD
async function savePregao(pregaoData) {
    try {
        const dbData = convertToDatabase(pregaoData);
        const headers = {'Content-Type': 'application/json', 'Accept': 'application/json'};
        if (!DEVELOPMENT_MODE && sessionToken) headers['X-Session-Token'] = sessionToken;
        
        const config = {
            method: pregaoData.id ? 'PUT' : 'POST',
            headers: headers,
            body: JSON.stringify(dbData),
            mode: 'cors'
        };
        
        const url = pregaoData.id ? `${API_URL}/pregoes/${pregaoData.id}` : `${API_URL}/pregoes`;
        const response = await fetch(url, config);
        
        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('pregoesSession');
            mostrarTelaAcessoNegado('Sua sessão expirou');
            return false;
        }
        
        if (!response.ok) throw new Error('Erro ao salvar pregão');
        const updated = await response.json();
        const index = pregoes.findIndex(p => p.id === pregaoData.id);
        if (index !== -1) pregoes[index] = convertFromDatabase(updated);
        else pregoes.push(convertFromDatabase(updated));
        
        console.log(`✅ Pregão ${pregaoData.id ? 'atualizado' : 'criado'}`);
        isOnline = true;
        updateConnectionStatus();
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar pregão:', error);
        isOnline = false;
        updateConnectionStatus();
        showMessage('Erro ao salvar no servidor', 'error');
        return false;
    }
}

async function deletePregaoAPI(id) {
    try {
        const headers = {};
        if (!DEVELOPMENT_MODE && sessionToken) headers['X-Session-Token'] = sessionToken;
        const response = await fetch(`${API_URL}/pregoes/${id}`, {method: 'DELETE', headers: headers});
        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('pregoesSession');
            mostrarTelaAcessoNegado('Sua sessão expirou');
            return false;
        }
        if (!response.ok) throw new Error('Erro ao deletar pregão');
        pregoes = pregoes.filter(p => p.id !== id);
        console.log(`✅ Pregão ${id} deletado`);
        isOnline = true;
        updateConnectionStatus();
        return true;
    } catch (error) {
        console.error('❌ Erro ao deletar pregão:', error);
        showMessage('Erro ao deletar no servidor', 'error');
        return false;
    }
}

async function updateStatus(id, status) {
    try {
        const headers = {'Content-Type': 'application/json'};
        if (!DEVELOPMENT_MODE && sessionToken) headers['X-Session-Token'] = sessionToken;
        const response = await fetch(`${API_URL}/pregoes/${id}/status`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({ status })
        });
        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('pregoesSession');
            mostrarTelaAcessoNegado('Sua sessão expirou');
            return false;
        }
        if (!response.ok) throw new Error('Erro ao atualizar status');
        const updated = await response.json();
        const pregao = pregoes.find(p => p.id === id);
        if (pregao) pregao.status = updated.status;
        console.log(`✅ Status atualizado para ${status}`);
        isOnline = true;
        updateConnectionStatus();
        return true;
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        return false;
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function showMessage(message, type) {
    const oldMessages = document.querySelectorAll('.floating-message');
    oldMessages.forEach(msg => msg.remove());
    const messageDiv = document.createElement('div');
    messageDiv.className = `floating-message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

function renderPregoes(pregoesToRender) {
    const container = document.getElementById('pregoesContainer');
    if (!container) return;
    if (!pregoesToRender || pregoesToRender.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary)">Nenhum pregão encontrado</div>';
        return;
    }
    container.innerHTML = '<div style="overflow-x:auto"><table><thead><tr><th style="text-align:center;width:60px"> </th><th>UASG</th><th>Nº PREGÃO</th><th>Data</th><th>Vendedor</th><th>Status</th><th style="text-align:center;min-width:250px">Ações</th></tr></thead><tbody>' + pregoesToRender.map(p => `<tr class="${p.status === 'ganho' ? 'ganho' : ''}"><td style="text-align:center"><div class="checkbox-wrapper"><input type="checkbox" id="check-${p.id}" ${p.status === 'ganho' ? 'checked' : ''} onchange="toggleStatus(${p.id})" class="styled-checkbox"><label for="check-${p.id}" class="checkbox-label-styled"></label></div></td><td><strong>${p.uasg || 'N/A'}</strong></td><td><strong>${p.numeroPregao}</strong></td><td>${formatDate(p.data)}</td><td>${p.vendedor || 'N/A'}</td><td><span class="badge ${p.status}">${p.status.toUpperCase()}</span></td><td class="actions-cell" style="text-align:center"><button onclick="viewPregao(${p.id})" class="action-btn view">Ver</button><button onclick="editPregao(${p.id})" class="action-btn edit">Editar</button><button onclick="deletePregao(${p.id})" class="action-btn delete">Excluir</button></td></tr>`).join('') + '</tbody></table></div>';
}

window.toggleStatus = async function(id) {
    const pregao = pregoes.find(p => p.id == id);
    if (!pregao) return;
    const novoStatus = pregao.status === 'ganho' ? 'aberto' : 'ganho';
    const success = await updateStatus(id, novoStatus);
    if (success) {
        filterPregoes();
        showMessage(`Pregão marcado como ${novoStatus.toUpperCase()}`, 'success');
    }
};

window.viewPregao = function(id) {
    pregaoAtual = pregoes.find(p => p.id == id);
    if (!pregaoAtual) return;
    document.getElementById('viewScreenTitle').textContent = `Pregão ${pregaoAtual.numeroPregao}`;
    document.getElementById('mainScreen').classList.add('hidden');
    document.getElementById('viewScreen').classList.remove('hidden');
};

window.editPregao = function(id) {
    viewPregao(id);
};

window.deletePregao = async function(id) {
    const confirmed = await showConfirm('Tem certeza que deseja excluir este pregão? Esta ação não pode ser desfeita.', { title: 'Excluir Pregão', confirmText: 'Excluir', type: 'warning' });
    if (confirmed) {
        const success = await deletePregaoAPI(id);
        if (success) {
            atualizarMesesDisponiveis();
            renderMesesFilter();
            filterPregoes();
            showMessage('Pregão excluído com sucesso!', 'error');
        }
    }
};

window.voltarParaPregoes = function() {
    document.getElementById('viewScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    pregaoAtual = null;
};

console.log('✅ Script carregado com sucesso!');
