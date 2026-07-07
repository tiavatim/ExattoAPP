import React, { useEffect, useState } from 'react';
import { View, Pressable, Modal, Text } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface Item {
  label: string;
  value: string;
  Ds_UrlImage?: string;
}

interface Props {
  dados: Item[];
  valorSelecionado: string;
  aoSelecionar: (valor: string) => void;
  label?: string;
  autoAvancar?: () => void;
}

export default function BuscaDropdown({
  dados = [],
  valorSelecionado,
  aoSelecionar,
  label = 'Selecione',
  autoAvancar,
}: Props) {
  const [abrir, setAbrir] = useState(false);
  const [valor, setValor] = useState<string>(valorSelecionado);
  const [itens, setItens] = useState<Item[]>(dados);
  // Mantemos uma cópia do texto de pesquisa para a lógica de autoAvancar
  const [textoPesquisa, setTextoPesquisa] = useState(''); 

  const [permissao, pedirPermissao] = useCameraPermissions();
  const [scannerAtivo, setScannerAtivo] = useState(false);

  // Garante que o valor e os itens sejam sincronizados com as props
  useEffect(() => {
    setValor(valorSelecionado);
  }, [valorSelecionado]);

  useEffect(() => {
    setItens(dados);
  }, [dados]);

  // Função centralizada para a lógica de Auto-Avanço e Seleção
  // Esta função agora é chamada dentro da useEffect
  const handleSelectionAndAutoAdvance = (resultados: Item[], texto: string) => {
      // Esta lógica só deve rodar se o dropdown estiver ABERTO
      if (!abrir) return;
      
      const palavrasPesquisa = texto
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      // 1. Encontra o item UNICO que corresponde *exatamente* à lógica de pesquisa
      // Se a lista de itens filtrada (resultados) tiver apenas 1 item, auto-selecionamos.
      if (palavrasPesquisa.length > 0 && resultados.length === 1) {
        const selecionado = resultados[0].value;
        


        setValor(selecionado);
        aoSelecionar(selecionado);
        setAbrir(false);

        if (autoAvancar) setTimeout(() => autoAvancar(), 200);
      }
  }
  
  // UseEffect para monitorar o estado 'itens' e o 'textoPesquisa'
  // e executar a lógica de auto-avanço *após* a filtragem
  useEffect(() => {
    handleSelectionAndAutoAdvance(itens, textoPesquisa);
  }, [itens, textoPesquisa, abrir]);
  

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScannerAtivo(false);

    // ... (lógica de scanner mantida, pois está correta para esta finalidade)
    setValor(data);
    const resultados = dados.filter((item) =>
      item.label.toLowerCase().includes(data.toLowerCase())
    );

    if (resultados.length === 1) {
      const selecionado = resultados[0].value;
      setValor(selecionado);
      aoSelecionar(selecionado);
      setAbrir(false);
      if (autoAvancar) setTimeout(() => autoAvancar(), 200);
    } else {
      if (!dados.find((i) => i.value === data)) {
        const novoItem = { label: data, value: data };
        setItens((prev) => [...prev, novoItem]); // Adiciona na lista visual
        // IMPORTANTE: Se você precisar que o novo item fique na lista de dados original,
        // precisará passá-lo para a prop 'dados' ou gerenciá-lo fora deste componente.
      }
      aoSelecionar(data);
      setAbrir(false);
    }
  };

  if (!permissao) return <Text>Solicitando permissão da câmera...</Text>;

  if (!permissao.granted) {
    return (
      <View>
        <Text style={{ marginBottom: 8 }}>Precisamos da sua permissão para usar a câmera.</Text>
        <Pressable
          onPress={pedirPermissao}
          style={{ backgroundColor: '#163029', padding: 10, borderRadius: 6 }}
        >
          <Text style={{ color: '#fff' }}>Conceder permissão</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <View style={{ flex: 1 }}>
        <DropDownPicker
          open={abrir}
          setOpen={setAbrir}
          value={valor}
          setValue={(callback) => {
            const novoValor =
              typeof callback === 'function' ? callback(valor) : callback;
            setValor(novoValor);
            aoSelecionar(novoValor);
          }}
          // O DropDownPicker usa o estado 'itens'
          items={itens.map((item) => ({
            label: item.label,
            value: item.value,
          }))}
          searchable={true}
          searchPlaceholder="Digite ou bip"
          placeholder={label}
          listMode="MODAL"
          // O coração da correção: filtra a lista 'itens' ao digitar
          onChangeSearchText={(texto) => {
            setTextoPesquisa(texto);
            
            const palavras = texto.toLowerCase().trim().split(/\s+/).filter(Boolean);

            if (palavras.length === 0) {
              setItens(dados); // Se o campo estiver vazio, mostra todos os dados originais
              return;
            }

            // Realiza a filtragem flexível nos DADOS ORIGINAIS
            const filtrados = dados.filter((item) => {
              const labelLower = item.label.toLowerCase();
              return palavras.every((p) => labelLower.includes(p));
            });
            
            // ATUALIZA o estado 'itens' que o DropDownPicker renderiza
            setItens(filtrados);
          }}
          zIndex={3000}
          zIndexInverse={1000}
          style={{
            backgroundColor: '#fff',
            borderColor: '#163029',
            height: 50,
          }}
          textStyle={{
            fontFamily: 'Sina-Nova-Regular',
            fontSize: 16,
            color: '#163029',
          }}
        />
      </View>

      <Pressable
        onPress={() => setScannerAtivo(true)}
        style={{
          height: 50,
          width: 50,
          marginLeft: 8,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#163029',
          borderRadius: 6,
        }}
      >
        <Ionicons name="camera" size={22} color="#fff" />
      </Pressable>

      <Modal visible={scannerAtivo} animationType="slide">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'code128', 'ean13', 'upc_a'],
          }}
          onBarcodeScanned={handleBarCodeScanned}
        />

        <Pressable
          onPress={() => setScannerAtivo(false)}
          style={{
            position: 'absolute',
            bottom: 40,
            alignSelf: 'center',
            padding: 12,
            backgroundColor: 'rgba(22,48,41,0.9)',
            borderRadius: 8,
          }}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </Modal>
    </View>
  );
}