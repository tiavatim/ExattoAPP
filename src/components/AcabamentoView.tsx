import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import LinhaCard from '@/components/LinhaCard';
import LinhaDetalheView from '@/components/LinhaDetalheView';
import { FaixaModal } from '@/components/ConfiguracoesView';
import ModalIniciarSessao from '@/components/ModalIniciarSessao';
import ti400Service from '@/services/ti400Service';
import { DashboardLinha, FaixaPeso, OpData, ProdutoItem } from '@/interfaces/ti400Interface';

const POLL_MS = 3000;

interface FaixaPendente {
  lineId: string;
  lote: number;
  idColaborador: number;
  produto: ProdutoItem;
  faixa: FaixaPeso;
}

interface Props {
  onBack: () => void;
}

export default function AcabamentoView({ onBack }: Props) {
  const [linhas, setLinhas]         = useState<DashboardLinha[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingId, setLoadingId]   = useState<string | null>(null);

  const [modalLinhaId,   setModalLinhaId]   = useState<string | null>(null);
  const [modalLinhaNome, setModalLinhaNome] = useState('');
  const [modalLoading,   setModalLoading]   = useState(false);
  const [faixaPendente,  setFaixaPendente]  = useState<FaixaPendente | null>(null);

  const [selectedLinha, setSelectedLinha] = useState<{ id: string; nome: string } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // BackHandler: quando dentro de LinhaDetalheView, volta para a lista
  useEffect(() => {
    if (!selectedLinha) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedLinha(null);
      return true;
    });
    return () => handler.remove();
  }, [selectedLinha]);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      setLinhas(await ti400Service.getDashboard());
    } catch (err: any) {
      if (!silencioso)
        Toast.show({ type: 'error', text1: 'Erro ao carregar linhas', text2: err.message });
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLinha) {
      // Pausa o poll enquanto está no detalhe (o detalhe tem o seu próprio poll)
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    carregar();
    pollRef.current = setInterval(() => carregar(true), POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedLinha, carregar]);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  };

  function abrirModal(linhaId: string) {
    const linha = linhas.find(l => l.linhaId === linhaId);
    setModalLinhaId(linhaId);
    setModalLinhaNome(linha?.linhaNome ?? '');
  }

  function abrirDetalhe(linhaId: string) {
    const linha = linhas.find(l => l.linhaId === linhaId);
    setSelectedLinha({ id: linhaId, nome: linha?.linhaNome ?? '' });
  }

  async function confirmarIniciar(lote: number, idColaborador: number) {
    if (!modalLinhaId) return;
    setModalLoading(true);
    try {
      const op = await ti400Service.getOp(lote);
      const faixa = await ti400Service.getFaixaPorProduto(op.idProduto);
      if (!faixa) {
        const produto = produtoFromOp(op);
        setFaixaPendente({
          lineId: modalLinhaId,
          lote,
          idColaborador,
          produto,
          faixa: novaFaixa(produto.idProduto),
        });
        setModalLinhaId(null);
        return;
      }

      await ti400Service.iniciarSessao(modalLinhaId, { lote, idColaborador });
      Toast.show({ type: 'success', text1: 'Sessão iniciada' });
      setModalLinhaId(null);
      await carregar(true);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Erro desconhecido';
      Toast.show({ type: 'error', text1: 'Erro ao iniciar sessão', text2: msg });
    } finally {
      setModalLoading(false);
    }
  }

  async function salvarFaixaPendente(faixa: FaixaPeso) {
    if (!faixaPendente) return;
    try {
      await ti400Service.upsertFaixa(faixa);
      await ti400Service.iniciarSessao(faixaPendente.lineId, {
        lote: faixaPendente.lote,
        idColaborador: faixaPendente.idColaborador,
      });
      Toast.show({ type: 'success', text1: 'Faixa cadastrada', text2: 'Sessão iniciada em seguida.' });
      setFaixaPendente(null);
      await carregar(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao salvar faixa', text2: err.response?.data?.error ?? err.message });
    }
  }

  async function handleCancelar(linhaId: string) {
    setLoadingId(linhaId);
    try {
      await ti400Service.cancelarSessao(linhaId);
      Toast.show({ type: 'success', text1: 'Sessão cancelada' });
      await carregar(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao cancelar', text2: err.message });
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRetry(linhaId: string) {
    setLoadingId(linhaId);
    try {
      await ti400Service.retrySessao(linhaId);
      Toast.show({ type: 'success', text1: 'Sessão retomada' });
      await carregar(true);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Erro desconhecido';
      Toast.show({ type: 'error', text1: 'Erro ao fazer retry', text2: msg });
    } finally {
      setLoadingId(null);
    }
  }

  // Se estiver dentro de uma linha, renderiza o detalhe
  if (selectedLinha) {
    return (
      <LinhaDetalheView
        linhaId={selectedLinha.id}
        linhaNome={selectedLinha.nome}
        onBack={() => setSelectedLinha(null)}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Sub-header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
      }}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Feather name="arrow-left" size={22} color="#163029" />
        </Pressable>
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 20, color: '#163029' }}>
          Acabamento
        </Text>
        {!loading && (
          <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 13, color: '#2F4B44', marginLeft: 'auto' }}>
            {linhas.length} {linhas.length === 1 ? 'linha' : 'linhas'}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#163029" />
          <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#163029', marginTop: 12 }}>
            Conectando às linhas...
          </Text>
        </View>
      ) : (
        <FlatList
          data={linhas}
          keyExtractor={(item) => item.linhaId}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <LinhaCard
              linha={item}
              loadingId={loadingId}
              onIniciar={abrirModal}
              onCancelar={handleCancelar}
              onRetry={handleRetry}
              onVer={abrirDetalhe}
            />
          )}
          ListEmptyComponent={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="inbox" size={40} color="#9ca3af" />
              <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#163029', marginTop: 12 }}>
                Nenhuma linha cadastrada.
              </Text>
            </View>
          )}
        />
      )}

      <ModalIniciarSessao
        visible={modalLinhaId !== null}
        linhaNome={modalLinhaNome}
        loading={modalLoading}
        onConfirmar={confirmarIniciar}
        onCancelar={() => setModalLinhaId(null)}
      />

      {faixaPendente && (
        <FaixaModal
          titulo="Cadastrar Faixa da OP"
          faixa={faixaPendente.faixa}
          produtos={[faixaPendente.produto]}
          produtoBloqueado
          onSalvar={salvarFaixaPendente}
          onCancelar={() => setFaixaPendente(null)}
        />
      )}
    </View>
  );
}

function produtoFromOp(op: OpData): ProdutoItem {
  return {
    idProduto: op.idProduto,
    cdProduto: op.cdProduto,
    dsProduto: op.dsProduto,
  };
}

function novaFaixa(idProduto: number): FaixaPeso {
  return {
    id: 0,
    idProduto,
    pesoAlvo: 0,
    verdeMin: 0,
    verdeMax: 0,
    amarelaMin: 0,
    amarelaMax: 0,
  };
}
