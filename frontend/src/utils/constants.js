export const ROLES = ['ADMIN', 'FLEET_MANAGER', 'DRIVER', 'VIEWER'];

export const VEHICLE_STATUS_COLORS = {
  AVAILABLE: 'teal',
  ON_TRIP: 'beacon',
  IN_SHOP: 'violet',
  RETIRED: 'muted',
};

export const DRIVER_STATUS_COLORS = {
  AVAILABLE: 'teal',
  ON_TRIP: 'beacon',
  OFF_DUTY: 'muted',
  SUSPENDED: 'danger',
};

export const TRIP_STATUS_COLORS = {
  DRAFT: 'muted',
  DISPATCHED: 'beacon',
  COMPLETED: 'teal',
  CANCELLED: 'danger',
};

export const MAINTENANCE_STATUS_COLORS = {
  OPEN: 'beacon',
  CLOSED: 'teal',
};

export const CAN_WRITE_ROLES = ['ADMIN', 'FLEET_MANAGER'];
export const CAN_ADMIN_ROLES = ['ADMIN'];
