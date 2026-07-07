import { useFonts } from 'expo-font';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/toast';
import { Image, Text, View, Pressable } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import '../src/styles/global.css';
import { useUser, UserProvider } from '@/contexts/UserContext';

function CustomDrawerContent(props: any) {
  const { usuario } = useUser();

  const opcoes = [
    { name: 'home', rota: '/home', label: 'Início', icon: 'home' },
    { name: 'separacaocomum', rota: '/separacaocomum', label: 'Separação', icon: 'play-circle' },
    { name: 'busca', rota: '/busca', label: 'Buscar Item', icon: 'search' },
    { name: 'transferencia', rota: '/transferencia', label: 'Transferência', icon: 'repeat' },
    { name: 'reporvarejo', rota: '/reporvarejo', label: 'Repor Varejo', icon: 'shopping-cart' },
    { name: 'criapalete', rota: '/criapalete', label: 'Criar Palete', icon: 'package' },
    { name: 'reposicao', rota: '/reposicao', label: 'Reposição', icon: 'upload' },
    { name: 'locais', rota: '/locais', label: 'Localização', icon: 'map-pin' },
    { name: 'calculadora', rota: '/calculadora', label: 'Calculadora', icon: 'cpu' },
    { name: 'locaisatacado', rota: '/locaisatacado', label: 'Atacado', icon: 'map-pin' },
    { name: 'reporatacado', rota: '/reporatacado', label: 'Recebimento', icon: 'upload' },
  ];

  const rotasPermitidas = usuario?.rotasPermitidas || [];

  const opcoesFiltradas = opcoes.filter(
    (item) => item.name === 'home' || rotasPermitidas.includes(item.rota)
  );

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
    >
      <View>
        {/* Cabeçalho */}
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Image
            source={require('../assets/images/logohorizontal-verde.png')}
            style={{ width: 150, height: 50, resizeMode: 'contain', marginBottom: 12 }}
          />
          {usuario && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Ionicons name="person-circle-outline" size={18} color="#163029" style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: 'Sina-Nova-Bold', color: '#163029', fontSize: 16 }}>
                  {usuario.dsPessoa}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Ionicons name="briefcase-outline" size={16} color="#2F4B44" style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#2F4B44', fontSize: 14 }}>
                  {usuario.dsSetor}
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Ionicons name="business-outline" size={16} color="#2F4B44" style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#2F4B44', fontSize: 14 }}>
                  {usuario.noDiretoria}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Opções */}
        {opcoesFiltradas.map((item) => (
          <Pressable
            key={item.name}
            onPress={() => props.navigation.navigate(item.name)}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
          >
            <Feather name={item.icon as any} size={20} color="#2F4B44" style={{ marginRight: 12 }} />
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#2F4B44' }}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Rodapé */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#163029' }}>
          © Avatim - Todos os direitos reservados
        </Text>
      </View>
    </DrawerContentScrollView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Sina-Nova': require('../assets/fonts/SinaNova-Bold.otf'),
    'Sina-Nova-Regular': require('../assets/fonts/SinaNova-Regular.otf'),
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('transparent');
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UserProvider>
          <StatusBar hidden translucent />
          <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
              headerShown: false,
              swipeEnabled: false,
              drawerActiveBackgroundColor: '#163029',
              drawerInactiveBackgroundColor: 'transparent',
              drawerInactiveTintColor: '#2F4B44',
              drawerActiveTintColor: '#d1ccbd',
              drawerHideStatusBarOnOpen: true,
              drawerStyle: {
                backgroundColor: '#d1ccbd',
                paddingTop: 32,
                width: '60%',
              },
              drawerLabelStyle: {
                fontFamily: 'Sina-Nova-Bold',
                fontSize: 16,
                marginLeft: -8,
              },
            }}
          >
            <Drawer.Screen name="index" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen
              name="home"
              options={{
                drawerLabel: 'Início',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="home" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
            <Drawer.Screen
              name="separacaocomum"
              options={{
                drawerLabel: 'Separação',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="list" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
            <Drawer.Screen
              name="busca"
              options={{
                drawerLabel: 'Buscar Item',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="search" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
            <Drawer.Screen
              name="transferencia"
              options={{
                drawerLabel: 'Transferência',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="repeat" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
            <Drawer.Screen
              name="reporvarejo"
              options={{
                drawerLabel: 'Repor Varejo',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="shopping-cart" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
            <Drawer.Screen
              name="criapalete"
              options={{
                drawerLabel: 'Criar Paletes',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="package" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
            <Drawer.Screen
              name="reposicao"
              options={{
                drawerLabel: 'Reposição',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="upload" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
            <Drawer.Screen
              name="locais"
              options={{
                drawerLabel: 'Localização',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="map-pin" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
            <Drawer.Screen
              name="calculadora"
              options={{
                drawerLabel: 'Calculadora',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="cpu" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
              <Drawer.Screen
              name="locaisatacado"
              options={{
                drawerLabel: 'Locais Atacado',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="map-pin" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
             <Drawer.Screen
              name="reporatacado"
              options={{
                drawerLabel: 'Repor Atacado',
                drawerIcon: ({ focused, size }) => (
                  <Feather name="upload" size={size} color={focused ? '#d1ccbd' : '#2F4B44'} />
                ),
              }}
            />
          </Drawer>
          <Toast config={toastConfig} />
        </UserProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
