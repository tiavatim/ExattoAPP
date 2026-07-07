import axios from "axios";

const ID_APLICACAO = 5;
const API_KEY = '1741A9475D4E5D6707E30465978C92248E04E8BD08795A1A8D2A7CDBEF8FEFE0';

const api = axios.create({
  baseURL: 'https://chartmenus.avatim.com.br/',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (!config.params) {
      config.params = {};
    }

    config.params['idAplicacao'] = ID_APLICACAO;
    config.params['apiKey'] = API_KEY;

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
