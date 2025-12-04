// ============================================
// CONFIGURAÇÃO
// ============================================
const PORTAL_URL = 'https://ir-comercio-portal-zcan.onrender.com';
const API_URL = 'https://ordem-de-compra.onrender.com/api'; // ALTERE AQUI PARA SEU URL

let ordens = [];
let isOnline = false;
let lastDataHash = '';
let sessionToken = null;
let currentMonth = new Date();
let editingId = null;
let itemCounter = 0;
let currentTab = 0;

const tabs = ['tab-geral', 'tab-fornecedor', 'tab-pedido', 'tab-entrega', 'tab-pagamento'];

console.log('🚀 Ordem de Compra iniciada');

document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
});

// ============================================
// AUTENTICAÇÃO
// ============================================
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

// ============================================
// CONEXÃO E STATUS
// ============================================
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_URL}/ordens`, {
            method: 'GET',
            headers: { 
                'X-Session-Token': sessionToken,
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (response.status === 401) {
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
        isOnline = false;
        updateConnectionStatus();
        return false;
    }
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    if (statusElement) {
        statusElement.className = isOnline ? 'connection-status online' : 'connection-status offline';
        if (statusText) {
            statusText.textContent = isOnline ? 'Online' : 'Offline';
        }
    }
}

// ============================================
// MAPEAMENTO DE DADOS
// ============================================
function mapearOrdem(ordem) {
    return {
        id: ordem.id,
        numeroOrdem: ordem.numero_ordem,
        responsavel: ordem.responsavel,
        dataOrdem: ordem.data_ordem,
        razaoSocial: ordem.razao_social,
        nomeFantasia: ordem.nome_fantasia,
        cnpj: ordem.cnpj,
        enderecoFornecedor: ordem.endereco_fornecedor,
        site: ordem.site,
        contato: ordem.contato,
        telefone: ordem.telefone,
        email: ordem.email,
        items: ordem.items,
        valorTotal: ordem.valor_total,
        frete: ordem.frete,
        localEntrega: ordem.local_entrega,
        prazoEntrega: ordem.prazo_entrega,
        transporte: ordem.transporte,
        formaPagamento: ordem.forma_pagamento,
        prazoPagamento: ordem.prazo_pagamento,
        dadosBancarios: ordem.dados_bancarios,
        status: ordem.status,
        timestamp: new Date(ordem.created_at).getTime()
    };
}

// ============================================
// CARREGAMENTO DE DADOS
// ============================================
async function loadOrdens() {
    if (!isOnline) return;

    try {
        const response = await fetch(`${API_URL}/ordens`, {
            method: 'GET',
            headers: { 
                'X-Session-Token': sessionToken,
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (response.status === 401) {
            sessionStorage.removeItem('ordemCompraSession');
            mostrarTelaAcessoNegado('Sua sessão expirou');
            return;
        }

        if (!response.ok) return;

        const data = await response.json();
        ordens = data.map(mapearOrdem);
        
        const newHash = JSON.stringify(ordens.map(o => o.id));
        if (newHash !== lastDataHash) {
            lastDataHash = newHash;
            console.log(`${ordens.length} ordens carregadas`);
            updateDisplay();
        }
    } catch (error) {
        console.error('Erro ao carregar:', error);
    }
}

function startPolling() {
    loadOrdens();
    setInterval(() => {
        if (isOnline) loadOrdens();
    }, 10000);
}

// ============================================
// NAVEGAÇÃO DE MÊS
// ============================================
function changeMonth(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    updateDisplay();
}

function updateMonthDisplay() {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthName = months[currentMonth.getMonth()];
    const year = currentMonth.getFullYear();
    document.getElementById('currentMonth').textContent = `${monthName} ${year}`;
}

// ============================================
// SISTEMA DE ABAS - NAVEGAÇÃO
// ============================================
function switchTab(tabId) {
    const tabIndex = tabs.indexOf(tabId);
    if (tabIndex !== -1) {
        currentTab = tabIndex;
        showTab(currentTab);
    }
}

function showTab(index) {
    const tabButtons = document.querySelectorAll('#formModal .tab-btn');
    const tabContents = document.querySelectorAll('#formModal .tab-content');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    if (tabButtons[index]) tabButtons[index].classList.add('active');
    if (tabContents[index]) tabContents[index].classList.add('active');
}

function switchInfoTab(tabId) {
    document.querySelectorAll('#infoModal .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('#infoModal .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const clickedBtn = event.target.closest('.tab-btn');
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    document.getElementById(tabId).classList.add('active');
}

// ============================================
// MODAL DE CONFIRMAÇÃO
// ============================================
function showConfirm(message, options = {}) {
    return new Promise((resolve) => {
        const { title = 'Confirmação', confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' } = options;

        const modalHTML = `
            <div class="modal-overlay" id="confirmModal" style="z-index: 10001; display: flex;">
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

        const closeModal = (result) => {
            modal.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => { 
                modal.remove(); 
                resolve(result); 
            }, 200);
        };

        confirmBtn.addEventListener('click', () => closeModal(true));
        cancelBtn.addEventListener('click', () => closeModal(false));

        if (!document.querySelector('#modalAnimations')) {
            const style = document.createElement('style');
            style.id = 'modalAnimations';
            style.textContent = `@keyframes fadeOut { to { opacity: 0; } }`;
            document.head.appendChild(style);
        }
    });
}

