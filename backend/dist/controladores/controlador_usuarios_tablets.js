"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listar_usuarios_tablets = listar_usuarios_tablets;
exports.obter_usuario_tablet = obter_usuario_tablet;
exports.cadastrar_usuario_tablet = cadastrar_usuario_tablet;
exports.atualizar_usuario_tablet = atualizar_usuario_tablet;
exports.remover_usuario_tablet = remover_usuario_tablet;
const conexao_1 = require("../banco/conexao");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Normaliza um registro retornado do banco ou da memória.
 */
function normalizarUsuarioTablet(row) {
    return {
        id: row.id,
        nome_completo: row.nome_completo || '',
        unidade_basica: row.unidade_basica || 'USF 01 Centro',
        matricula: row.matricula || null,
        cpf: row.cpf || '',
        email: (row.email || '').toLowerCase(),
        telefone: row.telefone || '',
        dispositivo_id: row.dispositivo_id || null,
        dispositivo_numero_serie: row.dispositivo_numero_serie || null,
        dispositivo_modelo: row.dispositivo_modelo || null,
        dispositivo_status: row.dispositivo_status || null,
        dispositivo_bateria: row.dispositivo_bateria !== undefined && row.dispositivo_bateria !== null ? Number(row.dispositivo_bateria) : null,
        criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
        atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString(),
    };
}
/**
 * Lista todos os usuários cadastrados e vinculados aos tablets.
 */
async function listar_usuarios_tablets(requisicao, resposta) {
    try {
        const busca = requisicao.query.busca?.trim().toLowerCase();
        const sql = `
      SELECT ut.id, ut.nome_completo, ut.unidade_basica, ut.matricula, ut.cpf, ut.email, ut.telefone, ut.dispositivo_id,
             ut.criado_em, ut.atualizado_em,
             d.numero_serie AS dispositivo_numero_serie,
             d.modelo AS dispositivo_modelo,
             d.status_conexao AS dispositivo_status,
             d.bateria AS dispositivo_bateria
      FROM usuarios_tablets ut
      LEFT JOIN dispositivos d ON ut.dispositivo_id = d.id
      ORDER BY ut.criado_em DESC;
    `;
        const resultado = await (0, conexao_1.executar_consulta)(sql);
        let usuarios = [];
        if (resultado.rows && resultado.rows.length > 0) {
            usuarios = resultado.rows.map(normalizarUsuarioTablet);
        }
        else {
            usuarios = conexao_1.usuariosTabletsMemoria.map(normalizarUsuarioTablet);
        }
        if (busca) {
            usuarios = usuarios.filter((u) => {
                return (u.nome_completo.toLowerCase().includes(busca) ||
                    (u.unidade_basica && u.unidade_basica.toLowerCase().includes(busca)) ||
                    (u.matricula && u.matricula.toLowerCase().includes(busca)) ||
                    (u.cpf && u.cpf.toLowerCase().includes(busca)) ||
                    u.email.toLowerCase().includes(busca) ||
                    u.telefone.toLowerCase().includes(busca) ||
                    (u.dispositivo_numero_serie && u.dispositivo_numero_serie.toLowerCase().includes(busca)) ||
                    (u.dispositivo_modelo && u.dispositivo_modelo.toLowerCase().includes(busca)));
            });
        }
        resposta.status(200).send({
            sucesso: true,
            total: usuarios.length,
            usuarios,
        });
    }
    catch (erro) {
        console.error('Erro ao listar usuários dos tablets:', erro);
        resposta.status(500).send({
            sucesso: false,
            mensagem: 'Falha interna ao consultar cadastro de usuários dos tablets.',
        });
    }
}
/**
 * Obtém os detalhes de um usuário específico pelo ID.
 */
async function obter_usuario_tablet(requisicao, resposta) {
    try {
        const { id } = requisicao.params;
        const sql = `
      SELECT ut.id, ut.nome_completo, ut.unidade_basica, ut.matricula, ut.cpf, ut.email, ut.telefone, ut.dispositivo_id,
             ut.criado_em, ut.atualizado_em,
             d.numero_serie AS dispositivo_numero_serie,
             d.modelo AS dispositivo_modelo,
             d.status_conexao AS dispositivo_status,
             d.bateria AS dispositivo_bateria
      FROM usuarios_tablets ut
      LEFT JOIN dispositivos d ON ut.dispositivo_id = d.id
      WHERE ut.id::text = $1
      LIMIT 1;
    `;
        const resultado = await (0, conexao_1.executar_consulta)(sql, [id]);
        if (resultado.rows && resultado.rows.length > 0) {
            resposta.status(200).send({
                sucesso: true,
                usuario: normalizarUsuarioTablet(resultado.rows[0]),
            });
            return;
        }
        const emMemoria = conexao_1.usuariosTabletsMemoria.find((u) => u.id === id);
        if (emMemoria) {
            resposta.status(200).send({
                sucesso: true,
                usuario: normalizarUsuarioTablet(emMemoria),
            });
            return;
        }
        resposta.status(404).send({
            sucesso: false,
            mensagem: `Usuário com identificador '${id}' não encontrado.`,
        });
    }
    catch (erro) {
        console.error('Erro ao obter usuário de tablet:', erro);
        resposta.status(500).send({
            sucesso: false,
            mensagem: 'Falha interna ao consultar dados do usuário.',
        });
    }
}
/**
 * Cadastra um novo usuário e vincula ao tablet corporativo correspondente.
 */
