// ESTADO DA APLICAÇÃO
let ordens = [];
let currentMonth = new Date();
let editingId = null;
let itemCounter = 0;
let currentTab = 0;
let isOnline = false;

const tabs = ['tab-geral', 'tab-fornecedor', 'tab-pedido', 'tab-entrega', 'tab-pagamento'];

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    updateDisplay();
    checkServerStatus();
    startRealtimeSync();
});

// CONEXÃO E STATUS
function startRealtimeSync() {
    setInterval(async () => await checkServerStatus(), 3000);
}

async function checkServerStatus() {
    try {
        const response = await fetch(window.location.origin, { method: 'HEAD', cache: 'no-cache' });
        isOnline = response.ok;
    } catch (error) {
        isOnline = false;
    }
    updateConnectionStatus();
}

function updateConnectionStatus() {
    const statusDiv = document.getElementById('connectionStatus');
    if (!statusDiv) return;
    statusDiv.className = isOnline ? 'connection-status online' : 'connection-status offline';
    statusDiv.querySelector('span:last-child').textContent = isOnline ? 'Online' : 'Offline';
}

// LOCAL STORAGE
function loadFromLocalStorage() {
    const stored = localStorage.getItem('ordens');
    if (stored) ordens = JSON.parse(stored);
}

function saveToLocalStorage() {
    localStorage.setItem('ordens', JSON.stringify(ordens));
}

// NAVEGAÇÃO DE MÊS
function changeMonth(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    updateDisplay();
}

function updateMonthDisplay() {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    document.getElementById('currentMonth').textContent = `${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
}

// SISTEMA DE ABAS
function switchTab(tabId) {
    const tabIndex = tabs.indexOf(tabId);
    if (tabIndex !== -1) {
        currentTab = tabIndex;
        showTab(currentTab);
    }
    event.preventDefault();
}

function showTab(index) {
    document.querySelectorAll('#formModal .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#formModal .tab-content').forEach(content => content.classList.remove('active'));
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
    
    btnVoltar.style.display = currentTab === 0 ? 'none' : 'inline-flex';
    
    if (currentTab === tabs.length - 1) {
        btnProximo.textContent = editingId ? 'Atualizar Ordem' : 'Registrar Ordem';
        btnProximo.classList.remove('secondary');
        btnProximo.classList.add('primary');
    } else {
        btnProximo.textContent = 'Próximo';
        btnProximo.classList.add('secondary');
        btnProximo.classList.remove('primary');
    }
}

function switchInfoTab(tabId) {
    document.querySelectorAll('#infoModal .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#infoModal .tab-content').forEach(content => content.classList.remove('active'));
    const clickedBtn = event.target.closest('.tab-btn');
    if (clickedBtn) clickedBtn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// MODAL DE FORMULÁRIO
function openFormModal() {
    editingId = null;
    currentTab = 0;
    document.getElementById('formTitle').textContent = 'Nova Ordem de Compra';
    document.getElementById('ordemForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('itemsBody').innerHTML = '';
    itemCounter = 0;
    addItem();
    document.getElementById('numeroOrdem').value = getNextOrderNumber();
    setTodayDate();
    showTab(0);
    document.getElementById('formModal').classList.add('show');
}

function closeFormModal() {
    document.getElementById('formModal').classList.remove('show');
}

function setTodayDate() {
    document.getElementById('dataOrdem').value = new Date().toISOString().split('T')[0];
}

// GESTÃO DE ITENS
function addItem() {
    itemCounter++;
    const tbody = document.getElementById('itemsBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td style="text-align: center;">${itemCounter}</td>
        <td><textarea class="item-especificacao" placeholder="Descrição do item..." rows="2"></textarea></td>
        <td><input type="number" class="item-qtd" min="0" step="0.01" value="1" onchange="calculateItemTotal(this)"></td>
        <td><input type="text" class="item-unid" value="UN" placeholder="UN"></td>
        <td><input type="number" class="item-valor" min="0" step="0.01" value="0" onchange="calculateItemTotal(this)"></td>
        <td><input type="text" class="item-ipi" placeholder="Isento" value="Isento"></td>
        <td><input type="text" class="item-st" placeholder="Não incluído" value="Não incluído"></td>
        <td><input type="text" class="item-total" readonly value="R$ 0,00"></td>
        <td class="item-actions"><button type="button" class="danger small" onclick="removeItem(this)">Excluir</button></td>
    `;
    tbody.appendChild(row);
}

