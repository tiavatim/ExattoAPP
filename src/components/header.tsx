import { Feather, Ionicons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/contexts/UserContext';
import notificacaoService from '@/services/notificacaoService';
import NotificacaoModal from '@/components/notificacaoModal';
import { CommonActions, useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Vibration } from 'react-native';

interface HeaderProps {
  onPrint?: () => void;
}

export default function Header({ onPrint }: HeaderProps) {
  const { usuario, logout } = useUser();
  const router = useRouter();
  const navigation = useNavigation();

  const [modalVisible, setModalVisible] = useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [horaAtual, setHoraAtual] = useState<string>('');

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      await logout();

      // 🔹 Reseta toda a navegação para a tela inicial (index)
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'index' }],
        })
      );
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : String(error);

      Toast.show({
        type: 'error',
        text1: 'Erro ao deslogar',
        text2: errorMessage || 'Tente novamente.',
      });
    }
  };

  async function carregarNotificacoes() {
    if (!usuario) return;

    try {
      const lista = await notificacaoService.getNotificacoes(usuario.id);
      const naoLidas = lista.filter((n) => n.IdStatus !== 45).length;
      setNotificacoesNaoLidas(naoLidas);

      // Verifica se alguma notificação é recente (menos de 10s)
      const agora = Date.now();
      const novas = lista.filter((n) => {
        const match = /\/Date\((\d+)\)\//.exec(n.DtNotificar);
        if (match && match[1]) {
          const dt = parseInt(match[1]);
          return agora - dt < 10000;
        }
        return false;
      });

   if (novas.length > 0) {
  const msg = `Você tem ${novas.length} nova(s) notificação(ões).`;

  Toast.show({
    type: 'info',
    text1: '📢 Nova notificação recebida!',
    text2: msg,
  });

  // 📳 Vibração
  Vibration.vibrate(500);

  // 🔔 Notificação padrão do sistema (com som do tablet)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📢 Nova notificação',
      body: msg,
      sound: true, // 🔔 usa o som padrão do sistema
    },
    trigger: null, // dispara imediatamente
  });
}

    } catch (err: any) {
      console.error('Erro ao carregar notificações:', err.message || err);
    }
  }

  // Atualizar notificações a cada 10s
  useEffect(() => {
    if (!usuario) return;

    carregarNotificacoes(); // primeira vez

    const intervalo = setInterval(() => {
      carregarNotificacoes();
    }, 10000);

    return () => clearInterval(intervalo);
  }, [usuario]);

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      const agora = new Date();
      const hora = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setHoraAtual(hora);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!usuario) {
    return (
      <View style={{ backgroundColor: '#163029', padding: 20 }}>
        <Text style={{ color: '#d1ccbd', fontSize: 14 }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <>
      <View className="flex flex-row bg-[#163029] justify-between items-center w-full h-20 px-4">
        <DrawerToggleButton tintColor="#d1ccbd" />

        {/* Usuário logado */}
        <View className="flex-row items-center space-x-2">
          <Ionicons name="person-circle-outline" size={20} color="#d1ccbd" />
          <Text
            style={{
              fontFamily: 'Sina-Nova-Regular',
              fontSize: 16,
              color: '#d1ccbd',
            }}
          >
            {usuario.dsPessoa}
          </Text>
        </View>

        {/* Relógio + Ícones */}
        <View className="flex-row items-center gap-4">
          <Text
            style={{
              color: '#d1ccbd',
              fontFamily: 'Sina-Nova-Bold',
              fontSize: 14,
            }}
          >
            {horaAtual}
          </Text>

          <Pressable
            className="rounded-full flex justify-center items-center p-2"
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="notifications-outline" size={22} color="#d1ccbd" />
            {notificacoesNaoLidas > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  backgroundColor: 'red',
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                }}
              />
            )}
          </Pressable>

          {onPrint && (
            <Pressable
              className="rounded-full flex justify-center items-center p-2"
              onPress={onPrint}
            >
              <Feather name="camera" size={22} color="#d1ccbd" />
            </Pressable>
          )}

          <Pressable
            className="rounded-full flex justify-center items-center p-2"
            onPress={handleLogout}
          >
            <Feather name="log-out" size={22} color="#d1ccbd" />
          </Pressable>
        </View>
      </View>

      <NotificacaoModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          carregarNotificacoes();
        }}
      />
    </>
  );
}
