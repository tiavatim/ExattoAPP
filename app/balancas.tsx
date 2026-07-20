import React, { useEffect, useState } from 'react';
import { BackHandler, StatusBar, View } from 'react-native';
import DrawerSceneWrapper from '@/components/drawer';
import Header from '@/components/header';
import BalancasHub, { BalancasView } from '@/components/BalancasHub';
import AcabamentoView from '@/components/AcabamentoView';
import RelatoriosView from '@/components/RelatoriosView';
import RastreabilidadeView from '@/components/RastreabilidadeView';
import FaixasView from '@/components/FaixasView';
import ConfiguracoesView from '@/components/ConfiguracoesView';
import { useUser } from '@/contexts/UserContext';

export default function BalancasScreen() {
  const [view, setView] = useState<BalancasView>('hub');
  const { temAcesso } = useUser();
  const podeAcessarConfiguracoes =
    temAcesso('/balancas/configuracoes/linhas') ||
    temAcesso('/balancas/configuracoes/impressoras') ||
    temAcesso('/balancas/configuracoes/gerais') ||
    temAcesso('/balancas/configuracoes/sincronizacao') ||
    temAcesso('/balancas/configuracoes/impressao');

  function navegar(destino: BalancasView) {
    if (destino === 'configuracoes' && !podeAcessarConfiguracoes) {
      setView('hub');
      return;
    }
    setView(destino);
  }

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

        {view === 'hub'             && <BalancasHub          onNavigate={navegar} />}
        {view === 'acabamento'      && <AcabamentoView       onBack={() => setView('hub')} />}
        {view === 'relatorios'      && <RelatoriosView       onBack={() => setView('hub')} />}
        {view === 'rastreabilidade' && <RastreabilidadeView  onBack={() => setView('hub')} />}
        {view === 'faixas'          && <FaixasView           onBack={() => setView('hub')} />}
        {view === 'configuracoes' && podeAcessarConfiguracoes && <ConfiguracoesView onBack={() => setView('hub')} />}
      </View>
    </DrawerSceneWrapper>
  );
}