// ============================================
// MODAL DE FORMULÁRIO
// ============================================
function openFormModal() {
    editingId = null;
    currentTab = 0;
    itemCounter = 0;
    
    const nextNumber = getNextOrderNumber();
    const today = new Date().toISOString().split('T')[0];
    
    const modalHTML = `
        <div class="modal-overlay" id="formModal" style="display: flex;">
            <div class="modal-content" style="max-width: 1200px;">
                <div class="modal-header">
                    <h3 class="modal-title">Nova Ordem de Compra</h3>
                </div>
                
                <div class="tabs-container">
                    <div class="tabs-nav">
                        <button class="tab-btn active" onclick="switchTab('tab-geral')">Geral</button>
                        <button class="tab-btn" onclick="switchTab('tab-fornecedor')">Fornecedor</button>
                        <button class="tab-btn" onclick="switchTab('tab-pedido')">Pedido</button>
                        <button class="tab-btn" onclick="switchTab('tab-entrega')">Entrega</button>
                        <button class="tab-btn" onclick="switchTab('tab-pagamento')">Pagamento</button>
                    </div>

                    <form id="ordemForm" onsubmit="handleSubmit(event)">
                        <input type="hidden" id="editId" value="">
                        
                        <div class="tab-content active" id="tab-geral">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="numeroOrdem">Número da Ordem *</label>
                                    <input type="text" id="numeroOrdem" value="${nextNumber}" required>
                                </div>
                                <div class="form-group">
                                    <label for="responsavel">Responsável *</label>
                                    <input type="text" id="responsavel" required>
                                </div>
                                <div class="form-group">
                                    <label for="dataOrdem">Data da Ordem *</label>
                                    <input type="date" id="dataOrdem" value="${today}" required>
                                </div>
                            </div>
                        </div>

                        <div class="tab-content" id="tab-fornecedor">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="razaoSocial">Razão Social *</label>
                                    <input type="text" id="razaoSocial" required>
                                </div>
                                <div class="form-group">
                                    <label for="nomeFantasia">Nome Fantasia</label>
                                    <input type="text" id="nomeFantasia">
                                </div>
                                <div class="form-group">
                                    <label for="cnpj">CNPJ *</label>
                                    <input type="text" id="cnpj" required>
                                </div>
                                <div class="form-group">
                                    <label for="enderecoFornecedor">Endereço</label>
                                    <input type="text" id="enderecoFornecedor">
                                </div>
                                <div class="form-group">
                                    <label for="site">Site</label>
                                    <input type="text" id="site">
                                </div>
                                <div class="form-group">
                                    <label for="contato">Contato</label>
                                    <input type="text" id="contato">
                                </div>
                                <div class="form-group">
                                    <label for="telefone">Telefone</label>
                                    <input type="text" id="telefone">
                                </div>
                                <div class="form-group">
                                    <label for="email">E-mail</label>
                                    <input type="email" id="email">
                                </div>
                            </div>
                        </div>

                        <div class="tab-content" id="tab-pedido">
                            <button type="button" onclick="addItem()" class="success small" style="margin-bottom: 1rem;">+ Adicionar Item</button>
                            <div style="overflow-x: auto;">
                                <table class="items-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 40px;">Item</th>
                                            <th style="min-width: 200px;">Especificação</th>
                                            <th style="width: 80px;">QTD</th>
                                            <th style="width: 80px;">Unid</th>
                                            <th style="width: 100px;">Valor UN</th>
                                            <th style="width: 100px;">IPI</th>
                                            <th style="width: 100px;">ST</th>
                                            <th style="width: 120px;">Total</th>
                                            <th style="width: 80px;"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="itemsBody"></tbody>
                                </table>
                            </div>
                            <div class="form-group" style="margin-top: 1rem;">
                                <label for="valorTotalOrdem">Valor Total da Ordem</label>
                                <input type="text" id="valorTotalOrdem" readonly value="R$ 0,00">
                            </div>
                            <div class="form-group">
                                <label for="frete">Frete</label>
                                <input type="text" id="frete" placeholder="Ex: CIF, FOB">
                            </div>
                        </div>

                        <div class="tab-content" id="tab-entrega">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="localEntrega">Local de Entrega</label>
                                    <input type="text" id="localEntrega" value="Rua Tadorna nº 472, sala 2, Novo Horizonte - Serra/ES  |  CEP: 29.163-318">
                                </div>
                                <div class="form-group">
                                    <label for="prazoEntrega">Prazo de Entrega</label>
                                    <input type="text" id="prazoEntrega" placeholder="Ex: 10 dias úteis">
                                </div>
                                <div class="form-group">
                                    <label for="transporte">Transporte</label>
                                    <input type="text" id="transporte" placeholder="Ex: Por conta do fornecedor">
                                </div>
                            </div>
                        </div>

                        <div class="tab-content" id="tab-pagamento">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="formaPagamento">Forma de Pagamento *</label>
                                    <input type="text" id="formaPagamento" required placeholder="Ex: Boleto, PIX, Cartão">
                                </div>
                                <div class="form-group">
                                    <label for="prazoPagamento">Prazo de Pagamento *</label>
                                    <input type="text" id="prazoPagamento" required placeholder="Ex: 30 dias">
                                </div>
                                <div class="form-group">
                                    <label for="dadosBancarios">Dados Bancários</label>
                                    <textarea id="dadosBancarios" rows="3"></textarea>
                                </div>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="save">Salvar Ordem</button>
                            <button type="button" onclick="closeFormModal(true)" class="secondary">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    addItem();
    setTimeout(() => document.getElementById('numeroOrdem')?.focus(), 100);
}

function closeFormModal(showCancelMessage = false) {
    const modal = document.getElementById('formModal');
    if (modal) {
        const editId = document.getElementById('editId')?.value;
        const isEditing = editId && editId !== '';
        
        if (showCancelMessage) {
            showToast(isEditing ? 'Atualização cancelada' : 'Registro cancelado', 'error');
        }
        
        modal.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(() => modal.remove(), 200);
    }
}

// ============================================
// GESTÃO DE ITENS
// ============================================
function addItem() {
    itemCounter++;
    const tbody = document.getElementById('itemsBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td style="text-align: center;">${itemCounter}</td>
        <td>
            <textarea class="item-especificacao" placeholder="Descrição do item..." rows="2"></textarea>
        </td>
        <td>
            <input type="number" class="item-qtd" min="0" step="0.01" value="1" onchange="calculateItemTotal(this)">
        </td>
        <td>
            <input type="text" class="item-unid" value="UN" placeholder="UN">
        </td>
        <td>
            <input type="number" class="item-valor" min="0" step="0.01" value="0" onchange="calculateItemTotal(this)">
        </td>
        <td>
            <input type="text" class="item-ipi" placeholder="Ex: Isento">
        </td>
        <td>
            <input type="text" class="item-st" placeholder="Ex: Não incluído">
        </td>
        <td>
            <input type="text" class="item-total" readonly value="R$ 0,00">
        </td>
        <td style="text-align: center;">
            <button type="button" class="danger small" onclick="removeItem(this)">Excluir</button>
        </td>
    `;
    tbody.appendChild(row);
}

