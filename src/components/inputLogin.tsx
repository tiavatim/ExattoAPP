import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';
import LoginService from '../services/loginServices';
import { useUser } from '@/contexts/UserContext';

export default function InputLogin() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { setUsuario } = useUser();

  async function handleSignUp() {
    setIsLoading(true);

    if (!user.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Campos obrigatórios',
        text2: 'Por favor, preencha o usuário e a senha',
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await LoginService.Login(user, password);

      if (response?.status === 200 && response.data?.usuario) {
        const usuario = response.data.usuario;

        // Buscar rotas permitidas para o usuário logado
        const acessos = await LoginService.ObterUrlsExattoApp(usuario.id);
        const rotasPermitidas = acessos?.success && Array.isArray(acessos.data) ? acessos.data : [];

        const dadosCompletos = {
          ...usuario,
          loginTimestamp: Date.now(),
          rotasPermitidas,
        };

        await AsyncStorage.removeItem('@user');
        await AsyncStorage.setItem('@user', JSON.stringify(dadosCompletos));
        setUsuario(dadosCompletos);

        router.replace('/home');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Usuário não encontrado',
          text2: 'Verifique suas credenciais e tente novamente.',
        });
        setTimeout(() => router.push('/'), 1500);
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Ocorreu um erro desconhecido',
      });
      setTimeout(() => router.push('/home'), 1500);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="container mx-auto md:mx-auto">
      <Image
        className="top-2/4 mx-auto mb-auto"
        source={require('../../assets/images/logohorizontal-bege.png')}
        resizeMode="contain"
      />

      <View className="top-1/2">
        <View className="ms-8 me-8 top-2/4 flex flex-row border-b h-14 items-center gap-2" style={{ borderColor: '#d1ccbd' }}>
          <Feather name="user" size={24} color="#d1ccbd" />
          <TextInput
            className="w-full flex-1"
            style={{ color: '#d1ccbd', fontFamily: 'Sina-Nova-Regular' }}
            placeholder="Digite seu usuário"
            placeholderTextColor="#d1ccbd"
            onChangeText={setUser}
            keyboardType="default"
          />
        </View>

        <View className="ms-8 me-8 top-3/4 flex flex-row border-b h-14 items-center gap-2" style={{ borderColor: '#d1ccbd' }}>
          <Feather name="lock" size={24} color="#d1ccbd" />
          <TextInput
            className="w-full flex-1"
            style={{ color: '#d1ccbd', fontFamily: 'Sina-Nova-Regular' }}
            placeholder="Digite sua senha"
            placeholderTextColor="#d1ccbd"
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            keyboardType="default"
          />
          <Pressable className="flex-row items-center gap-1" onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#d1ccbd" />
            <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#d1ccbd' }}>
              {showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="top-3/4 mt-20">
        <Pressable
          style={{ backgroundColor: '#d1ccbd' }}
          className="ms-8 me-8 rounded-full flex-row h-14 justify-center items-center gap-2 mx-8"
          onPress={handleSignUp}
          disabled={isLoading}
        >
          {!isLoading && <Feather name="log-in" size={24} color="#163029" />}
          <Text className="text-3xl" style={{ fontFamily: 'Sina-Nova-Regular', color: '#163029' }}>
            {isLoading ? <ActivityIndicator size="large" color="#163029" /> : 'Entrar'}
          </Text>
        </Pressable>

        <View className="top-full flex-row justify-center items-center gap-2">
          <MaterialIcons name="copyright" size={24} color="#d1ccbd" />
          <Text className="text-lg" style={{ fontFamily: 'Sina-Nova-Regular', color: '#d1ccbd' }}>
            Todos os direitos reservados
          </Text>
        </View>
      </View>
    </View>
  );
}
