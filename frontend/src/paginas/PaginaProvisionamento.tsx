import React, { useState } from 'react';
import {
  Terminal,
  ShieldCheck,
  CheckCircle,
  Usb,
  Copy,
  Check,
  AlertTriangle,
  HelpCircle,
  BatteryCharging,
  Smartphone,
  Zap,
  FolderOpen,
  Download,
} from 'lucide-react';

export const PaginaProvisionamento: React.FC = () => {
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  function copiarParaTransferencia(texto: string, id: string) {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => {
      setCopiadoId(null);
    }, 2000);
  }

  const comandoVerificar = 'adb devices';
  const comandoScriptAutomatico = '.\\provisionar_novo_tablet.bat';
  const comandoInstalarProjeto = 'adb install -r backend\\public\\apk\\mdm-dpc.apk';
  const comandoInstalarBaixado = 'adb install -r mdm-dpc.apk';
  const comandoPromover = 'adb shell dpm set-device-owner com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo';
  const comandoBateria = 'adb shell dumpsys deviceidle whitelist +com.mdm.corporativo';
  const comandoUso = 'adb shell appops set com.mdm.corporativo GET_USAGE_STATS allow';
  const comandoCompilar = 'cd android && .\\gradlew assembleRelease';
  const comandoBloatwareExemplo = 'adb shell dpm set-application-hidden com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo com.google.android.youtube true';

  return (
    <div className="pagina-conteudo">
      {/* Cabeçalho da Página */}
      <div className="pagina-cabecalho">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 className="pagina-titulo" style={{ margin: 0 }}>Instalação e Provisionamento via ADB (Device Owner)</h2>
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Versão Estável v1.2.3
            </span>
          </div>
          <p className="pagina-subtitulo">
            Guia completo e passo a passo para registrar os tablets corporativos como Proprietário do Dispositivo (Device Owner) via conexão USB. Totalmente compatível com Android 8 até <strong>Android 15 (API 35)</strong>.
          </p>
        </div>
      </div>

      {/* Destaque Inicial: O que é o modo Device Owner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
        }}
      >
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.2)',
            padding: '12px',
            borderRadius: '10px',
            color: '#60a5fa',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={28} />
        </div>
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
            Privilégio Total de Hardware e Gerenciamento Corporativo
          </h4>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
            A promoção para <strong>Device Owner</strong> concede autoridade máxima ao aplicativo MDM. É através deste modo que o tablet permite:
            a leitura do <strong>número de série real do hardware</strong> (impresso na carcaça), instalação silenciosa de APKs sem intervenção do usuário, bloqueio agressivo de desinstalação, restrição de reset de fábrica, e bloqueio de lojas não autorizadas ou transferência via Bluetooth.
          </p>
        </div>
      </div>

      {/* Grid de Conteúdo Principal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        
        {/* Card 1: Pré-requisitos Obrigatórios */}
        <div className="card-tabela" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Usb size={22} color="var(--primaria)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>1. Pré-Requisitos no Tablet</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', lineHeight: '1.6' }}>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '12px 16px',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700, marginBottom: '4px' }}>
                <AlertTriangle size={16} />
                Regra de Ouro: Sem Contas Google / Samsung Logadas
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '12px' }}>
                O comando de Device Owner falhará se houver qualquer conta de e-mail ou pessoal logada. O tablet deve estar <strong>recém-formatado (Padrão de Fábrica)</strong> ou sem contas configuradas.
              </p>
            </div>

            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--texto-secundario)' }}>
              <li>
                <strong style={{ color: '#fff' }}>Ativar Opções do Desenvolvedor:</strong> Acesse{' '}
                <code>Configurações &gt; Sobre o tablet &gt; Informações de software</code> e toque{' '}
                <strong>7 vezes</strong> sobre "Número da compilação".
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Ativar Depuração USB:</strong> Volte em{' '}
                <code>Configurações &gt; Opções do desenvolvedor</code> e ligue a chave <strong>Depuração USB</strong>.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Cabo de Dados USB:</strong> Conecte o tablet ao computador com um cabo que suporte transferência de dados (não apenas carregamento).
              </li>
              <li>
                <strong style={{ color: '#fff' }}>ADB Instalado:</strong> O comando <code>adb</code> deve estar configurado no terminal do Windows (incluso no Android SDK / Platform Tools).
              </li>
            </ul>
          </div>
        </div>

        {/* Card 2: Localização e Compilação do APK */}
        <div className="card-tabela" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <FolderOpen size={22} color="var(--sucesso)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>2. Onde está o APK de Instalação?</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', lineHeight: '1.6' }}>
            <p style={{ color: 'var(--texto-secundario)' }}>
              O pacote APK oficial compilado para produção fica disponível diretamente para download ou no repositório:
            </p>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <a
                href="/apk/mdm-dpc.apk"
                download="mdm-dpc.apk"
                className="btn btn-primario"
                style={{ padding: '8px 14px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} /> Baixar mdm-dpc.apk
              </a>
              <span style={{ fontSize: '11px', color: 'var(--texto-secundario)' }}>ou no projeto: <code>backend\public\apk\mdm-dpc.apk</code></span>
            </div>

            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                padding: '12px 14px',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: '4px' }}>
                Como gerar uma nova versão após alterar o código:
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>
                Execute no terminal do projeto para compilar a versão final otimizada:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--fundo-base)', padding: '6px 10px', borderRadius: '6px' }}>
                <code className="texto-mono" style={{ fontSize: '11px', color: '#34d399' }}>{comandoCompilar}</code>
                <button
                  className="btn btn-secundario"
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                  onClick={() => copiarParaTransferencia(comandoCompilar, 'compilar')}
                >
                  {copiadoId === 'compilar' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Seção Central: Sequência de Comandos no Terminal */}
      <div className="card-tabela" style={{ marginTop: '24px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Terminal size={24} color="#10b981" />
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>3. Sequência de Comandos ADB (Terminal Windows)</h3>
        </div>

        {/* Banner Método Automatizado 1-Clique */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#34d399" />
              <strong style={{ color: '#34d399', fontSize: '14px' }}>Método 1: Provisionamento Automático em 1 Clique (Recomendado)</strong>
            </div>
            <button
              className="btn btn-primario"
              style={{ fontSize: '11px', padding: '4px 10px', background: '#10b981', borderColor: '#10b981' }}
              onClick={() => copiarParaTransferencia(comandoScriptAutomatico, 'scriptAuto')}
            >
              {copiadoId === 'scriptAuto' ? <><Check size={12} color="#fff" /> Copiado!</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#e2e8f0', margin: 0 }}>
            Se você está na pasta do projeto no computador, basta executar este script no terminal (ou dar dois cliques nele no Windows). Ele instala o APK, ativa o Device Owner, concede permissões e oculta bloatware automaticamente:
          </p>
          <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '8px 12px', borderRadius: '6px', color: '#34d399', fontSize: '13px', margin: 0 }}>
            {comandoScriptAutomatico}
          </pre>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Terminal size={18} color="#94a3b8" />
          <strong style={{ fontSize: '14px', color: '#cbd5e1' }}>Método 2: Comandos Manuais Passo a Passo</strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Passo A */}
          <div style={{ background: 'var(--fundo-elevado)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--borda-suave)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'var(--primaria)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  A
                </span>
                <strong style={{ fontSize: '14px', color: '#fff' }}>Verifique se o tablet foi reconhecido e autorizado</strong>
              </div>
              <button
                className="btn btn-secundario"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => copiarParaTransferencia(comandoVerificar, 'passoA')}
              >
                {copiadoId === 'passoA' ? (
                  <>
                    <Check size={12} color="#34d399" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copiar
                  </>
                )}
              </button>
            </div>
            <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '10px 14px', borderRadius: '6px', color: '#93c5fd', fontSize: '13px' }}>
              {comandoVerificar}
            </pre>
            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', marginTop: '6px' }}>
              💡 <em>Atenção: Na tela do tablet, aparecerá o pop-up "Permitir depuração USB?". Marque <strong>"Sempre permitir deste computador"</strong> e clique em <strong>Permitir</strong>. O resultado do terminal deve exibir o serial do tablet seguido da palavra <code>device</code> (não <code>unauthorized</code>).</em>
            </p>
          </div>

          {/* Passo B */}
          <div style={{ background: 'var(--fundo-elevado)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--borda-suave)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'var(--primaria)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  B
                </span>
                <strong style={{ fontSize: '14px', color: '#fff' }}>Instale o APK Corporativo no Tablet</strong>
              </div>
              <button
                className="btn btn-secundario"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => copiarParaTransferencia(comandoInstalarProjeto, 'passoB')}
              >
                {copiadoId === 'passoB' ? (
                  <>
                    <Check size={12} color="#34d399" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copiar
                  </>
                )}
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
              <strong>Na pasta do projeto Windows:</strong>
            </p>
            <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '10px 14px', borderRadius: '6px', color: '#93c5fd', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '10px' }}>
              {comandoInstalarProjeto}
            </pre>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}><strong>Ou se você baixou o APK avulso pelo botão acima:</strong></span>
              <button
                className="btn btn-secundario"
                style={{ fontSize: '10px', padding: '2px 8px' }}
                onClick={() => copiarParaTransferencia(comandoInstalarBaixado, 'passoBaixado')}
              >
                {copiadoId === 'passoBaixado' ? <><Check size={10} color="#34d399" /> Copiado!</> : <><Copy size={10} /> Copiar</>}
              </button>
            </div>
            <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '8px 12px', borderRadius: '6px', color: '#93c5fd', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
              {comandoInstalarBaixado}
            </pre>

            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', marginTop: '6px' }}>
              Retorno esperado no terminal: <strong style={{ color: '#34d399' }}>Success</strong>. O parâmetro <code>-r</code> reinstala e preserva os dados se já houver uma versão anterior.
            </p>
          </div>

          {/* Passo C */}
          <div style={{ background: 'var(--fundo-elevado)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--borda-destaque)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#10b981', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  C
                </span>
                <strong style={{ fontSize: '14px', color: '#fff' }}>Comando Principal: Promover a Device Owner</strong>
              </div>
              <button
                className="btn btn-primario"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => copiarParaTransferencia(comandoPromover, 'passoC')}
              >
                {copiadoId === 'passoC' ? (
                  <>
                    <Check size={12} color="#fff" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copiar Comando
                  </>
                )}
              </button>
            </div>
            <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '10px 14px', borderRadius: '6px', color: '#34d399', fontSize: '13px', whiteSpace: 'pre-wrap', fontWeight: 600 }}>
              {comandoPromover}
            </pre>
            <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>
              Retorno esperado: <strong style={{ color: '#34d399' }}>Success: Device owner set to package com.mdm.corporativo</strong>. A partir deste segundo, o aplicativo tem privilégios totais de administração empresarial!
            </p>
          </div>

          {/* Passo D */}
          <div style={{ background: 'var(--fundo-elevado)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--borda-suave)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'var(--primaria)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  D
                </span>
                <strong style={{ fontSize: '14px', color: '#fff' }}>Excluir da Otimização de Bateria (Persistência 24/7)</strong>
              </div>
              <button
                className="btn btn-secundario"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => copiarParaTransferencia(comandoBateria, 'passoD')}
              >
                {copiadoId === 'passoD' ? (
                  <>
                    <Check size={12} color="#34d399" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copiar
                  </>
                )}
              </button>
            </div>
            <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '10px 14px', borderRadius: '6px', color: '#93c5fd', fontSize: '13px' }}>
              {comandoBateria}
            </pre>
            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', marginTop: '6px' }}>
              Garante que o Android nunca encerre o serviço de telemetria MQTT em segundo plano quando o tablet estiver com tela apagada por muito tempo.
            </p>
          </div>

          {/* Passo E */}
          <div style={{ background: 'var(--fundo-elevado)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--borda-suave)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'var(--primaria)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  E
                </span>
                <strong style={{ fontSize: '14px', color: '#fff' }}>Permissão de Estatísticas de Uso & Leitura de App Ocioso (Recomendado)</strong>
              </div>
              <button
                className="btn btn-secundario"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => copiarParaTransferencia(comandoUso, 'passoE')}
              >
                {copiadoId === 'passoE' ? (
                  <>
                    <Check size={12} color="#34d399" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copiar
                  </>
                )}
              </button>
            </div>
            <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '10px 14px', borderRadius: '6px', color: '#93c5fd', fontSize: '13px' }}>
              {comandoUso}
            </pre>
            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', marginTop: '6px' }}>
              Garante que o painel identifique exatamente qual aplicativo está em foco e calcule com máxima fidelidade os tempos de ociosidade e uso ativo do tablet.
            </p>
          </div>

          {/* Passo F */}
          <div style={{ background: 'var(--fundo-elevado)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--borda-suave)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'var(--primaria)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  F
                </span>
                <strong style={{ fontSize: '14px', color: '#fff' }}>Ocultação de Bloatware & Perfil Estrito ACS (Opcional se usar o script)</strong>
              </div>
              <button
                className="btn btn-secundario"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => copiarParaTransferencia(comandoBloatwareExemplo, 'passoF')}
              >
                {copiadoId === 'passoF' ? (
                  <>
                    <Check size={12} color="#34d399" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copiar
                  </>
                )}
              </button>
            </div>
            <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '10px 14px', borderRadius: '6px', color: '#93c5fd', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
              {comandoBloatwareExemplo}
            </pre>
            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', marginTop: '6px' }}>
              💡 <em>O script automático <code>.\provisionar_novo_tablet.bat</code> já oculta mais de 25 apps recreativos de fábrica (YouTube, Play Store, Fotos, Jogos) e assegura que os aplicativos autorizados de saúde e trabalho (Chrome, e-SUS, WhatsApp, Agenda, Relógio) fiquem 100% liberados e visíveis na gaveta.</em>
            </p>
          </div>

        </div>
      </div>

      {/* Seção 4: Resolução de Dúvidas e Problemas Comuns */}
      <div className="card-tabela" style={{ marginTop: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <HelpCircle size={22} color="var(--alerta)" />
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>4. Diagnóstico e Resolução de Erros Comuns</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          
          <div style={{ background: 'var(--fundo-elevado)', padding: '16px', borderRadius: '8px', border: '1px solid var(--borda-suave)' }}>
            <h5 style={{ color: '#f87171', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Erro: "Not allowed to set the device owner because there are already some accounts on the device"
            </h5>
            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', lineHeight: '1.5' }}>
              <strong>Causa:</strong> Existe uma conta Google, Samsung, WhatsApp ou e-mail já logada no tablet.<br />
              <strong>Solução:</strong> Acesse <code>Configurações &gt; Contas</code> e remova todas as contas, ou faça uma restauração para o padrão de fábrica antes de rodar o comando.
            </p>
          </div>

          <div style={{ background: 'var(--fundo-elevado)', padding: '16px', borderRadius: '8px', border: '1px solid var(--borda-suave)' }}>
            <h5 style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Erro: "device unauthorized" no comando adb devices
            </h5>
            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', lineHeight: '1.5' }}>
              <strong>Causa:</strong> A autorização de depuração USB ainda não foi aceita na tela do tablet.<br />
              <strong>Solução:</strong> Desbloqueie a tela do tablet, clique em "Permitir" no aviso de depuração com a opção "Sempre permitir" selecionada e execute <code>adb devices</code> novamente.
            </p>
          </div>

          <div style={{ background: 'var(--fundo-elevado)', padding: '16px', borderRadius: '8px', border: '1px solid var(--borda-suave)' }}>
            <h5 style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Instalação Remota: "INSTALL_FAILED_MISSING_SPLIT" (ex: e-SUS Território)
            </h5>
            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', lineHeight: '1.5' }}>
              <strong>Causa:</strong> O arquivo <code>.apk</code> enviado é apenas a fatia base de um App Bundle do Google Play e não contém os recursos de idioma e densidade de tela.<br />
              <strong>Solução:</strong> Faça o upload do aplicativo no formato completo <strong>.xapk</strong> na aba <em>Catálogo de Aplicativos</em>. Nosso instalador silencioso descompacta e injeta todos os splits simultaneamente no Android.
            </p>
          </div>

          <div style={{ background: 'var(--fundo-elevado)', padding: '16px', borderRadius: '8px', border: '1px solid var(--borda-suave)' }}>
            <h5 style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Compatibilidade Total com Android 15 (TCL 8493A)
            </h5>
            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', lineHeight: '1.5' }}>
              Na versão <strong>v1.2.3</strong>, o agente MDM possui a permissão <code>QUERY_ALL_PACKAGES</code> e rotina automática de desbloqueio de visibilidade. Aplicativos externos (como WhatsApp e e-SUS) aparecem imediatamente na gaveta e são reportados em tempo real na telemetria.
            </p>
          </div>

          <div style={{ background: 'var(--fundo-elevado)', padding: '16px', borderRadius: '8px', border: '1px solid var(--borda-suave)' }}>
            <h5 style={{ color: '#34d399', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Como validar se deu certo no tablet?
            </h5>
            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', lineHeight: '1.5' }}>
              Ao abrir o aplicativo <strong>MDM Corporativo</strong> no tablet, o status exibirá:<br />
              <strong style={{ color: '#34d399' }}>"Status: ATIVO como Device Owner (Gerenciado pela Empresa)"</strong> e o número de série real do hardware será exibido na tela.
            </p>
          </div>

          <div style={{ background: 'var(--fundo-elevado)', padding: '16px', borderRadius: '8px', border: '1px solid var(--borda-suave)' }}>
            <h5 style={{ color: '#a78bfa', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Instalação Silenciosa dos demais APKs e XAPKs
            </h5>
            <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', lineHeight: '1.5' }}>
              Após o Passo C, você <strong>não precisa mais do cabo USB</strong> para instalar outros apps corporativos. Basta ir na aba <strong>Catálogo de Apps</strong> deste painel e clicar em "Instalar na Frota". O DPC instala em segundo plano sem confirmação do usuário.
            </p>
          </div>

        </div>
      </div>

      {/* Caixa de Sucesso Final */}
      <div
        className="card-metrica"
        style={{
          marginTop: '24px',
          border: '1px solid rgba(52, 211, 153, 0.35)',
          background: 'rgba(16, 185, 129, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <CheckCircle size={28} color="#10b981" />
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', marginBottom: '2px' }}>
            Pronto para Operação!
          </h4>
          <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.5' }}>
            Assim que o comando de Device Owner é processado com <code>Success</code>, o tablet conecta instantaneamente ao broker MQTT e à API REST da VPS. Em menos de 5 segundos ele surge na tabela de <strong>Dispositivos</strong> e no <strong>Dashboard</strong>, pronto para monitoramento contínuo e aplicação de políticas corporativas.
          </p>
        </div>
      </div>

    </div>
  );
};