function removeItem(btn) {
    const row = btn.closest('tr');
    row.remove();
    recalculateOrderTotal();
    renumberItems();
}

function renumberItems() {
    const rows = document.querySelectorAll('#itemsBody tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
    itemCounter = rows.length;
}

function calculateItemTotal(input) {
    const row = input.closest('tr');
    const qtd = parseFloat(row.querySelector('.item-qtd').value) || 0;
    const valor = parseFloat(row.querySelector('.item-valor').value) || 0;
    const total = qtd * valor;
    row.querySelector('.item-total').value = formatCurrency(total);
    recalculateOrderTotal();
}

function recalculateOrderTotal() {
    const totals = document.querySelectorAll('.item-total');
    let sum = 0;
    totals.forEach(input => {
        const value = input.value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        sum += parseFloat(value) || 0;
    });
    const totalInput = document.getElementById('valorTotalOrdem');
    if (totalInput) {
        totalInput.value = formatCurrency(sum);
    }
}

// ============================================
// SUBMIT DO FORMULÁRIO
// ============================================
async function handleSubmit(event) {
    if (event) event.preventDefault();
    
    const items = [];
    const rows = document.querySelectorAll('#itemsBody tr');
    rows.forEach((row, index) => {
        items.push({
            item: index + 1,
            especificacao: row.querySelector('.item-especificacao').value,
            quantidade: parseFloat(row.querySelector('.item-qtd').value) || 0,
            unidade: row.querySelector('.item-unid').value,
            valorUnitario: parseFloat(row.querySelector('.item-valor').value) || 0,
            ipi: row.querySelector('.item-ipi').value || '',
            st: row.querySelector('.item-st').value || '',
            valorTotal: row.querySelector('.item-total').value
        });
    });
    
    const formData = {
        numeroOrdem: document.getElementById('numeroOrdem').value,
        responsavel: document.getElementById('responsavel').value,
        dataOrdem: document.getElementById('dataOrdem').value,
        razaoSocial: document.getElementById('razaoSocial').value,
        nomeFantasia: document.getElementById('nomeFantasia').value,
        cnpj: document.getElementById('cnpj').value,
        enderecoFornecedor: document.getElementById('enderecoFornecedor').value,
        site: document.getElementById('site').value,
        contato: document.getElementById('contato').value,
        telefone: document.getElementById('telefone').value,
        email: document.getElementById('email').value,
        items: items,
        valorTotal: document.getElementById('valorTotalOrdem').value,
        frete: document.getElementById('frete').value,
        localEntrega: document.getElementById('localEntrega').value,
        prazoEntrega: document.getElementById('prazoEntrega').value,
        transporte: document.getElementById('transporte').value,
        formaPagamento: document.getElementById('formaPagamento').value,
        prazoPagamento: document.getElementById('prazoPagamento').value,
        dadosBancarios: document.getElementById('dadosBancarios').value,
        status: 'aberta'
    };
    
    const editId = document.getElementById('editId').value;

    if (!isOnline) {
        showToast('Sistema offline. Dados não foram salvos.', 'error');
        closeFormModal();
        return;
    }

    try {
        const url = editId ? `${API_URL}/ordens/${editId}` : `${API_URL}/ordens`;
        const method = editId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': sessionToken,
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData),
            mode: 'cors'
        });

        if (response.status === 401) {
            sessionStorage.removeItem('ordemCompraSession');
            mostrarTelaAcessoNegado('Sua sessão expirou');
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Erro ao salvar');
        }

        const savedData = await response.json();
        const mappedData = mapearOrdem(savedData);

        if (editId) {
            const index = ordens.findIndex(o => String(o.id) === String(editId));
            if (index !== -1) ordens[index] = mappedData;
            showToast('Ordem atualizada!', 'success');
        } else {
            ordens.push(mappedData);
            showToast('Ordem criada!', 'success');
        }

        lastDataHash = JSON.stringify(ordens.map(o => o.id));
        updateDisplay();
        closeFormModal();

    } catch (error) {
        console.error('Erro:', error);
        showToast(`Erro: ${error.message}`, 'error');
        closeFormModal();
    }
}

