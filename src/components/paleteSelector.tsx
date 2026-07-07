import React, { useEffect, useState } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import { LocalDetalhado } from 'src/interfaces/localDetalhadoInterface';
import localService from 'src/services/localService';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';


interface Props {
  paleteSelecionado: string | null;
  setPaleteSelecionado: (value: string | null) => void;
  setListaCompleta: (paletes: LocalDetalhado[]) => void;
  listaPaletes?: LocalDetalhado[]; // <-- NOVO
}

export default function PaleteSelector({
  paleteSelecionado,
  setPaleteSelecionado,
  setListaCompleta,
  listaPaletes = [],
}: Props) {
  const [paletes, setPaletes] = useState<LocalDetalhado[]>([]);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await localService.getLocaisDetalhadoPaletes();
        const validos = dados.filter((p) => !!p.Code);
        setPaletes(validos);
        setListaCompleta(validos);
      } catch (err: any) {
        Toast.show({
          type: 'error',
          text1: 'Erro ao buscar paletes',
          text2: err.message || 'Tente novamente.',
        });
      }
    }

    // Se a lista externa não for passada, buscar via API
    if (!listaPaletes.length) {
      carregar();
    } else {
      setPaletes(listaPaletes);
    }
  }, [listaPaletes]); // <-- ATUALIZA se a lista mudar

  useEffect(() => {
    setValue(paleteSelecionado);
  }, [paleteSelecionado]);

  return (
    <View style={{ zIndex: 3000, marginBottom: 16 }}>
      <DropDownPicker
        open={open}
        setOpen={setOpen}
        value={value}
        setValue={(callback) => {
          const newValue = callback(value);
          setValue(newValue);
          setPaleteSelecionado(newValue);
        }}
        searchable
        searchPlaceholder="Digite ou bip o código do palete"
        placeholder="Selecione um palete"
        listMode="MODAL"
        items={paletes.map((p) => ({
          label: `${p.Warehouse_Code} || ${p.Zone_Code}  || ${p.Code}`,
          value: p.Code,
          key: p.Code,
        }))}
        style={{
          backgroundColor: '#fff',
          borderColor: '#163029',
        }}
        textStyle={{
          fontFamily: 'Sina-Nova-Regular',
          fontSize: 16,
          color: '#163029',
        }}
        onChangeSearchText={(texto) => {
          const resultado = paletes.find((p) =>
            p.Code.toLowerCase() === texto.trim().toLowerCase()
          );
          if (resultado) {
            setValue(resultado.Code);
            setPaleteSelecionado(resultado.Code);
            setOpen(false);
          }
        }}
      />
    </View>
  );
}
