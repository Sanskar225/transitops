import client from './client';

/** Builds standard list/get/create/update calls for a REST resource. */
function makeResource(path) {
  return {
    list: (params) => client.get(path, { params }).then((r) => r.data),
    get: (id) => client.get(`${path}/${id}`).then((r) => r.data),
    create: (body) => client.post(path, body).then((r) => r.data),
    update: (id, body) => client.patch(`${path}/${id}`, body).then((r) => r.data),
    action: (id, action, body) => client.post(`${path}/${id}/${action}`, body || {}).then((r) => r.data),
  };
}

export const vehiclesApi = makeResource('/vehicles');
export const driversApi = makeResource('/drivers');
export const tripsApi = makeResource('/trips');
tripsApi.dispatch = (id) => client.post(`/trips/${id}/dispatch`, {}, { headers: { 'Idempotency-Key': crypto.randomUUID() } }).then((r) => r.data);
tripsApi.complete = (id, body) => client.post(`/trips/${id}/complete`, body, { headers: { 'Idempotency-Key': crypto.randomUUID() } }).then((r) => r.data);
tripsApi.cancel = (id, reason) => client.post(`/trips/${id}/cancel`, { reason }).then((r) => r.data);

export const maintenanceApi = makeResource('/maintenance');
export const fuelApi = makeResource('/fuel-logs');
export const expensesApi = makeResource('/expenses');
export const usersApi = makeResource('/users');

export const dispatchApi = {
  recommend: (body) => client.post('/dispatch/recommend', body).then((r) => r.data),
};

export const analyticsApi = {
  dashboard: () => client.get('/analytics/dashboard').then((r) => r.data),
  fleetUtilization: () => client.get('/analytics/fleet-utilization').then((r) => r.data),
  fuelEfficiency: () => client.get('/analytics/fuel-efficiency').then((r) => r.data),
  operationalCost: () => client.get('/analytics/operational-cost').then((r) => r.data),
  roi: () => client.get('/analytics/roi').then((r) => r.data),
  idleVehicles: (days) => client.get('/analytics/idle-vehicles', { params: { days } }).then((r) => r.data),
  costTrends: (months) => client.get('/analytics/cost-trends', { params: { months } }).then((r) => r.data),
  predictiveMaintenance: () => client.get('/analytics/predictive-maintenance').then((r) => r.data),
  exportTripsCsvUrl: () => `${client.defaults.baseURL}/analytics/export/trips.csv`,
};

export const auditApi = {
  list: (params) => client.get('/audit-logs', { params }).then((r) => r.data),
};

export const documentsApi = {
  list: (vehicleId) => client.get(`/vehicles/${vehicleId}/documents`).then((r) => r.data),
  upload: (vehicleId, file) => {
    const form = new FormData();
    form.append('file', file);
    return client.post(`/vehicles/${vehicleId}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  remove: (vehicleId, docId) => client.delete(`/vehicles/${vehicleId}/documents/${docId}`).then((r) => r.data),
};
