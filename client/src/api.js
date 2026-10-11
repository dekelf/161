import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3001/api' });

export const employees = {
  list: () => api.get('/employees'),
  get: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
};

export const forms = {
  list: (params) => api.get('/forms', { params }),
  get: (id) => api.get(`/forms/${id}`),
  create: (data) => api.post('/forms', data),
  update: (id, data) => api.patch(`/forms/${id}`, data),
  sign: (id, data) => api.post(`/forms/${id}/sign`, data),
};

export const documents = {
  upload: (form_id, file, doc_type) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_type', doc_type || 'other');
    return api.post(`/documents/${form_id}/upload`, fd);
  },
  download: (doc_id) => `http://localhost:3001/api/documents/file/${doc_id}`,
  delete: (doc_id) => api.delete(`/documents/file/${doc_id}`),
};

export default api;
