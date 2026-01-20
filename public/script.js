const DEVELOPMENT_MODE = true;
const PORTAL_URL = 'https://ir-comercio-portal-zcan.onrender.com';
const API_URL = 'https://ordem-compra.onrender.com/api'; // USAR RENDER

let ordens = [];
let currentMonth = new Date();
let editingId = null;
let itemContador = 0;
let currentTab = 0;
let currentInfoTab = 0;
let isOnline = false;
let sessionToken = null;
let lastDataHash = '';
let fornecedoresCache = {};

const tabs = ['tab-geral', 'tab-fornecedor', 'tab-pedido', 'tab-entrega', 'tab-pagamento'];

console.log('🚀 Ordem de Compra iniciada');
console.log('📍 API URL:', API_URL);
console.log('🔧 Modo desenvolvimento:', DEVELOPMENT_MODE);

function toUpperCase(value) {
    return value ? String(value).toUpperCase() : '';
}

// Converter input para maiúsculo automaticamente
function setupUpperCaseInputs() {
    const textInputs = document.querySelectorAll('input[type="text"]:not([readonly]), textarea');
    textInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = toUpperCase(this.value);
            this.setSelectionRange(start, end);
        });
    });
}

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
        sessionStorage.setItem('ordemCompraSession', tokenFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        sessionToken = sessionStorage.getItem('ordemCompraSession');
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
    updateDisplay();
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

        const response = await fetch(`${API_URL}/ordens`, {
            method: 'GET',
            headers: headers,
            mode: 'cors'
        });

        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('ordemCompraSession');
            mostrarTelaAcessoNegado('Sua sessão expirou');
            return false;
        }

        const wasOffline = !isOnline;
        isOnline = response.ok;

        if (wasOffline && isOnline) {
            console.log('✅ SERVIDOR ONLINE');
            await loadOrdens();
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
    loadOrdens();
    setInterval(() => {
        if (isOnline) loadOrdens();
    }, 10000);
}

async function loadOrdens() {
    if (!isOnline && !DEVELOPMENT_MODE) return;

    try {
        const headers = {
            'Accept': 'application/json'
        };

        if (!DEVELOPMENT_MODE && sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }

        const response = await fetch(`${API_URL}/ordens`, {
            method: 'GET',
            headers: headers,
            mode: 'cors'
        });

        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('ordemCompraSession');
            mostrarTelaAcessoNegado('Sua sessão expirou');
            return;
        }

        if (!response.ok) {
            console.error('❌ Erro ao carregar ordens:', response.status);
            return;
        }

        const data = await response.json();
        ordens = data;

        atualizarCacheFornecedores(data);

        const newHash = JSON.stringify(ordens.map(o => o.id));
        if (newHash !== lastDataHash) {
            lastDataHash = newHash;
            updateDisplay();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
    }
}

// FUNÇÃO DE SINCRONIZAÇÃO DE DADOS
async function syncData() {
    console.log('🔄 Iniciando sincronização...');

    if (!isOnline && !DEVELOPMENT_MODE) {
        showToast('Servidor offline. Não é possível sincronizar.', 'error');
        console.log('❌ Sincronização cancelada: servidor offline');
        return;
    }

    try {
        // Mostrar mensagem de sincronização iniciada
        showToast('Sincronizando dados...', 'info');

        // Forçar recarregamento dos dados
        const headers = {
            'Accept': 'application/json'
        };

        if (!DEVELOPMENT_MODE && sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }

        const response = await fetch(`${API_URL}/ordens`, {
            method: 'GET',
            headers: headers,
            mode: 'cors',
            cache: 'no-cache' // Força buscar dados frescos
        });

        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('ordemCompraSession');
            mostrarTelaAcessoNegado('Sua sessão expirou');
            return;
        }

        if (!response.ok) {
            throw new Error(`Erro ao sincronizar: ${response.status}`);
        }

        const data = await response.json();
        ordens = data;

        // Atualizar cache de fornecedores
        atualizarCacheFornecedores(data);

        // Atualizar hash e display
        lastDataHash = JSON.stringify(ordens.map(o => o.id));
        updateDisplay();

        console.log(`✅ Sincronização concluída: ${ordens.length} ordens carregadas`);
        showToast(`Sincronização concluída! ${ordens.length} ordens`, 'success');

    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        showToast('Erro ao sincronizar dados', 'error');
    }
}

