// app/index.tsx
import Input from '@/components/inputLogin'
import React, { useEffect } from 'react'
import { StatusBar, View, Platform } from 'react-native'
import * as Animatable from 'react-native-animatable'
import { useRouter, Stack } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    async function configurarCanal() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notificações padrão',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default', // 🔔 garante som
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        })
      }
    }

    async function verificarLogin() {
      const json = await AsyncStorage.getItem('@user')
      if (json) {
        const usuario = JSON.parse(json)
        const loginDate = new Date(usuario.loginTimestamp)
        const hoje = new Date()

        const mesmoDia =
          loginDate.getFullYear() === hoje.getFullYear() &&
          loginDate.getMonth() === hoje.getMonth() &&
          loginDate.getDate() === hoje.getDate()

        if (mesmoDia) {
          router.replace('/home')
        } else {
          await AsyncStorage.removeItem('@user')
        }
      }
    }

    configurarCanal()
    verificarLogin()
  }, [])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className='flex-1 bg-[#163029]'>
        <StatusBar backgroundColor={"#d1ccbd"} barStyle={"light-content"} />
        <View className='flex-3 justify-center items-center mt-28'>
          <Animatable.Text
            animation={'fadeInLeft'}
            delay={500}
            className="text-3xl mb-8"
            style={{ fontFamily: 'Sina-Nova-Bold', color: '#d1ccbd' }}
          >
            Bem-vindo(a)
          </Animatable.Text>
        </View>
        <Animatable.View
          animation={'fadeInUp'}
          className='rounded-tl-3xl rounded-tr-3xl'
          style={{ backgroundColor: '#163029', flex: 1 }}
        >
          <Input />
        </Animatable.View>
      </View>
    </>
  )
}
