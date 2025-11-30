import axios, { AxiosHeaders } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../config/env';

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
    config.headers = headers;
  } catch {}
  return config;
});

export default http;
