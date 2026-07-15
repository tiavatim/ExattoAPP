import React, { useEffect, useState } from 'react';
import { BackHandler, StatusBar, View } from 'react-native';
import DrawerSceneWrapper from '@/components/drawer';
import Header from '@/components/header';
import BalancasHub, { BalancasView } from '@/components/BalancasHub';
import AcabamentoView from '@/components/AcabamentoView';
import RelatoriosView from '@/components/RelatoriosView';
import RastreabilidadeView from '@/components/RastreabilidadeView';
import ConfiguracoesView from '@/components/ConfiguracoesView';

export default function BalancasScreen() {
  const [view, setView] = useState<BalancasView>('hub');

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view !== 'hub') {
        setView('hub');
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [view]);

  return (
    <DrawerSceneWrapper>
      <View style={{ flex: 1, backgroundColor: '#d1ccbd' }}>
        <StatusBar backgroundColor="#163029" barStyle="light-content" />
        <Header />

        {view === 'hub'             && <BalancasHub          onNavigate={setView} />}
        {view === 'acabamento'      && <AcabamentoView       onBack={() => setView('hub')} />}
        {view === 'relatorios'      && <RelatoriosView       onBack={() => setView('hub')} />}
        {view === 'rastreabilidade' && <RastreabilidadeView  onBack={() => setView('hub')} />}
        {view === 'configuracoes'   && <ConfiguracoesView    onBack={() => setView('hub')} />}
      </View>
    </DrawerSceneWrapper>
  );
}
