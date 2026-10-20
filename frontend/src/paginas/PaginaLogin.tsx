import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contextos/ContextoAutenticacao';

export const PaginaLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [capsLockAtivo, setCapsLockAtivo] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  function tratarKeyDown(evento: React.KeyboardEvent) {
    if (evento.getModifierState('CapsLock')) {
      setCapsLockAtivo(true);
    } else {
      setCapsLockAtivo(false);
    }
  }

  async function aoSubmeter(evento: React.FormEvent) {
    evento.preventDefault();
    if (!email.trim() || !senha.trim()) {
      setErro('Informe o e-mail e a senha de acesso.');
      return;
    }

    setErro('');
    setCarregando(true);

    try {
      const resp = await login(email.trim(), senha);
      if (resp.sucesso) {
        navigate('/', { replace: true });
      } else {
        setErro(resp.mensagem || 'Falha na autenticação. Verifique as credenciais.');
      }
    } catch (err: any) {
      setErro('Erro de conexão com o servidor MDM. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  function preencherCredenciaisPadrao() {
    setEmail('admin@mdm.corporativo');
    setSenha('Admin@Mdm2026!');
    setErro('');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#090d16',
        backgroundImage: `
          radial-gradient(circle at 15% 25%, rgba(59, 130, 246, 0.12) 0%, transparent 45%),
          radial-gradient(circle at 85% 75%, rgba(139, 92, 246, 0.10) 0%, transparent 45%)
        `,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.15)',
        }}
      >
        {/* Cabeçalho do Card */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.05))',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              marginBottom: '16px',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Shield size={32} color="#3b82f6" />
          </div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            MDM Corporativo ACSs
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>
            Painel Central de Gestão & Telemetria da Frota
          </p>
        </div>

        {/* Alerta de Erro */}
        {erro && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '20px',
              animation: 'shake 0.3s ease-in-out',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{erro}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={aoSubmeter}>
          {/* Campo E-mail */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              E-mail do Operador
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              >
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@mdm.corporativo"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  background: '#0a0f1d',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Senha de Acesso
              </label>
              {capsLockAtivo && (
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                  ⚠️ Caps Lock Ativado
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              >
                <Lock size={16} />
              </div>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={tratarKeyDown}
                onKeyUp={tratarKeyDown}
                placeholder="••••••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 40px',
                  background: '#0a0f1d',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Botão de Entrar */}
          <button
            type="submit"
            disabled={carregando}
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: carregando ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
              opacity: carregando ? 0.7 : 1,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            {carregando ? (
              <span>Autenticando na frota...</span>
            ) : (
              <>
                <span>Acessar Painel MDM</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Dica de Acesso Inicial */}
        <div
          style={{
            marginTop: '28px',
            padding: '12px 14px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Acesso Administrador Padrão</span>
            <button
              type="button"
              onClick={preencherCredenciaisPadrao}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#60a5fa',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Preencher dados
            </button>
          </div>
          <div style={{ marginTop: '6px', fontFamily: 'monospace', fontSize: '11px', color: '#cbd5e1' }}>
            admin@mdm.corporativo • Admin@Mdm2026!
          </div>
        </div>

        {/* Rodapé de Segurança */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <CheckCircle2 size={13} color="#10b981" />
          <span>Conexão Criptografada • TLS 1.3 & JWT Bearer</span>
        </div>
      </div>
    </div>
  );
};