function removeItem(btn) {
    btn.closest('tr').remove();
    recalculateOrderTotal();
    renumberItems();
}

function renumberItems() {
    const rows = document.querySelectorAll('#itemsBody tr');
    rows.forEach((row, index) => row.cells[0].textContent = index + 1);
    itemCounter = rows.length;
}

function calculateItemTotal(input) {
    const row = input.closest('tr');
    const qtd = parseFloat(row.querySelector('.item-qtd').value) || 0;
    const valor = parseFloat(row.querySelector('.item-valor').value) || 0;
    row.querySelector('.item-total').value = formatCurrency(qtd * valor);
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

// SUBMIT DO FORMULÁRIO
function handleSubmit(event) {
    event.preventDefault();
    
    const items = [];
    document.querySelectorAll('#itemsBody tr').forEach((row, index) => {
        items.push({
            item: index + 1,
            especificacao: row.querySelector('.item-especificacao').value,
            quantidade: parseFloat(row.querySelector('.item-qtd').value) || 0,
            unidade: row.querySelector('.item-unid').value,
            valorUnitario: parseFloat(row.querySelector('.item-valor').value) || 0,
            ipi: row.querySelector('.item-ipi').value,
            st: row.querySelector('.item-st').value,
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

// EDIÇÃO
function editOrdem(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) return;
    
    editingId = id;
    currentTab = 0;
    document.getElementById('formTitle').textContent = 'Editar Ordem de Compra';
    document.getElementById('editId').value = ordem.id;
    document.getElementById('numeroOrdem').value = ordem.numeroOrdem;
    document.getElementById('responsavel').value = ordem.responsavel;
    document.getElementById('dataOrdem').value = ordem.dataOrdem;
    document.getElementById('razaoSocial').value = ordem.razaoSocial;
    document.getElementById('nomeFantasia').value = ordem.nomeFantasia || '';
    document.getElementById('cnpj').value = ordem.cnpj;
    document.getElementById('enderecoFornecedor').value = ordem.enderecoFornecedor || '';
    document.getElementById('site').value = ordem.site || '';
    document.getElementById('contato').value = ordem.contato || '';
    document.getElementById('telefone').value = ordem.telefone || '';
    document.getElementById('email').value = ordem.email || '';
    document.getElementById('frete').value = ordem.frete || '';
    document.getElementById('localEntrega').value = ordem.localEntrega || '';
    document.getElementById('prazoEntrega').value = ordem.prazoEntrega || '';
    document.getElementById('formaPagamento').value = ordem.formaPagamento;
    document.getElementById('prazoPagamento').value = ordem.prazoPagamento;
    document.getElementById('dadosBancarios').value = ordem.dadosBancarios || '';
    
    document.getElementById('itemsBody').innerHTML = '';
    itemCounter = 0;
    ordem.items.forEach(item => {
        addItem();
        const row = document.querySelector('#itemsBody tr:last-child');
        row.querySelector('.item-especificacao').value = item.especificacao;
        row.querySelector('.item-qtd').value = item.quantidade;
        row.querySelector('.item-unid').value = item.unidade;
        row.querySelector('.item-valor').value = item.valorUnitario;
        row.querySelector('.item-ipi').value = item.ipi || 'Isento';
        row.querySelector('.item-st').value = item.st || 'Não incluído';
        row.querySelector('.item-total').value = item.valorTotal;
    });
    
    recalculateOrderTotal();
    showTab(0);
    document.getElementById('formModal').classList.add('show');
}

// EXCLUSÃO
function deleteOrdem(id) {
    if (confirm('Tem certeza que deseja excluir esta ordem?')) {
        ordens = ordens.filter(o => o.id !== id);
        saveToLocalStorage();
        updateDisplay();
        showToast('Ordem excluída com sucesso!', 'success');
    }
}

// TOGGLE STATUS
function toggleStatus(id) {
    const ordem = ordens.find(o => o.id === id);
    if (ordem) {
        ordem.status = ordem.status === 'aberta' ? 'fechada' : 'aberta';
        saveToLocalStorage();
        updateDisplay();
        showToast(`Ordem marcada como ${ordem.status}!`, 'success');
    }
}

// VISUALIZAÇÃO
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
                                <td>${item.ipi || 'Isento'}</td>
                                <td>${item.st || 'Não incluído'}</td>
                                <td>${item.valorTotal}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <p style="margin-top: 1rem; font-size: 1.1rem;"><strong>Valor Total:</strong> ${ordem.valorTotal}</p>
        </div>
    `;
    
    document.getElementById('info-tab-entrega').innerHTML = `
        <div class="info-section">
            <h4>Informações de Entrega</h4>
            ${ordem.localEntrega ? `<p><strong>Local de Entrega:</strong> ${ordem.localEntrega}</p>` : ''}
            ${ordem.prazoEntrega ? `<p><strong>Prazo de Entrega:</strong> ${ordem.prazoEntrega}</p>` : ''}
            ${ordem.frete ? `<p><strong>Frete:</strong> ${ordem.frete}</p>` : ''}
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
    document.getElementById('infoModal').classList.remove('show');
}

// FILTROS
function filterOrdens() {
    updateDisplay();
}

function clearFilters() {
    document.getElementById('search').value = '';
    document.getElementById('filterResponsavel').value = '';
    document.getElementById('filterStatus').value = '';
    updateDisplay();
}

// ATUALIZAÇÃO DA TELA
function updateDisplay() {
    updateMonthDisplay();
    updateDashboard();
    updateTable();
}

function updateDashboard() {
    const monthOrdens = getOrdensForCurrentMonth();
    document.getElementById('totalOrdens').textContent = 1249 + ordens.length;
    document.getElementById('totalFechadas').textContent = monthOrdens.filter(o => o.status === 'fechada').length;
    document.getElementById('totalAbertas').textContent = monthOrdens.filter(o => o.status === 'aberta').length;
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
    
    if (filterResp) filteredOrdens = filteredOrdens.filter(o => o.responsavel === filterResp);
    if (filterStatus) filteredOrdens = filteredOrdens.filter(o => o.status === filterStatus);
    
    if (filteredOrdens.length === 0) {
        container.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;">Nenhuma ordem encontrada</td></tr>`;
        return;
    }
    
    filteredOrdens.sort((a, b) => parseInt(a.numeroOrdem.split('-')[1]) - parseInt(b.numeroOrdem.split('-')[1]));
    
    container.innerHTML = filteredOrdens.map(ordem => `
        <tr class="${ordem.status}">
            <td style="text-align: center;">
                <button class="check-btn ${ordem.status === 'fechada' ? 'checked' : ''}" 
                        onclick="toggleStatus('${ordem.id}')" 
                        title="${ordem.status === 'fechada' ? 'Marcar como aberta' : 'Marcar como fechada'}">✓</button>
            </td>
            <td><strong>${ordem.numeroOrdem}</strong></td>
            <td>${ordem.responsavel}</td>
            <td>${ordem.razaoSocial}</td>
            <td>${formatDate(ordem.dataOrdem)}</td>
            <td><strong>${ordem.valorTotal}</strong></td>
            <td><span class="badge ${ordem.status}">${ordem.status.toUpperCase()}</span></td>
            <td>
                <div class="actions">
                    <button class="small" onclick="viewOrdem('${ordem.id}')">Ver</button>
                    <button class="small secondary" onclick="editOrdem('${ordem.id}')">Editar</button>
                    <button class="small danger" onclick="deleteOrdem('${ordem.id}')">Excluir</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// UTILIDADES
function getOrdensForCurrentMonth() {
    return ordens.filter(ordem => {
        const ordemDate = new Date(ordem.dataOrdem);
        return ordemDate.getMonth() === currentMonth.getMonth() && ordemDate.getFullYear() === currentMonth.getFullYear();
    });
}

function getNextOrderNumber() {
    const year = new Date().getFullYear();
    const existingNumbers = ordens
        .map(o => o.numeroOrdem)
        .filter(n => n.startsWith(year.toString()))
        .map(n => parseInt(n.split('-')[1]))
        .filter(n => !isNaN(n));
    
    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1250;
    return `${year}-${String(nextNum).padStart(4, '0')}`;
}

function formatDate(dateString) {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
    return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// GERAÇÃO DE PDF
function generatePDF() {
    const modalNumero = document.getElementById('modalNumero').textContent;
    const ordem = ordens.find(o => o.numeroOrdem === modalNumero);
    
    if (!ordem) {
        showToast('Ordem não encontrada!', 'error');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let y = 20;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;
    const lineHeight = 5;
    
    // CABEÇALHO
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(204, 112, 0);
    doc.text('ORDEM DE COMPRA', pageWidth / 2, y, { align: 'center' });
    
    y += 8;
    doc.setFontSize(14);
    doc.text(`Nº ${ordem.numeroOrdem}`, pageWidth / 2, y, { align: 'center' });
    y += 12;
    
    // DADOS PARA FATURAMENTO
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('DADOS PARA FATURAMENTO (Informações fixas)', margin, y);
    y += 6;
    
    doc.setFontSize(10);
    doc.text('I.R. COMERCIO E MATERIAIS ELÉTRICOS LTDA', margin, y);
    y += 5;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text('CNPJ: 33.149.502/0001-38  |  IE: 083.780.74-2', margin, y);
    y += 5;
    doc.text('Rua Tadorna nº 472, sala 2', margin, y);
    y += 5;
    doc.text('Novo Horizonte - Serra/ES  |  CEP: 29.163-318', margin, y);
    y += 5;
    doc.text('Telefax: (27) 3209-4291  |  E-mail: comercial.ircomercio@gmail.com', margin, y);
    y += 10;
    
    // DADOS DO FORNECEDOR - TABELA
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('DADOS DO FORNECEDOR', margin, y);
    y += 6;
    
    const tableStartY = y;
    const colWidth = (pageWidth - 2 * margin) / 2;
    const rowHeight = 7;
    
    const fornecedorFields = [
        ['Razão Social', ordem.razaoSocial],
        ['Nome Fantasia', ordem.nomeFantasia || '-'],
        ['CNPJ', ordem.cnpj],
        ['Endereço', ordem.enderecoFornecedor || '-'],
        ['Site', ordem.site || '-'],
        ['Contato', ordem.contato || '-'],
        ['Telefone', ordem.telefone || '-'],
        ['E-mail', ordem.email || '-']
    ];
    
    doc.setFontSize(8);
    fornecedorFields.forEach((field, index) => {
        const currentY = tableStartY + (index * rowHeight);
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, currentY, colWidth, rowHeight);
        doc.rect(margin + colWidth, currentY, colWidth, rowHeight);
        doc.setFont(undefined, 'bold');
        doc.text(field[0] + ':', margin + 2, currentY + 4.5);
        doc.setFont(undefined, 'normal');
        const textValue = field[1].length > 45 ? field[1].substring(0, 42) + '...' : field[1];
        doc.text(textValue, margin + colWidth + 2, currentY + 4.5);
    });
    
    y = tableStartY + (fornecedorFields.length * rowHeight) + 8;
    
    // TABELA DE ITENS
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('ITENS DO PEDIDO', margin, y);
    y += 6;
    
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
    
    // Cabeçalho da tabela
    doc.setFillColor(108, 117, 125);
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, y, tableWidth, itemRowHeight, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    
    let xPos = margin;
    const headers = ['ITEM', 'ESPECIFICAÇÃO', 'QTD', 'UNID', 'VALOR UN', 'IPI', 'ST', 'TOTAL'];
    const widths = [colWidths.item, colWidths.especificacao, colWidths.qtd, colWidths.unid, colWidths.valorUn, colWidths.ipi, colWidths.st, colWidths.total];
    
    headers.forEach((header, i) => {
        doc.line(xPos, y, xPos, y + itemRowHeight);
        doc.text(header, xPos + (widths[i] / 2), y + 6.5, { align: 'center' });
        xPos += widths[i];
    });
    doc.line(xPos, y, xPos, y + itemRowHeight);
    y += itemRowHeight;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    // Linhas dos itens
    ordem.items.forEach((item, index) => {
        if (y > 245) {
            doc.addPage();
            y = 20;
            // Redesenha cabeçalho
            doc.setFillColor(108, 117, 125);
            doc.rect(margin, y, tableWidth, itemRowHeight, 'FD');
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            xPos = margin;