async function cadastrar_usuario_tablet(requisicao, resposta) {
    try {
        const { nome_completo, unidade_basica, matricula, cpf, email, telefone, dispositivo_id } = requisicao.body;
        if (!nome_completo || nome_completo.trim().length < 3) {
            resposta.status(400).send({
                sucesso: false,
                mensagem: 'O nome completo é obrigatório (mínimo de 3 caracteres).',
            });
            return;
        }
        if (!email || !email.includes('@') || !email.includes('.')) {
            resposta.status(400).send({
                sucesso: false,
                mensagem: 'Informe um endereço de e-mail válido.',
            });
            return;
        }
        if (!telefone || telefone.trim().length < 8) {
            resposta.status(400).send({
                sucesso: false,
                mensagem: 'Informe um telefone de contato válido (com DDD).',
            });
            return;
        }
        const dispIdLimpo = dispositivo_id && dispositivo_id.trim() ? dispositivo_id.trim() : null;
        // Se informou dispositivo, verifica se já existe outro usuário vinculado a este mesmo tablet
        if (dispIdLimpo) {
            try {
                const resExistente = await (0, conexao_1.executar_consulta)('SELECT id, nome_completo FROM usuarios_tablets WHERE dispositivo_id::text = $1 LIMIT 1;', [dispIdLimpo]);
                if (resExistente.rows && resExistente.rows.length > 0) {
                    resposta.status(409).send({
                        sucesso: false,
                        mensagem: `Este tablet já está atualmente atribuído a "${resExistente.rows[0].nome_completo}". Desvincule-o primeiro antes de associar a outro usuário.`,
                    });
                    return;
                }
            }
            catch (_) { }
        }
        const id = crypto_1.default.randomUUID();
        const nomeLimpo = nome_completo.trim();
        const ubLimpo = unidade_basica?.trim() || 'USF 01 Centro';
        const matriculaLimpo = matricula?.trim() || null;
        const cpfLimpo = cpf?.trim() || null;
        const emailLimpo = email.trim().toLowerCase();
        const telLimpo = telefone.trim();
        // 1. Tenta gravar no PostgreSQL
        let usuarioCriado = null;
        try {
            const sqlInsert = `
        INSERT INTO usuarios_tablets (id, nome_completo, unidade_basica, matricula, cpf, email, telefone, dispositivo_id, criado_em, atualizado_em)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *;
      `;
            const resInsert = await (0, conexao_1.executar_consulta)(sqlInsert, [
                id,
                nomeLimpo,
                ubLimpo,
                matriculaLimpo,
                cpfLimpo,
                emailLimpo,
                telLimpo,
                dispIdLimpo,
            ]);
            if (resInsert.rows && resInsert.rows.length > 0) {
                usuarioCriado = resInsert.rows[0];
            }
        }
        catch (errDb) {
            console.warn('Fallback: Erro ao inserir no BD, mantendo em memória.', errDb);
        }
        // 2. Garante persistência no repositório simulado em memória
        const usuarioMem = {
            id,
            nome_completo: nomeLimpo,
            unidade_basica: ubLimpo,
            matricula: matriculaLimpo,
            cpf: cpfLimpo,
            email: emailLimpo,
            telefone: telLimpo,
            dispositivo_id: dispIdLimpo,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
        };
        const idxExistente = conexao_1.usuariosTabletsMemoria.findIndex((u) => u.id === id);
        if (idxExistente !== -1) {
            conexao_1.usuariosTabletsMemoria[idxExistente] = usuarioMem;
        }
        else {
            conexao_1.usuariosTabletsMemoria.unshift(usuarioMem);
        }
        resposta.status(201).send({
            sucesso: true,
            mensagem: `Usuário "${nomeLimpo}" cadastrado com sucesso!`,
            usuario: normalizarUsuarioTablet(usuarioCriado || usuarioMem),
        });
    }
    catch (erro) {
        console.error('Erro ao cadastrar usuário do tablet:', erro);
        resposta.status(500).send({
            sucesso: false,
            mensagem: 'Falha interna ao cadastrar novo usuário do tablet.',
        });
    }
}
/**
 * Atualiza os dados de um usuário existente e/ou seu tablet vinculado.
 */
