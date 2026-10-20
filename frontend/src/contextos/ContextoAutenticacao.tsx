import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UsuarioAutenticado,
  RespostaLogin,
  fazer_login_api,
  obter_perfil_api,
  obter_usuario_armazenado,
  obter_token_armazenado,
  limpar_sessao,
} from '../servicos/auth_servico';

interface ContextoAutenticacaoTipo {
  usuario: UsuarioAutenticado | null;
  estaAutenticado: boolean;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<RespostaLogin>;
  logout: () => void;
}

const ContextoAutenticacao = createContext<ContextoAutenticacaoTipo>({
  usuario: null,
  estaAutenticado: false,
  carregando: true,
  login: async () => ({ sucesso: false, mensagem: '' }),
  logout: () => {},
});

export const ProvedorAutenticacao: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(obter_usuario_armazenado());
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    async function inicializarAutenticacao() {
      const token = obter_token_armazenado();
      if (token) {
        const perfil = await obter_perfil_api();
        if (perfil) {
          setUsuario(perfil);
        } else {
          setUsuario(null);
        }
      } else {
        setUsuario(null);
      }
      setCarregando(false);
    }

    inicializarAutenticacao();
  }, []);

  async function login(email: string, senha: string): Promise<RespostaLogin> {
    const resp = await fazer_login_api(email, senha);
    if (resp.sucesso && resp.usuario) {
      setUsuario(resp.usuario);
    }
    return resp;
  }

  function logout() {
    limpar_sessao();
    setUsuario(null);
    window.location.href = '/login';
  }

  return (
    <ContextoAutenticacao.Provider
      value={{
        usuario,
        estaAutenticado: !!usuario,
        carregando,
        login,
        logout,
      }}
    >
      {children}
    </ContextoAutenticacao.Provider>
  );
};

export function useAuth() {
  return useContext(ContextoAutenticacao);
}
