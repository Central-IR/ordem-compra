const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Supabase Client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Session Token Middleware
const SESSION_TOKEN = process.env.SESSION_TOKEN;

function verifySession(req, res, next) {
    const token = req.headers['x-session-token'];
    
    if (!token || token !== SESSION_TOKEN) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    
    next();
}

// ============================================
// ROTAS DA API
// ============================================

// GET - Buscar todas as ordens
app.get('/api/ordens', verifySession, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ordens_compra')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Erro ao buscar ordens:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar ordens',
            details: error.message 
        });
    }
});

// GET - Buscar ordem por ID
app.get('/api/ordens/:id', verifySession, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('ordens_compra')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Ordem não encontrada' });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar ordem:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar ordem',
            details: error.message 
        });
    }
});

// POST - Criar nova ordem
app.post('/api/ordens', verifySession, async (req, res) => {
    try {
        const ordemData = {
            numero_ordem: req.body.numeroOrdem,
            responsavel: req.body.responsavel,
            data_ordem: req.body.dataOrdem,
            razao_social: req.body.razaoSocial,
            nome_fantasia: req.body.nomeFantasia || null,
            cnpj: req.body.cnpj,
            endereco_fornecedor: req.body.enderecoFornecedor || null,
            site: req.body.site || null,
            contato: req.body.contato || null,
            telefone: req.body.telefone || null,
            email: req.body.email || null,
            items: req.body.items,
            valor_total: req.body.valorTotal,
            frete: req.body.frete || null,
            local_entrega: req.body.localEntrega || null,
            prazo_entrega: req.body.prazoEntrega || null,
            transporte: req.body.transporte || null,
            forma_pagamento: req.body.formaPagamento,
            prazo_pagamento: req.body.prazoPagamento,
            dados_bancarios: req.body.dadosBancarios || null,
            status: 'aberta'
        };

        const { data, error } = await supabase
            .from('ordens_compra')
            .insert([ordemData])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        console.error('Erro ao criar ordem:', error);
        res.status(500).json({ 
            error: 'Erro ao criar ordem',
            details: error.message 
        });
    }
});

// PUT - Atualizar ordem
app.put('/api/ordens/:id', verifySession, async (req, res) => {
    try {
        const { id } = req.params;

        const ordemData = {
            numero_ordem: req.body.numeroOrdem,
            responsavel: req.body.responsavel,
            data_ordem: req.body.dataOrdem,
            razao_social: req.body.razaoSocial,
            nome_fantasia: req.body.nomeFantasia || null,
            cnpj: req.body.cnpj,
            endereco_fornecedor: req.body.enderecoFornecedor || null,
            site: req.body.site || null,
            contato: req.body.contato || null,
            telefone: req.body.telefone || null,
            email: req.body.email || null,
            items: req.body.items,
            valor_total: req.body.valorTotal,
            frete: req.body.frete || null,
            local_entrega: req.body.localEntrega || null,
            prazo_entrega: req.body.prazoEntrega || null,
            transporte: req.body.transporte || null,
            forma_pagamento: req.body.formaPagamento,
            prazo_pagamento: req.body.prazoPagamento,
            dados_bancarios: req.body.dadosBancarios || null,
            status: req.body.status || 'aberta',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('ordens_compra')
            .update(ordemData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Ordem não encontrada' });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao atualizar ordem:', error);
        res.status(500).json({ 
            error: 'Erro ao atualizar ordem',
            details: error.message 
        });
    }
});

// PATCH - Atualizar apenas status
app.patch('/api/ordens/:id/status', verifySession, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const { data, error } = await supabase
            .from('ordens_compra')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Ordem não encontrada' });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ 
            error: 'Erro ao atualizar status',
            details: error.message 
        });
    }
});

// DELETE - Excluir ordem
app.delete('/api/ordens/:id', verifySession, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('ordens_compra')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Ordem excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir ordem:', error);
        res.status(500).json({ 
            error: 'Erro ao excluir ordem',
            details: error.message 
        });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Ordem de Compra API'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Supabase URL: ${process.env.SUPABASE_URL ? 'Configurado' : 'NÃO CONFIGURADO'}`);
});