function atualizarCacheFornecedores(ordens) {
    fornecedoresCache = {};
    
    if (!ordens || !Array.isArray(ordens)) return;
    
    ordens.forEach(ordem => {
        const cnpj = ordem.cnpj;
        if (cnpj && !fornecedoresCache[cnpj]) {
            fornecedoresCache[cnpj] = {
                razaoSocial: ordem.razao_social || ordem.razaoSocial,
                nomeFantasia: ordem.nome_fantasia || ordem.nomeFantasia,
                endereco: ordem.endereco_fornecedor || ordem.enderecoFornecedor,
                site: ordem.site,
                contato: ordem.contato,
                telefone: ordem.telefone,
                email: ordem.email
            };
        }
    });
    
    console.log(`📋 Cache atualizado: ${Object.keys(fornecedoresCache).length} fornecedores`);
}

function updateDisplay() {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthDisplay = document.getElementById('currentMonth');
    if (monthDisplay) {
        monthDisplay.textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    }

    const filtered = getFilteredOrdens();
    updateDashboard(filtered);
    renderOrdens(filtered);
    updateFilters();
}

function getFilteredOrdens() {
    const searchTerm = (document.getElementById('search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const responsavelFilter = document.getElementById('filterResponsavel')?.value || '';

    return ordens.filter(ordem => {
        const dataOrdem = new Date(ordem.data_ordem + 'T00:00:00');
        const mesOrdem = dataOrdem.getMonth();
        const anoOrdem = dataOrdem.getFullYear();
        
        const mesAtual = currentMonth.getMonth();
        const anoAtual = currentMonth.getFullYear();

        if (mesOrdem !== mesAtual || anoOrdem !== anoAtual) {
            return false;
        }

        const searchMatch = !searchTerm || 
            (ordem.numero_ordem || '').toLowerCase().includes(searchTerm) ||
            (ordem.razao_social || '').toLowerCase().includes(searchTerm) ||
            (ordem.responsavel || '').toLowerCase().includes(searchTerm);

        const statusMatch = !statusFilter || ordem.status === statusFilter;
        const responsavelMatch = !responsavelFilter || ordem.responsavel === responsavelFilter;

        return searchMatch && statusMatch && responsavelMatch;
    });
}

function updateFilters() {
    const responsavelFilter = document.getElementById('filterResponsavel');
    if (!responsavelFilter) return;

    const responsaveis = [...new Set(ordens.map(o => o.responsavel))].sort();
    const currentValue = responsavelFilter.value;
    
    responsavelFilter.innerHTML = '<option value="">Responsável</option>';
    responsaveis.forEach(resp => {
        const option = document.createElement('option');
        option.value = resp;
        option.textContent = resp;
        responsavelFilter.appendChild(option);
    });
    
    responsavelFilter.value = currentValue;
}

function filterOrdens() {
    updateDisplay();
}

function updateDashboard(filtered) {
    const totalEl = document.getElementById('totalOrdens');
    const fechadasEl = document.getElementById('totalFechadas');
    const abertasEl = document.getElementById('totalAbertas');
    const valorEl = document.getElementById('valorTotal');

    if (totalEl) totalEl.textContent = filtered.length;
    
    const fechadas = filtered.filter(o => o.status === 'fechada').length;
    const abertas = filtered.filter(o => o.status === 'aberta').length;
    
    if (fechadasEl) fechadasEl.textContent = fechadas;
    if (abertasEl) abertasEl.textContent = abertas;

    const total = filtered.reduce((sum, ordem) => {
        const valor = (ordem.valor_total || 'R$ 0,00')
            .replace('R$', '')
            .replace(/\./g, '')
            .replace(',', '.');
        return sum + (parseFloat(valor) || 0);
    }, 0);

    if (valorEl) {
        valorEl.textContent = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function renderOrdens(filtered) {
    const container = document.getElementById('ordensContainer');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    Nenhuma ordem encontrada
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = filtered.map(ordem => `
        <tr class="ordem-row ${ordem.status}">
            <td style="text-align: center;">
                <div class="checkbox-wrapper">
                    <input type="checkbox" 
                           class="ordem-checkbox" 
                           data-id="${ordem.id}"
                           ${ordem.status === 'fechada' ? 'checked' : ''}
                           onchange="toggleOrdemStatus('${ordem.id}', this.checked)">
                </div>
            </td>
            <td class="numero-ordem">${ordem.numero_ordem || '-'}</td>
            <td>${ordem.responsavel || '-'}</td>
            <td>${ordem.razao_social || '-'}</td>
            <td>${new Date(ordem.data_ordem + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td class="valor-col">${ordem.valor_total || 'R$ 0,00'}</td>
            <td>
                <span class="status-badge ${ordem.status}">
                    ${ordem.status === 'aberta' ? 'Aberta' : 'Fechada'}
                </span>
            </td>
            <td class="actions-cell">
                <button onclick="openInfoModal('${ordem.id}')" class="btn-action btn-view" title="Visualizar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </button>
                <button onclick="editOrdem('${ordem.id}')" class="btn-action btn-edit" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button onclick="gerarPDF('${ordem.id}')" class="btn-action btn-pdf" title="Gerar PDF">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </button>
                <button onclick="deleteOrdem('${ordem.id}')" class="btn-action btn-delete" title="Excluir">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function changeMonth(delta) {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    updateDisplay();
}

async function toggleOrdemStatus(id, checked) {
    const novoStatus = checked ? 'fechada' : 'aberta';
    
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (!DEVELOPMENT_MODE && sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }

        const response = await fetch(`${API_URL}/ordens/${id}/status`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({ status: novoStatus })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar status');
        }

        await loadOrdens();
        showToast(`Status atualizado para ${novoStatus}`, 'success');
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar status', 'error');
        await loadOrdens();
    }
}

async function deleteOrdem(id) {
    if (!confirm('Tem certeza que deseja excluir esta ordem?')) return;

    try {
        const headers = {
            'Accept': 'application/json'
        };

        if (!DEVELOPMENT_MODE && sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }

        const response = await fetch(`${API_URL}/ordens/${id}`, {
            method: 'DELETE',
            headers: headers
        });

        if (!response.ok) {
            throw new Error('Erro ao deletar ordem');
        }

        await loadOrdens();
        showToast('Ordem excluída com sucesso', 'success');
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao excluir ordem', 'error');
    }
}

function showToast(message, type = 'success') {
    const oldMessages = document.querySelectorAll('.floating-message');
    oldMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `floating-message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutBottom 0.3s ease forwards';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Funções de modal de visualização
function openInfoModal(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) return;

    const modal = document.getElementById('infoModal');
    if (!modal) return;

    document.getElementById('modalNumero').textContent = ordem.numero_ordem;

    currentInfoTab = 0;
    renderInfoTab(ordem, 0);
    updateInfoTabButtons();

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (!modal) return;

    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

function switchInfoTab(tabId) {
    const tabs = ['info-tab-geral', 'info-tab-fornecedor', 'info-tab-pedido', 'info-tab-entrega', 'info-tab-pagamento'];
    const tabIndex = tabs.indexOf(tabId);
    
    if (tabIndex === -1) return;

    document.querySelectorAll('.tabs-nav .tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === tabIndex);
    });

    document.querySelectorAll('.tab-content').forEach((content, i) => {
        content.classList.toggle('active', i === tabIndex);
    });

    currentInfoTab = tabIndex;
    updateInfoTabButtons();
}

function nextInfoTab() {
    if (currentInfoTab < 4) {
        const tabs = ['info-tab-geral', 'info-tab-fornecedor', 'info-tab-pedido', 'info-tab-entrega', 'info-tab-pagamento'];
        switchInfoTab(tabs[currentInfoTab + 1]);
    }
}

function previousInfoTab() {
    if (currentInfoTab > 0) {
        const tabs = ['info-tab-geral', 'info-tab-fornecedor', 'info-tab-pedido', 'info-tab-entrega', 'info-tab-pagamento'];
        switchInfoTab(tabs[currentInfoTab - 1]);
    }
}

function updateInfoTabButtons() {
    const btnPrevious = document.getElementById('btnInfoPrevious');
    const btnNext = document.getElementById('btnInfoNext');
    const btnClose = document.getElementById('btnInfoClose');

    if (btnPrevious) {
        btnPrevious.style.display = currentInfoTab > 0 ? 'inline-block' : 'none';
    }

    if (btnNext) {
        btnNext.style.display = currentInfoTab < 4 ? 'inline-block' : 'none';
    }

    if (btnClose) {
        btnClose.style.display = currentInfoTab === 4 ? 'inline-block' : 'none';
    }
}

function renderInfoTab(ordem, tabIndex) {
    const tabs = ['info-tab-geral', 'info-tab-fornecedor', 'info-tab-pedido', 'info-tab-entrega', 'info-tab-pagamento'];
    const tabId = tabs[tabIndex];
    const tabElement = document.getElementById(tabId);
    
    if (!tabElement) return;

    switch(tabIndex) {
        case 0: // Geral
            tabElement.innerHTML = `
                <div class="info-grid">
                    <div class="info-item">
                        <label>Número da Ordem</label>
                        <span>${ordem.numero_ordem || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Responsável</label>
                        <span>${ordem.responsavel || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Data da Ordem</label>
                        <span>${new Date(ordem.data_ordem + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div class="info-item">
                        <label>Status</label>
                        <span class="status-badge ${ordem.status}">${ordem.status === 'aberta' ? 'Aberta' : 'Fechada'}</span>
                    </div>
                </div>
            `;
            break;

        case 1: // Fornecedor
            tabElement.innerHTML = `
                <div class="info-grid">
                    <div class="info-item">
                        <label>Razão Social</label>
                        <span>${ordem.razao_social || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Nome Fantasia</label>
                        <span>${ordem.nome_fantasia || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>CNPJ</label>
                        <span>${ordem.cnpj || '-'}</span>
                    </div>
                    <div class="info-item full-width">
                        <label>Endereço</label>
                        <span>${ordem.endereco_fornecedor || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Site</label>
                        <span>${ordem.site || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Contato</label>
                        <span>${ordem.contato || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Telefone</label>
                        <span>${ordem.telefone || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>E-mail</label>
                        <span>${ordem.email || '-'}</span>
                    </div>
                </div>
            `;
            break;

        case 2: // Pedido
            const items = ordem.items || [];
            tabElement.innerHTML = `
                <div class="items-table-container">
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Descrição</th>
                                <th>Qtd</th>
                                <th>Un</th>
                                <th>Unitário</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.length > 0 ? items.map((item, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td>${item.descricao || '-'}</td>
                                    <td>${item.quantidade || '-'}</td>
                                    <td>${item.unidade || '-'}</td>
                                    <td>${item.valorUnitario || item.valor_unitario || '-'}</td>
                                    <td>${item.valorTotal || item.valor_total || '-'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="6" style="text-align: center;">Nenhum item cadastrado</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div class="info-item" style="margin-top: 1rem;">
                    <label>Valor Total</label>
                    <span class="valor-total-destaque">${ordem.valor_total || 'R$ 0,00'}</span>
                </div>
            `;
            break;

        case 3: // Entrega
            tabElement.innerHTML = `
                <div class="info-grid">
                    <div class="info-item full-width">
                        <label>Local de Entrega</label>
                        <span>${ordem.local_entrega || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Prazo de Entrega</label>
                        <span>${ordem.prazo_entrega || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Frete</label>
                        <span>${ordem.frete || '-'}</span>
                    </div>
                    <div class="info-item full-width">
                        <label>Transporte</label>
                        <span>${ordem.transporte || '-'}</span>
                    </div>
                </div>
            `;
            break;

        case 4: // Pagamento
            tabElement.innerHTML = `
                <div class="info-grid">
                    <div class="info-item">
                        <label>Forma de Pagamento</label>
                        <span>${ordem.forma_pagamento || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Prazo de Pagamento</label>
                        <span>${ordem.prazo_pagamento || '-'}</span>
                    </div>
                    <div class="info-item full-width">
                        <label>Dados Bancários</label>
                        <span>${ordem.dados_bancarios || '-'}</span>
                    </div>
                </div>
            `;
            break;
    }
}

// Funções de edição (placeholder - você precisará implementar o modal de edição completo)
function editOrdem(id) {
    alert('Função de edição em desenvolvimento');
}

function openFormModal() {
    alert('Função de criação de ordem em desenvolvimento');
}

// Função de geração de PDF
function gerarPDF(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) {
        showToast('Ordem não encontrada', 'error');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurações básicas
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = margin;

        // Cabeçalho
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('ORDEM DE COMPRA', pageWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Nº ${ordem.numero_ordem}`, pageWidth / 2, y, { align: 'center' });
        y += 15;

        // Informações básicas
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('DADOS GERAIS', margin, y);
        y += 7;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Responsável: ${ordem.responsavel}`, margin, y);
        y += 5;
        doc.text(`Data: ${new Date(ordem.data_ordem + 'T00:00:00').toLocaleDateString('pt-BR')}`, margin, y);
        y += 5;
        doc.text(`Status: ${ordem.status === 'aberta' ? 'Aberta' : 'Fechada'}`, margin, y);
        y += 10;

        // Fornecedor
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('FORNECEDOR', margin, y);
        y += 7;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Razão Social: ${toUpperCase(ordem.razao_social)}`, margin, y);
        y += 5;
        if (ordem.nome_fantasia) {
            doc.text(`Nome Fantasia: ${toUpperCase(ordem.nome_fantasia)}`, margin, y);
            y += 5;
        }
        doc.text(`CNPJ: ${ordem.cnpj}`, margin, y);
        y += 5;
        if (ordem.endereco_fornecedor) {
            doc.text(`Endereço: ${toUpperCase(ordem.endereco_fornecedor)}`, margin, y);
            y += 5;
        }
        if (ordem.telefone) {
            doc.text(`Telefone: ${ordem.telefone}`, margin, y);
            y += 5;
        }
        if (ordem.email) {
            doc.text(`E-mail: ${ordem.email}`, margin, y);
            y += 5;
        }
        y += 5;

        // Items
        if (ordem.items && ordem.items.length > 0) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('ITENS DO PEDIDO', margin, y);
            y += 7;

            doc.setFontSize(9);
            ordem.items.forEach((item, idx) => {
                if (y > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                }
                doc.setFont(undefined, 'normal');
                doc.text(`${idx + 1}. ${toUpperCase(item.descricao || '-')}`, margin, y);
                y += 5;
                doc.text(`   Qtd: ${item.quantidade} ${item.unidade} | Unitário: ${item.valorUnitario || item.valor_unitario} | Total: ${item.valorTotal || item.valor_total}`, margin, y);
                y += 7;
            });
        }

        // Valor Total
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`VALOR TOTAL: ${ordem.valor_total}`, margin, y);
        y += 10;

        // Informações de entrega
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('ENTREGA', margin, y);
        y += 7;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        if (ordem.local_entrega) {
            doc.text(`Local: ${toUpperCase(ordem.local_entrega)}`, margin, y);
            y += 5;
        }
        if (ordem.prazo_entrega) {
            doc.text(`Prazo: ${toUpperCase(ordem.prazo_entrega)}`, margin, y);
            y += 5;
        }
        if (ordem.frete) {
            doc.text(`Frete: ${toUpperCase(ordem.frete)}`, margin, y);
            y += 5;
        }
        if (ordem.transporte) {
            doc.text(`Transporte: ${toUpperCase(ordem.transporte)}`, margin, y);
            y += 5;
        }
        y += 5;

        // Pagamento
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('CONDIÇÕES DE PAGAMENTO', margin, y);
        y += 7;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Forma: ${toUpperCase(ordem.forma_pagamento)}`, margin, y);
        y += 5;
        doc.text(`Prazo: ${toUpperCase(ordem.prazo_pagamento)}`, margin, y);
        y += 5;
        if (ordem.dados_bancarios) {
            doc.text(`Dados Bancários: ${toUpperCase(ordem.dados_bancarios)}`, margin, y);
            y += 5;
        }

        // Salvar PDF
        doc.save(`${toUpperCase(ordem.razao_social)}-${ordem.numero_ordem}.pdf`);
        showToast('PDF gerado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        showToast('Erro ao gerar PDF', 'error');
    }
}
