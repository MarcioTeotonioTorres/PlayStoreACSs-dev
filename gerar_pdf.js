const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const caminhoEdge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const caminhoHtml = path.resolve(__dirname, 'MANUAL_DE_USO_MDM_CORPORATIVO.html');
const caminhoPdf = path.resolve(__dirname, 'MANUAL_DE_USO_MDM_CORPORATIVO.pdf');

console.log('Iniciando geração de PDF corporativo...');
console.log('Origem HTML:', caminhoHtml);
console.log('Destino PDF:', caminhoPdf);

const args = [
  '--headless',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${caminhoPdf}`,
  `file:///${caminhoHtml.replace(/\\/g, '/')}`
];

try {
  execFileSync(caminhoEdge, args, { stdio: 'inherit' });

  if (fs.existsSync(caminhoPdf)) {
    const stats = fs.statSync(caminhoPdf);
    console.log(`\n✓ PDF gerado com sucesso!`);
    console.log(`Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`Localização: ${caminhoPdf}`);

    // Copiar também para a pasta public do backend para download via web
    const destinoPublic = path.resolve(__dirname, 'backend', 'public', 'MANUAL_DE_USO_MDM_CORPORATIVO.pdf');
    fs.copyFileSync(caminhoPdf, destinoPublic);
    console.log(`Copiado para download web: ${destinoPublic}`);
  } else {
    console.error('Falha: O arquivo PDF não foi criado.');
    process.exit(1);
  }
} catch (erro) {
  console.error('Erro ao executar Edge para gerar PDF:', erro);
  process.exit(1);
}
