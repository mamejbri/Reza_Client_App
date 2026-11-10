import axios, { AxiosHeaders } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../config/env';
import { CONTENT_LANG_HEADER, getContentLanguage } from '../i18n/contentLanguage';

const TOKEN_KEY = 'token';

const http = axios.create({
  baseURL: API.BASE_URL,
  timeout: 15000,
});

http.interceptors.request.use(async (config) => {
  try {
    const headers = AxiosHeaders.from(config.headers || {});
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    else if (headers.has('Authorization')) headers.delete('Authorization');
    // the backend translates prestations, descriptions, reviews... into the UI language
    if (!headers.has(CONTENT_LANG_HEADER)) headers.set(CONTENT_LANG_HEADER, getContentLanguage());
    config.headers = headers;
  } catch {}
  return config;
});

export default http;