// ============================================
// EDIÇÃO
// ============================================
function editOrdem(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) {
        showToast('Ordem não encontrada!', 'error');
        return;
    }
    
    editingId = id;
    currentTab = 0;
    itemCounter = 0;
    
    const modalHTML = `
        <div class="modal-overlay" id="formModal" style="display: flex;">
            <div class="modal-content" style="max-width: 1200px;">
                <div class="modal-header">
                    <h3 class="modal-title">Editar Ordem de Compra</h3>
                </div>
                
                <div class="tabs-container">
                    <div class="tabs-nav">
                        <button class="tab-btn active" onclick="switchTab('tab-geral')">Geral</button>
                        <button class="tab-btn" onclick="switchTab('tab-fornecedor')">Fornecedor</button>
                        <button class="tab-btn" onclick="switchTab('tab-pedido')">Pedido</button>
                        <button class="tab-btn" onclick="switchTab('tab-entrega')">Entrega</button>
                        <button class="tab-btn" onclick="switchTab('tab-pagamento')">Pagamento</button>
                    </div>

                    <form id="ordemForm" onsubmit="handleSubmit(event)">
                        <input type="hidden" id="editId" value="${ordem.id}">
                        
                        <div class="tab-content active" id="tab-geral">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="numeroOrdem">Número da Ordem *</label>
                                    <input type="text" id="numeroOrdem" value="${ordem.numeroOrdem}" required>
                                </div>
                                <div class="form-group">
                                    <label for="responsavel">Responsável *</label>
                                    <input type="text" id="responsavel" value="${ordem.responsavel}" required>
                                </div>
                                <div class="form-group">
                                    <label for="dataOrdem">Data da Ordem *</label>
                                    <input type="date" id="dataOrdem" value="${ordem.dataOrdem}" required>
                                </div>
                            </div>
                        </div>

                        <div class="tab-content" id="tab-fornecedor">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="razaoSocial">Razão Social *</label>
                                    <input type="text" id="razaoSocial" value="${ordem.razaoSocial}" required>
                                </div>
                                <div class="form-group">
                                    <label for="nomeFantasia">Nome Fantasia</label>
                                    <input type="text" id="nomeFantasia" value="${ordem.nomeFantasia || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="cnpj">CNPJ *</label>
                                    <input type="text" id="cnpj" value="${ordem.cnpj}" required>
                                </div>
                                <div class="form-group">
                                    <label for="enderecoFornecedor">Endereço</label>
                                    <input type="text" id="enderecoFornecedor" value="${ordem.enderecoFornecedor || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="site">Site</label>
                                    <input type="text" id="site" value="${ordem.site || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="contato">Contato</label>
                                    <input type="text" id="contato" value="${ordem.contato || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="telefone">Telefone</label>
                                    <input type="text" id="telefone" value="${ordem.telefone || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="email">E-mail</label>
                                    <input type="email" id="email" value="${ordem.email || ''}">
                                </div>
                            </div>
                        </div>

                        <div class="tab-content" id="tab-pedido">
                            <button type="button" onclick="addItem()" class="success small" style="margin-bottom: 1rem;">+ Adicionar Item</button>
                            <div style="overflow-x: auto;">
                                <table class="items-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 40px;">Item</th>
                                            <th style="min-width: 200px;">Especificação</th>
                                            <th style="width: 80px;">QTD</th>
                                            <th style="width: 80px;">Unid</th>
                                            <th style="width: 100px;">Valor UN</th>
                                            <th style="width: 100px;">IPI</th>
                                            <th style="width: 100px;">ST</th>
                                            <th style="width: 120px;">Total</th>
                                            <th style="width: 80px;"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="itemsBody"></tbody>
                                </table>
                            </div>
                            <div class="form-group" style="margin-top: 1rem;">
                                <label for="valorTotalOrdem">Valor Total da Ordem</label>
                                <input type="text" id="valorTotalOrdem" readonly value="${ordem.valorTotal}">
                            </div>
                            <div class="form-group">
                                <label for="frete">Frete</label>
                                <input type="text" id="frete" value="${ordem.frete || ''}" placeholder="Ex: CIF, FOB">
                            </div>
                        </div>

                        <div class="tab-content" id="tab-entrega">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="localEntrega">Local de Entrega</label>
                                    <input type="text" id="localEntrega" value="${ordem.localEntrega || 'Rua Tadorna nº 472, sala 2, Novo Horizonte - Serra/ES  |  CEP: 29.163-318'}">
                                </div>
                                <div class="form-group">
                                    <label for="prazoEntrega">Prazo de Entrega</label>
                                    <input type="text" id="prazoEntrega" value="${ordem.prazoEntrega || ''}" placeholder="Ex: 10 dias úteis">
                                </div>
                                <div class="form-group">
                                    <label for="transporte">Transporte</label>
                                    <input type="text" id="transporte" value="${ordem.transporte || ''}" placeholder="Ex: Por conta do fornecedor">
                                </div>
                            </div>
                        </div>

                        <div class="tab-content" id="tab-pagamento">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="formaPagamento">Forma de Pagamento *</label>
                                    <input type="text" id="formaPagamento" value="${ordem.formaPagamento}" required placeholder="Ex: Boleto, PIX, Cartão">
                                </div>
                                <div class="form-group">
                                    <label for="prazoPagamento">Prazo de Pagamento *</label>
                                    <input type="text" id="prazoPagamento" value="${ordem.prazoPagamento}" required placeholder="Ex: 30 dias">
                                </div>
                                <div class="form-group">
                                    <label for="dadosBancarios">Dados Bancários</label>
                                    <textarea id="dadosBancarios" rows="3">${ordem.dadosBancarios || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="save">Atualizar Ordem</button>
                            <button type="button" onclick="closeFormModal(true)" class="secondary">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    if (ordem.items && ordem.items.length > 0) {
        ordem.items.forEach(item => {
            addItem();
            const row = document.querySelector('#itemsBody tr:last-child');
            if (row) {
                row.querySelector('.item-especificacao').value = item.especificacao || '';
                row.querySelector('.item-qtd').value = item.quantidade || 1;
                row.querySelector('.item-unid').value = item.unidade || 'UN';
                row.querySelector('.item-valor').value = item.valorUnitario || 0;
                row.querySelector('.item-ipi').value = item.ipi || '';
                row.querySelector('.item-st').value = item.st || '';
                row.querySelector('.item-total').value = item.valorTotal || 'R$ 0,00';
            }
        });
    } else {
        addItem();
    }
}

// ============================================
// EXCLUSÃO
// ============================================
async function deleteOrdem(id) {
    const confirmed = await showConfirm(
        'Tem certeza que deseja excluir esta ordem?',
        {
            title: 'Excluir Ordem',
            confirmText: 'Excluir',
            cancelText: 'Cancelar',
            type: 'warning'
        }
    );

    if (!confirmed) return;

    const deletedOrdem = ordens.find(o => o.id === id);
    ordens = ordens.filter(o => o.id !== id);
    updateDisplay();
    showToast('Ordem excluída!', 'success');

    if (isOnline) {
        try {
            const response = await fetch(`${API_URL}/ordens/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-Session-Token': sessionToken,
                    'Accept': 'application/json'
                },
                mode: 'cors'
            });

            if (!response.ok) throw new Error('Erro ao deletar');
        } catch (error) {
            if (deletedOrdem) {
                ordens.push(deletedOrdem);
                updateDisplay();
                showToast('Erro ao excluir', 'error');
            }
        }
    }
}

