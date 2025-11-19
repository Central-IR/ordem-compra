// ============================================
// CONFIGURAÇÃO
// ============================================
let ordens = [];
let currentMonth = new Date();
let editingId = null;
let itemCounter = 0;
let currentTab = 0;
let isOnline = false;

const tabs = ['tab-geral', 'tab-fornecedor', 'tab-pedido', 'tab-entrega', 'tab-pagamento'];

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    updateDisplay();
    checkServerStatus();
    startRealtimeSync();
});

// ============================================
// CONEXÃO E STATUS
// ============================================
function startRealtimeSync() {
    setInterval(async () => {
        await checkServerStatus();
    }, 3000);
}

async function checkServerStatus() {
    try {
        const response = await fetch(window.location.origin, { 
            method: 'HEAD',
            cache: 'no-cache'
        });
        isOnline = response.ok;
    } catch (error) {
        isOnline = false;
    }
    updateConnectionStatus();
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.className = isOnline ? 'connection-status online' : 'connection-status offline';
    }
}

// ============================================
// LOCAL STORAGE
// ============================================
function loadFromLocalStorage() {
    const stored = localStorage.getItem('ordens');
    if (stored) {
        ordens = JSON.parse(stored);
    }
}

function saveToLocalStorage() {
    localStorage.setItem('ordens', JSON.stringify(ordens));
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
    document.querySelectorAll('#formModal .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('#formModal .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelectorAll('#formModal .tab-btn')[index].classList.add('active');
    document.getElementById(tabs[index]).classList.add('active');
    
    updateNavigationButtons();
}

function nextTab() {
    if (currentTab < tabs.length - 1) {
        currentTab++;
        showTab(currentTab);
    } else {
        document.getElementById('ordemForm').dispatchEvent(new Event('submit'));
    }
}

function previousTab() {
    if (currentTab > 0) {
        currentTab--;
        showTab(currentTab);
    }
}

function updateNavigationButtons() {
    const btnVoltar = document.getElementById('btnVoltar');
    const btnProximo = document.getElementById('btnProximo');
    
    if (currentTab === 0) {
        btnVoltar.style.display = 'none';
    } else {
        btnVoltar.style.display = 'inline-flex';
    }
    
    if (currentTab === tabs.length - 1) {
        btnProximo.textContent = editingId ? 'Atualizar Ordem' : 'Registrar Ordem';
        btnProximo.classList.remove('secondary');
        btnProximo.classList.add('save');
    } else {
        btnProximo.textContent = 'Próximo';
        btnProximo.classList.add('secondary');
        btnProximo.classList.remove('save');
    }
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
// MODAL DE FORMULÁRIO
// ============================================
function openFormModal() {
    editingId = null;
    currentTab = 0;
    
    const nextNumber = getNextOrderNumber();
    const today = new Date().toISOString().split('T')[0];
    
    const modalHTML = `
        <div class="modal-overlay" id="formModal">
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
                        
                        <!-- ABA GERAL -->
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

                        <!-- ABA FORNECEDOR -->
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

                        <!-- ABA PEDIDO -->
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
                                            <th style="width: 80px;">Ações</th>
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

                        <!-- ABA ENTREGA -->
                        <div class="tab-content" id="tab-entrega">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="localEntrega">Local de Entrega</label>
                                    <input type="text" id="localEntrega">
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

                        <!-- ABA PAGAMENTO -->
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
                            <button type="button" id="btnVoltar" onclick="previousTab()" class="secondary" style="display: none;">Voltar</button>
                            <button type="button" id="btnProximo" onclick="nextTab()" class="secondary">Próximo</button>
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
        <td class="item-actions">
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
    document.getElementById('valorTotalOrdem').value = formatCurrency(sum);
}

// ============================================
// SUBMIT DO FORMULÁRIO
// ============================================
function handleSubmit(event) {
    event.preventDefault();
    
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
    
    const timestamp = Date.now();
    
    const formData = {
        id: editingId || timestamp.toString(),
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
        status: 'aberta',
        timestamp: timestamp
    };
    
    if (editingId) {
        const index = ordens.findIndex(o => o.id === editingId);
        formData.timestamp = ordens[index].timestamp;
        ordens[index] = formData;
        showToast('Ordem atualizada com sucesso!', 'success');
    } else {
        ordens.push(formData);
        showToast('Ordem criada com sucesso!', 'success');
    }
    
    saveToLocalStorage();
    updateDisplay();
    closeFormModal();
}

// ============================================
// EDIÇÃO
// ============================================
function editOrdem(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) return;
    
    editingId = id;
    currentTab = 0;
    
    const modalHTML = `
        <div class="modal-overlay" id="formModal">
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
                        
                        <!-- ABA GERAL -->
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

                        <!-- ABA FORNECEDOR -->
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

                        <!-- ABA PEDIDO -->
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
                                            <th style="width: 80px;">Ações</th>
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

                        <!-- ABA ENTREGA -->
                        <div class="tab-content" id="tab-entrega">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="localEntrega">Local de Entrega</label>
                                    <input type="text" id="localEntrega" value="${ordem.localEntrega || ''}">
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

                        <!-- ABA PAGAMENTO -->
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
                            <button type="button" id="btnVoltar" onclick="previousTab()" class="secondary" style="display: none;">Voltar</button>
                            <button type="button" id="btnProximo" onclick="nextTab()" class="secondary">Próximo</button>
                            <button type="button" onclick="closeFormModal(true)" class="secondary">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    itemCounter = 0;
    ordem.items.forEach(item => {
        addItem();
        const row = document.querySelector('#itemsBody tr:last-child');
        row.querySelector('.item-especificacao').value = item.especificacao;
        row.querySelector('.item-qtd').value = item.quantidade;
        row.querySelector('.item-unid').value = item.unidade;
        row.querySelector('.item-valor').value = item.valorUnitario;
        row.querySelector('.item-ipi').value = item.ipi || '';
        row.querySelector('.item-st').value = item.st || '';
        row.querySelector('.item-total').value = item.valorTotal;
    });
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

    ordens = ordens.filter(o => o.id !== id);
    saveToLocalStorage();
    updateDisplay();
    showToast('Ordem excluída com sucesso!', 'success');
}

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
    });
}

