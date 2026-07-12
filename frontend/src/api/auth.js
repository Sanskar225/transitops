import client from './client';

export const authApi = {
  register: (body) => client.post('/auth/register', body).then((r) => r.data),
  login: (body) => client.post('/auth/login', body).then((r) => r.data),
  refresh: () => client.post('/auth/refresh', {}).then((r) => r.data),
  logout: () => client.post('/auth/logout', {}).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
};
