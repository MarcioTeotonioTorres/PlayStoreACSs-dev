import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import {
  listar_catalogo_aplicativos,
  remover_aplicativo_catalogo,
} from '../controladores/controlador_aplicativos';

async function rodarTestes() {
  console.log('--- INICIANDO TESTES DO CATÁLOGO DE APLICATIVOS (.APK e .XAPK) ---');
  
  const app = Fastify();
  app.get('/api/aplicativos', listar_catalogo_aplicativos);
  app.delete('/api/aplicativos/:nome_arquivo', remover_aplicativo_catalogo);

  const dirApk = path.join(__dirname, '../../public/apk');
  if (!fs.existsSync(dirApk)) {
    fs.mkdirSync(dirApk, { recursive: true });
  }

  // 1. Cria um arquivo de teste .xapk fictício com cabeçalho ZIP (PK\x03\x04)
  const testeXapk = path.join(dirApk, 'teste-app-split.xapk');
  const bufferZip = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
  fs.writeFileSync(testeXapk, bufferZip);

  // 2. Teste GET /api/aplicativos
  const resGet = await app.inject({
    method: 'GET',
    url: '/api/aplicativos',
  });
  console.log(`[TESTE 1] GET /api/aplicativos status: ${resGet.statusCode}`);
  const corpoGet = JSON.parse(resGet.body);
  console.log(`[TESTE 1] Total de aplicativos encontrados: ${corpoGet.total_aplicativos}`);
  
  const achouXapk = corpoGet.aplicativos.find((a: any) => a.nome_arquivo === 'teste-app-split.xapk');
  if (!achouXapk || achouXapk.tipo !== 'XAPK' || achouXapk.extensao !== '.xapk') {
    throw new Error('Falha no TESTE 1: Arquivo .xapk não foi detectado ou categorizado corretamente.');
  }
  console.log('✓ TESTE 1 PASSOU: Arquivo .xapk detectado com tipo XAPK e checksum calculado!');

  // 3. Teste DELETE com tentativa de remoção de mdm-dpc.apk (DEVE FALHAR / 400)
  const resDelDpc = await app.inject({
    method: 'DELETE',
    url: '/api/aplicativos/mdm-dpc.apk',
  });
  console.log(`[TESTE 2] DELETE mdm-dpc.apk status: ${resDelDpc.statusCode}`);
  if (resDelDpc.statusCode !== 400) {
    throw new Error(`Falha no TESTE 2: Esperado 400 ao tentar deletar mdm-dpc.apk, obtido ${resDelDpc.statusCode}`);
  }
  console.log('✓ TESTE 2 PASSOU: Proteção do instalador mdm-dpc.apk impediu sua exclusão.');

  // 4. Teste DELETE com tentativa de Path Traversal (DEVE FALHAR / 400)
  const resDelTraversal = await app.inject({
    method: 'DELETE',
    url: '/api/aplicativos/..%2F..%2Fpackage.json',
  });
  console.log(`[TESTE 3] DELETE com Path Traversal status: ${resDelTraversal.statusCode}`);
  if (resDelTraversal.statusCode !== 400) {
    throw new Error(`Falha no TESTE 3: Esperado 400 para path traversal, obtido ${resDelTraversal.statusCode}`);
  }
  console.log('✓ TESTE 3 PASSOU: Path traversal bloqueado com sucesso.');

  // 5. Teste DELETE no arquivo teste-app-split.xapk (DEVE TER SUCESSO / 200 e liberar espaço)
  const resDelXapk = await app.inject({
    method: 'DELETE',
    url: '/api/aplicativos/teste-app-split.xapk',
  });
  console.log(`[TESTE 4] DELETE teste-app-split.xapk status: ${resDelXapk.statusCode}`);
  const corpoDel = JSON.parse(resDelXapk.body);
  console.log(`[TESTE 4] Resposta: ${corpoDel.mensagem}`);
  if (resDelXapk.statusCode !== 200 || !corpoDel.sucesso) {
    throw new Error('Falha no TESTE 4: Não conseguiu deletar pacote .xapk');
  }
  if (fs.existsSync(testeXapk)) {
    throw new Error('Falha no TESTE 4: Arquivo teste-app-split.xapk ainda existe no disco da VPS.');
  }
  console.log('✓ TESTE 4 PASSOU: Arquivo foi excluído fisicamente e liberou espaço no disco!');

  console.log('\n--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
}

rodarTestes().catch((erro) => {
  console.error('ERRO NO TESTE:', erro);
  process.exit(1);
});