// ============================================
// TOGGLE STATUS
// ============================================
async function toggleStatus(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) return;
    
    const novoStatus = ordem.status === 'aberta' ? 'fechada' : 'aberta';
    ordem.status = novoStatus;
    updateDisplay();
    showToast(`Ordem marcada como ${novoStatus}!`, 'success');

    if (isOnline) {
        try {
            const response = await fetch(`${API_URL}/ordens/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Token': sessionToken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ status: novoStatus }),
                mode: 'cors'
            });

            if (!response.ok) throw new Error('Erro ao atualizar');

            const savedData = await response.json();
            const index = ordens.findIndex(o => o.id === id);
            if (index !== -1) ordens[index] = mapearOrdem(savedData);
        } catch (error) {
            ordem.status = ordem.status === 'aberta' ? 'fechada' : 'aberta';
            updateDisplay();
            showToast('Erro ao atualizar status', 'error');
        }
    }
}

// ============================================
// VISUALIZAÇÃO
// ============================================
function viewOrdem(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) return;
    
    document.getElementById('modalNumero').textContent = ordem.numeroOrdem;
    
    document.getElementById('info-tab-geral').innerHTML = `
        <div class="info-section">
            <h4>Informações Gerais</h4>
            <p><strong>Responsável:</strong> ${ordem.responsavel}</p>
            <p><strong>Data:</strong> ${formatDate(ordem.dataOrdem)}</p>
            <p><strong>Status:</strong> <span class="badge ${ordem.status}">${ordem.status.toUpperCase()}</span></p>
        </div>
    `;
    
    document.getElementById('info-tab-fornecedor').innerHTML = `
        <div class="info-section">
            <h4>Dados do Fornecedor</h4>
            <p><strong>Razão Social:</strong> ${ordem.razaoSocial}</p>
            ${ordem.nomeFantasia ? `<p><strong>Nome Fantasia:</strong> ${ordem.nomeFantasia}</p>` : ''}
            <p><strong>CNPJ:</strong> ${ordem.cnpj}</p>
            ${ordem.enderecoFornecedor ? `<p><strong>Endereço:</strong> ${ordem.enderecoFornecedor}</p>` : ''}
            ${ordem.site ? `<p><strong>Site:</strong> ${ordem.site}</p>` : ''}
            ${ordem.contato ? `<p><strong>Contato:</strong> ${ordem.contato}</p>` : ''}
            ${ordem.telefone ? `<p><strong>Telefone:</strong> ${ordem.telefone}</p>` : ''}
            ${ordem.email ? `<p><strong>E-mail:</strong> ${ordem.email}</p>` : ''}
        </div>
    `;
    
    document.getElementById('info-tab-pedido').innerHTML = `
        <div class="info-section">
            <h4>Itens do Pedido</h4>
            <div style="overflow-x: auto;">
                <table style="width: 100%; margin-top: 0.5rem;">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Especificação</th>
                            <th>QTD</th>
                            <th>Unid</th>
                            <th>Valor UN</th>
                            <th>IPI</th>
                            <th>ST</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ordem.items.map(item => `
                            <tr>
                                <td>${item.item}</td>
                                <td>${item.especificacao}</td>
                                <td>${item.quantidade}</td>
                                <td>${item.unidade}</td>
                                <td>R$ ${item.valorUnitario.toFixed(2)}</td>
                                <td>${item.ipi || '-'}</td>
                                <td>${item.st || '-'}</td>
                                <td>${item.valorTotal}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <p style="margin-top: 1rem; font-size: 1.1rem;"><strong>Valor Total:</strong> ${ordem.valorTotal}</p>
            ${ordem.frete ? `<p><strong>Frete:</strong> ${ordem.frete}</p>` : ''}
        </div>
    `;
    
    document.getElementById('info-tab-entrega').innerHTML = `
        <div class="info-section">
            <h4>Informações de Entrega</h4>
            ${ordem.localEntrega ? `<p><strong>Local de Entrega:</strong> ${ordem.localEntrega}</p>` : ''}
            ${ordem.prazoEntrega ? `<p><strong>Prazo de Entrega:</strong> ${ordem.prazoEntrega}</p>` : ''}
            ${ordem.transporte ? `<p><strong>Transporte:</strong> ${ordem.transporte}</p>` : ''}
        </div>
    `;
    
    document.getElementById('info-tab-pagamento').innerHTML = `
        <div class="info-section">
            <h4>Dados de Pagamento</h4>
            <p><strong>Forma de Pagamento:</strong> ${ordem.formaPagamento}</p>
            <p><strong>Prazo de Pagamento:</strong> ${ordem.prazoPagamento}</p>
            ${ordem.dadosBancarios ? `<p><strong>Dados Bancários:</strong> ${ordem.dadosBancarios}</p>` : ''}
        </div>
    `;
    
    document.querySelectorAll('#infoModal .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#infoModal .tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('#infoModal .tab-btn')[0].classList.add('active');
    document.getElementById('info-tab-geral').classList.add('active');
    
    document.getElementById('infoModal').classList.add('show');
}

function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ============================================
// FILTROS
// ============================================
function filterOrdens() {
    updateTable();
}

function clearFilters() {
    document.getElementById('search').value = '';
    document.getElementById('filterResponsavel').value = '';
    document.getElementById('filterStatus').value = '';
    updateDisplay();
}

// ============================================
// ATUALIZAÇÃO DA TELA
// ============================================
function updateDisplay() {
    updateMonthDisplay();
    updateDashboard();
    updateTable();
    updateResponsaveisFilter();
}

function updateDashboard() {
    const monthOrdens = getOrdensForCurrentMonth();
    const totalFechadas = monthOrdens.filter(o => o.status === 'fechada').length;
    const totalAbertas = monthOrdens.filter(o => o.status === 'aberta').length;
    
    document.getElementById('totalOrdens').textContent = monthOrdens.length;
    document.getElementById('totalFechadas').textContent = totalFechadas;
    document.getElementById('totalAbertas').textContent = totalAbertas;
    
    const cardAbertas = document.getElementById('cardAbertas');
    if (!cardAbertas) return;
    
    let pulseBadge = cardAbertas.querySelector('.pulse-badge');
    
    if (totalAbertas > 0) {
        cardAbertas.classList.add('has-alert');
        
        if (!pulseBadge) {
            pulseBadge = document.createElement('div');
            pulseBadge.className = 'pulse-badge';
            cardAbertas.appendChild(pulseBadge);
        }
        pulseBadge.textContent = totalAbertas;
        pulseBadge.style.display = 'flex';
    } else {
        cardAbertas.classList.remove('has-alert');
        if (pulseBadge) {
            pulseBadge.style.display = 'none';
        }
    }
}

function updateTable() {
    const container = document.getElementById('ordensContainer');
    let filteredOrdens = getOrdensForCurrentMonth();
    
    const search = document.getElementById('search').value.toLowerCase();
    const filterResp = document.getElementById('filterResponsavel').value;
    const filterStatus = document.getElementById('filterStatus').value;
    
    if (search) {
        filteredOrdens = filteredOrdens.filter(o => 
            o.numeroOrdem.toLowerCase().includes(search) ||
            o.razaoSocial.toLowerCase().includes(search) ||
            o.responsavel.toLowerCase().includes(search)
        );
    }
    
    if (filterResp) {
        filteredOrdens = filteredOrdens.filter(o => o.responsavel === filterResp);
    }
    
    if (filterStatus) {
        filteredOrdens = filteredOrdens.filter(o => o.status === filterStatus);
    }
    
    if (filteredOrdens.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    Nenhuma ordem encontrada
                </td>
            </tr>
        `;
        return;
    }
    
    filteredOrdens.sort((a, b) => {
        const numA = parseInt(a.numeroOrdem);
        const numB = parseInt(b.numeroOrdem);
        return numA - numB;
    });
    
    container.innerHTML = filteredOrdens.map(ordem => `
        <tr class="${ordem.status === 'fechada' ? 'row-fechada' : ''}">
            <td style="text-align: center; padding: 8px;">
                <div class="checkbox-wrapper">
                    <input 
                        type="checkbox" 
                        id="check-${ordem.id}"
                        ${ordem.status === 'fechada' ? 'checked' : ''}
                        onchange="toggleStatus('${ordem.id}')"
                        class="styled-checkbox"
                    >
                    <label for="check-${ordem.id}" class="checkbox-label-styled"></label>
                </div>
            </td>
            <td><strong>${ordem.numeroOrdem}</strong></td>
            <td>${ordem.responsavel}</td>
            <td>${ordem.razaoSocial}</td>
            <td style="white-space: nowrap;">${formatDate(ordem.dataOrdem)}</td>
            <td><strong>${ordem.valorTotal}</strong></td>
            <td>
                <span class="badge ${ordem.status}">${ordem.status.toUpperCase()}</span>
            </td>
            <td class="actions-cell">
                <div class="actions">
                    <button onclick="viewOrdem('${ordem.id}')" class="action-btn view" title="Ver detalhes">Ver</button>
                    <button onclick="editOrdem('${ordem.id}')" class="action-btn edit" title="Editar">Editar</button>
                    <button onclick="generatePDFFromTable('${ordem.id}')" class="action-btn success" title="Gerar PDF">PDF</button>
                    <button onclick="deleteOrdem('${ordem.id}')" class="action-btn delete" title="Excluir">Excluir</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateResponsaveisFilter() {
    const responsaveis = new Set();
    ordens.forEach(o => {
        if (o.responsavel?.trim()) {
            responsaveis.add(o.responsavel.trim());
        }
    });

    const select = document.getElementById('filterResponsavel');
    if (select) {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Todos</option>';
        Array.from(responsaveis).sort().forEach(r => {
            const option = document.createElement('option');
            option.value = r;
            option.textContent = r;
            select.appendChild(option);
        });
        select.value = currentValue;
    }
}

// ============================================
// UTILIDADES
// ============================================
function getOrdensForCurrentMonth() {
    return ordens.filter(ordem => {
        const ordemDate = new Date(ordem.dataOrdem);
        return ordemDate.getMonth() === currentMonth.getMonth() &&
               ordemDate.getFullYear() === currentMonth.getFullYear();
    });
}

function getNextOrderNumber() {
    const existingNumbers = ordens
        .map(o => parseInt(o.numeroOrdem))
        .filter(n => !isNaN(n));
    
    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1250;
    return nextNum.toString();
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
    return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
}

function showToast(message, type = 'success') {
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

// ============================================
// GERAÇÃO DE PDF
// [MANTÉM O CÓDIGO EXISTENTE DE GERAÇÃO DE PDF]
// ============================================
