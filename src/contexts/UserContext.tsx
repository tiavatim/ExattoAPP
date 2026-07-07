import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UsuarioInterfaceProps } from '@/interfaces/usuarioInterface';
import { useRouter } from 'expo-router';

interface UserContextType {
  usuario: UsuarioInterfaceProps | null;
  setUsuario: (user: UsuarioInterfaceProps | null) => void;
  logout: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [usuario, setUsuario] = useState<UsuarioInterfaceProps | null>(null);
  const router = useRouter();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const json = await AsyncStorage.getItem('@user');
        if (json) {
          const parsed = JSON.parse(json);

          // Validação de login por data
          const loginTimestamp = parsed.loginTimestamp;
          if (loginTimestamp) {
            const loginDate = new Date(loginTimestamp);
            const hoje = new Date();

            const mesmoDia =
              loginDate.getFullYear() === hoje.getFullYear() &&
              loginDate.getMonth() === hoje.getMonth() &&
              loginDate.getDate() === hoje.getDate();

            if (mesmoDia) {
              setUsuario(parsed);
              return;
            }
          }

          // Sessão inválida
          await AsyncStorage.removeItem('@user');
          setUsuario(null);
          router.replace('/');
        }
      } catch (e) {
        console.error('Erro ao carregar usuário do AsyncStorage:', e);
      }
    };

    carregarUsuario();
  }, []);

  const logout = async () => {
    await AsyncStorage.removeItem('@user');
    setUsuario(null);
    router.replace('/');
  };

  return (
    <UserContext.Provider value={{ usuario, setUsuario, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser deve ser usado dentro de UserProvider');
  return ctx;
};