// ============================================
// TOGGLE STATUS
// ============================================
function toggleStatus(id) {
    const ordem = ordens.find(o => o.id === id);
    if (ordem) {
        ordem.status = ordem.status === 'aberta' ? 'fechada' : 'aberta';
        saveToLocalStorage();
        updateDisplay();
        showToast(`Ordem marcada como ${ordem.status}!`, 'success');
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
            <td class="actions-cell" style="text-align: center; white-space: nowrap;">
                <button onclick="viewOrdem('${ordem.id}')" class="action-btn view" title="Ver detalhes">Ver</button>
                <button onclick="editOrdem('${ordem.id}')" class="action-btn edit" title="Editar">Editar</button>
                <button onclick="generatePDFFromTable('${ordem.id}')" class="action-btn success" title="Gerar PDF">PDF</button>
                <button onclick="deleteOrdem('${ordem.id}')" class="action-btn delete" title="Excluir">Excluir</button>
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
// ============================================
function generatePDFFromTable(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) {
        showToast('Ordem não encontrada!', 'error');
        return;
    }
    generatePDFForOrdem(ordem);
}

function generatePDF() {
    const modalNumero = document.getElementById('modalNumero').textContent;
    const ordem = ordens.find(o => o.numeroOrdem === modalNumero);
    
    if (!ordem) {
        showToast('Ordem não encontrada!', 'error');
        return;
    }
    generatePDFForOrdem(ordem);
}

function generatePDFForOrdem(ordem) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let y = 20;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;
    const lineHeight = 5;
    
    // LOGO NO CANTO SUPERIOR ESQUERDO
    try {
        const logo = new Image();
        logo.src = 'I.R.-COMERCIO-E-MATERIAIS-ELETRICOS-LTDA.png';
        doc.addImage(logo, 'PNG', margin, y, 40, 15);
        y += 18;
    } catch (error) {
        console.log('Logo não encontrada');
    }
    
    // CABEÇALHO
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('ORDEM DE COMPRA', pageWidth / 2, y, { align: 'center' });
    
    y += 8;
    doc.setFontSize(14);
    doc.text(`Nº ${ordem.numeroOrdem}`, pageWidth / 2, y, { align: 'center' });
    
    y += 12;
    
    // DADOS PARA FATURAMENTO (FIXO)
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('DADOS PARA FATURAMENTO', margin, y);
    
    y += lineHeight + 1;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('I.R. COMÉRCIO E MATERIAIS ELÉTRICOS LTDA', margin, y);
    
    y += lineHeight + 1;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('CNPJ: 33.149.502/0001-38  |  IE: 083.780.74-2', margin, y);
    
    y += lineHeight + 1;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('RUA TADORNA Nº 472, SALA 2', margin, y);
    
    y += lineHeight + 1;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('NOVO HORIZONTE - SERRA/ES  |  CEP: 29.163-318', margin, y);
    
    y += lineHeight + 1;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('TELEFAX: (27) 3209-4291  |  E-MAIL: COMERCIAL.IRCOMERCIO@GMAIL.COM', margin, y);
    
    y += 10;
    
    // DADOS DO FORNECEDOR
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('DADOS DO FORNECEDOR', margin, y);
    
    y += lineHeight + 1;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`${ordem.razaoSocial}`, margin, y);

    if (ordem.nomeFantasia) {
        y += lineHeight + 1;
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`${ordem.nomeFantasia}`, margin, y);
    }

    y += lineHeight + 1;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`${ordem.cnpj}`, margin, y);

    if (ordem.enderecoFornecedor) {
        y += lineHeight + 1;
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`${ordem.enderecoFornecedor}`, margin, y);
    }

    if (ordem.contato) {
        y += lineHeight + 1;
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`${ordem.contato}`, margin, y);
    }

    if (ordem.telefone) {
        y += lineHeight;
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`${ordem.telefone}`, margin, y);
    }

    if (ordem.email) {
        y += lineHeight + 1;
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`${ordem.email}`, margin, y);
    }
    
    y += 10;
    
    // ITENS DO PEDIDO
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('ITENS DO PEDIDO', margin, y);
    
    y += 6;
    
    // Configuração da tabela de itens
    const tableWidth = pageWidth - (2 * margin);
    const colWidths = {
        item: tableWidth * 0.05,
        especificacao: tableWidth * 0.35,
        qtd: tableWidth * 0.08,
        unid: tableWidth * 0.08,
        valorUn: tableWidth * 0.12,
        ipi: tableWidth * 0.10,
        st: tableWidth * 0.10,
        total: tableWidth * 0.12
    };
    
    const itemRowHeight = 10;
    
    // Cabeçalho da tabela com fundo cinza escuro
    doc.setFillColor(108, 117, 125);
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, y, tableWidth, itemRowHeight, 'FD');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    
    let xPos = margin;
    
    // Desenha bordas verticais do cabeçalho
    doc.line(xPos, y, xPos, y + itemRowHeight);
    
    // ITEM
    doc.text('ITEM', xPos + (colWidths.item / 2), y + 6.5, { align: 'center' });
    xPos += colWidths.item;
    doc.line(xPos, y, xPos, y + itemRowHeight);
    
    // ESPECIFICAÇÃO
    doc.text('ESPECIFICAÇÃO', xPos + (colWidths.especificacao / 2), y + 6.5, { align: 'center' });
    xPos += colWidths.especificacao;
    doc.line(xPos, y, xPos, y + itemRowHeight);
    
    // QTD
    doc.text('QTD', xPos + (colWidths.qtd / 2), y + 6.5, { align: 'center' });
    xPos += colWidths.qtd;
    doc.line(xPos, y, xPos, y + itemRowHeight);
    
    // UNID
    doc.text('UNID', xPos + (colWidths.unid / 2), y + 6.5, { align: 'center' });
    xPos += colWidths.unid;
    doc.line(xPos, y, xPos, y + itemRowHeight);
    
    // VALOR UN
    doc.text('VALOR UN', xPos + (colWidths.valorUn / 2), y + 6.5, { align: 'center' });
    xPos += colWidths.valorUn;
    doc.line(xPos, y, xPos, y + itemRowHeight);
    
    // IPI
    doc.text('IPI', xPos + (colWidths.ipi / 2), y + 6.5, { align: 'center' });
    xPos += colWidths.ipi;
    doc.line(xPos, y, xPos, y + itemRowHeight);
    
    // ST
    doc.text('ST', xPos + (colWidths.st / 2), y + 6.5, { align: 'center' });
    xPos += colWidths.st;
    doc.line(xPos, y, xPos, y + itemRowHeight);
    
    // TOTAL
    doc.text('TOTAL', xPos + (colWidths.total / 2), y + 6.5, { align: 'center' });
    xPos += colWidths.total;
    doc.line(xPos, y, xPos, y + itemRowHeight);
    
    y += itemRowHeight;
    doc.setTextColor(0, 0, 0);
    
    // Linhas dos itens
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    
    ordem.items.forEach((item, index) => {
        const maxWidth = colWidths.especificacao - 6;
        const especLines = doc.splitTextToSize(item.especificacao, maxWidth);
        const lineCount = especLines.length;
        const necessaryHeight = Math.max(itemRowHeight, lineCount * 4 + 4);
        
        if (y + necessaryHeight > doc.internal.pageSize.height - 40) {
            doc.addPage();
            y = 20;
            
            // Redesenha cabeçalho na nova página
            doc.setFillColor(108, 117, 125);
            doc.rect(margin, y, tableWidth, itemRowHeight, 'FD');
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            
            xPos = margin;
            doc.line(xPos, y, xPos, y + itemRowHeight);
            doc.text('ITEM', xPos + (colWidths.item / 2), y + 6.5, { align: 'center' });
            xPos += colWidths.item;
            doc.line(xPos, y, xPos, y + itemRowHeight);
            doc.text('ESPECIFICAÇÃO', xPos + (colWidths.especificacao / 2), y + 6.5, { align: 'center' });
            xPos += colWidths.especificacao;
            doc.line(xPos, y, xPos, y + itemRowHeight);
            doc.text('QTD', xPos + (colWidths.qtd / 2), y + 6.5, { align: 'center' });
            xPos += colWidths.qtd;
            doc.line(xPos, y, xPos, y + itemRowHeight);
            doc.text('UNID', xPos + (colWidths.unid / 2), y + 6.5, { align: 'center' });
            xPos += colWidths.unid;
            doc.line(xPos, y, xPos, y + itemRowHeight);
            doc.text('VALOR UN', xPos + (colWidths.valorUn / 2), y + 6.5, { align: 'center' });
            xPos += colWidths.valorUn;
            doc.line(xPos, y, xPos, y + itemRowHeight);
            doc.text('IPI', xPos + (colWidths.ipi / 2), y + 6.5, { align: 'center' });
            xPos += colWidths.ipi;
            doc.line(xPos, y, xPos, y + itemRowHeight);
            doc.text('ST', xPos + (colWidths.st / 2), y + 6.5, { align: 'center' });
            xPos += colWidths.st;
            doc.line(xPos, y, xPos, y + itemRowHeight);
            doc.text('TOTAL', xPos + (colWidths.total / 2), y + 6.5, { align: 'center' });
            xPos += colWidths.total;
            doc.line(xPos, y, xPos, y + itemRowHeight);
            
            y += itemRowHeight;
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
        }
        
        if (index % 2 !== 0) {
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y, tableWidth, necessaryHeight, 'F');
        }
        
        xPos = margin;
        
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(xPos, y, xPos, y + necessaryHeight);
        
        doc.text(item.item.toString(), xPos + (colWidths.item / 2), y + (necessaryHeight / 2) + 1.5, { align: 'center' });
        xPos += colWidths.item;
        doc.line(xPos, y, xPos, y + necessaryHeight);
        
        doc.text(especLines, xPos + 3, y + 4);
        xPos += colWidths.especificacao;
        doc.line(xPos, y, xPos, y + necessaryHeight);
        
        doc.text(item.quantidade.toString(), xPos + (colWidths.qtd / 2), y + (necessaryHeight / 2) + 1.5, { align: 'center' });
        xPos += colWidths.qtd;
        doc.line(xPos, y, xPos, y + necessaryHeight);
        
        doc.text(item.unidade, xPos + (colWidths.unid / 2), y + (necessaryHeight / 2) + 1.5, { align: 'center' });
        xPos += colWidths.unid;
        doc.line(xPos, y, xPos, y + necessaryHeight);
        
        const valorUnFormatted = 'R$ ' + item.valorUnitario.toFixed(2).replace('.', ',');
        doc.text(valorUnFormatted, xPos + (colWidths.valorUn / 2), y + (necessaryHeight / 2) + 1.5, { align: 'center' });
        xPos += colWidths.valorUn;
        doc.line(xPos, y, xPos, y + necessaryHeight);
        
        doc.text(item.ipi || '-', xPos + (colWidths.ipi / 2), y + (necessaryHeight / 2) + 1.5, { align: 'center' });
        xPos += colWidths.ipi;
        doc.line(xPos, y, xPos, y + necessaryHeight);
        
        doc.text(item.st || '-', xPos + (colWidths.st / 2), y + (necessaryHeight / 2) + 1.5, { align: 'center' });
        xPos += colWidths.st;
        doc.line(xPos, y, xPos, y + necessaryHeight);
        
        doc.text(item.valorTotal, xPos + (colWidths.total / 2), y + (necessaryHeight / 2) + 1.5, { align: 'center' });
        xPos += colWidths.total;
        doc.line(xPos, y, xPos, y + necessaryHeight);
        
        doc.line(margin, y + necessaryHeight, margin + tableWidth, y + necessaryHeight);
        
        y += necessaryHeight;
    });
    
    y += 8;
    
    // VALOR TOTAL E FRETE
    if (y > doc.internal.pageSize.height - 80) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`VALOR TOTAL: ${ordem.valorTotal}`, margin, y);
    
    y += 10;
    
    // LOCAL DE ENTREGA
    if (y > doc.internal.pageSize.height - 70) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('LOCAL DE ENTREGA:', margin, y);
    y += 5;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(ordem.localEntrega || 'Rua Tadorna nº 472, sala 2, Novo Horizonte - Serra/ES  |  CEP: 29.163-318', margin, y);
    
    y += 10;
    
    // PRAZO E FRETE
    if (y > doc.internal.pageSize.height - 60) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('PRAZO DE ENTREGA:', margin, y);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    doc.text(ordem.prazoEntrega || '-', margin + 42, y);
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('FRETE:', pageWidth - margin - 35, y);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    doc.text(ordem.frete || '-', pageWidth - margin - 20, y);
    
    y += 10;

    // CONTINUAÇÃO DO SCRIPT - GERAÇÃO DE PDF

    // CONDIÇÕES DE PAGAMENTO E ENTREGA
    if (y > doc.internal.pageSize.height - 50) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('CONDIÇÕES DE PAGAMENTO:', margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    doc.text(`Forma: ${ordem.formaPagamento}`, margin, y);
    y += 5;
    doc.text(`Prazo: ${ordem.prazoPagamento}`, margin, y);
    
    if (ordem.dadosBancarios) {
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text('Dados Bancários:', margin, y);
        y += 5;
        doc.setFont(undefined, 'normal');
        const bancarioLines = doc.splitTextToSize(ordem.dadosBancarios, pageWidth - (2 * margin));
        doc.text(bancarioLines, margin, y);
        y += (bancarioLines.length * 5);
    }
    
    y += 10;
    
    // ASSINATURAS
    if (y > doc.internal.pageSize.height - 40) {
        doc.addPage();
        y = 20;
    }
    
    const assinaturaY = doc.internal.pageSize.height - 40;
    const col1X = margin;
    const col2X = pageWidth / 2 + 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // Linha de assinatura 1
    doc.line(col1X, assinaturaY, col1X + 80, assinaturaY);
    doc.text('Comprador', col1X + 20, assinaturaY + 6);
    
    // Linha de assinatura 2
    doc.line(col2X, assinaturaY, col2X + 80, assinaturaY);
    doc.text('Fornecedor', col2X + 20, assinaturaY + 6);
    
    // Salvar PDF
    doc.save(`Ordem_Compra_${ordem.numeroOrdem}.pdf`);
    showToast('PDF gerado com sucesso!', 'success');
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