async function atualizar_usuario_tablet(requisicao, resposta) {
    try {
        const { id } = requisicao.params;
        const { nome_completo, unidade_basica, matricula, cpf, email, telefone, dispositivo_id } = requisicao.body;
        if (nome_completo !== undefined && nome_completo.trim().length < 3) {
            resposta.status(400).send({
                sucesso: false,
                mensagem: 'O nome completo deve conter no mínimo 3 caracteres.',
            });
            return;
        }
        if (email !== undefined && (!email.includes('@') || !email.includes('.'))) {
            resposta.status(400).send({
                sucesso: false,
                mensagem: 'Informe um endereço de e-mail válido.',
            });
            return;
        }
        if (telefone !== undefined && telefone.trim().length < 8) {
            resposta.status(400).send({
                sucesso: false,
                mensagem: 'Informe um telefone de contato válido.',
            });
            return;
        }
        const dispIdLimpo = dispositivo_id !== undefined ? (dispositivo_id && dispositivo_id.trim() ? dispositivo_id.trim() : null) : undefined;
        // Se alterou dispositivo, checa se outro usuário já possui este tablet
        if (dispIdLimpo) {
            try {
                const resExistente = await (0, conexao_1.executar_consulta)('SELECT id, nome_completo FROM usuarios_tablets WHERE dispositivo_id::text = $1 AND id::text != $2 LIMIT 1;', [dispIdLimpo, id]);
                if (resExistente.rows && resExistente.rows.length > 0) {
                    resposta.status(409).send({
                        sucesso: false,
                        mensagem: `Este tablet já está atualmente atribuído a "${resExistente.rows[0].nome_completo}". Desvincule-o primeiro antes de associar a outro usuário.`,
                    });
                    return;
                }
            }
            catch (_) { }
        }
        let usuarioAtualizado = null;
        try {
            const sqlUpdate = `
        UPDATE usuarios_tablets
        SET nome_completo = COALESCE($1, nome_completo),
            unidade_basica = COALESCE($2, unidade_basica),
            matricula = COALESCE($3, matricula),
            cpf = COALESCE($4, cpf),
            email = COALESCE($5, email),
            telefone = COALESCE($6, telefone),
            dispositivo_id = $7,
            atualizado_em = NOW()
        WHERE id::text = $8
        RETURNING *;
      `;
            const resUp = await (0, conexao_1.executar_consulta)(sqlUpdate, [
                nome_completo?.trim(),
                unidade_basica?.trim(),
                matricula !== undefined ? matricula?.trim() || null : undefined,
                cpf?.trim(),
                email ? email.trim().toLowerCase() : undefined,
                telefone?.trim(),
                dispIdLimpo,
                id,
            ]);
            if (resUp.rows && resUp.rows.length > 0) {
                usuarioAtualizado = resUp.rows[0];
            }
        }
        catch (errDb) {
            console.warn('Fallback: Erro ao atualizar usuário no BD, atualizando memória.', errDb);
        }
        const usuarioMem = conexao_1.usuariosTabletsMemoria.find((u) => u.id === id);
        if (usuarioMem) {
            if (nome_completo !== undefined)
                usuarioMem.nome_completo = nome_completo.trim();
            if (unidade_basica !== undefined)
                usuarioMem.unidade_basica = unidade_basica?.trim() || null;
            if (matricula !== undefined)
                usuarioMem.matricula = matricula?.trim() || null;
            if (cpf !== undefined)
                usuarioMem.cpf = cpf?.trim() || null;
            if (email !== undefined)
                usuarioMem.email = email.trim().toLowerCase();
            if (telefone !== undefined)
                usuarioMem.telefone = telefone.trim();
            if (dispIdLimpo !== undefined)
                usuarioMem.dispositivo_id = dispIdLimpo;
            usuarioMem.atualizado_em = new Date().toISOString();
        }
        resposta.status(200).send({
            sucesso: true,
            mensagem: 'Cadastro do usuário atualizado com sucesso!',
            usuario: normalizarUsuarioTablet(usuarioAtualizado || usuarioMem),
        });
    }
    catch (erro) {
        console.error('Erro ao atualizar usuário do tablet:', erro);
        resposta.status(500).send({
            sucesso: false,
            mensagem: 'Falha interna ao atualizar cadastro do usuário.',
        });
    }
}
/**
 * Remove o cadastro de um usuário de tablet.
 */
async function remover_usuario_tablet(requisicao, resposta) {
    try {
        const { id } = requisicao.params;
        try {
            await (0, conexao_1.executar_consulta)('DELETE FROM usuarios_tablets WHERE id::text = $1;', [id]);
        }
        catch (_) { }
        const idx = conexao_1.usuariosTabletsMemoria.findIndex((u) => u.id === id);
        if (idx !== -1) {
            conexao_1.usuariosTabletsMemoria.splice(idx, 1);
        }
        resposta.status(200).send({
            sucesso: true,
            mensagem: 'Cadastro do usuário removido com sucesso.',
        });
    }
    catch (erro) {
        console.error('Erro ao remover usuário do tablet:', erro);
        resposta.status(500).send({
            sucesso: false,
            mensagem: 'Falha interna ao remover usuário do tablet.',
        });
    }
}
