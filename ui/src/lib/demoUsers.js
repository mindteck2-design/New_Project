/** Seeded demo accounts for role/user switching (password from config SEED_PASSWORD). */
export const DEMO_PASSWORD = 'Passw0rd!'

export const DEMO_USERS = [
  { username: 'admin', displayName: 'AMMS Admin', roles: ['ADMIN', 'PROGRESS', 'INSPECTION', 'QA', 'STORES', 'CUSTOMER', 'SHOP_MANAGER'] },
  { username: 'progress.user', displayName: 'Progress Officer', roles: ['PROGRESS'] },
  { username: 'inspection.user', displayName: 'Inspector', roles: ['INSPECTION'] },
  { username: 'qa.user', displayName: 'QA Officer', roles: ['QA'] },
  { username: 'stores.user', displayName: 'Stores Officer', roles: ['STORES'] },
  { username: 'customer.user', displayName: 'Customer Rep', roles: ['CUSTOMER'] },
  { username: 'shop.user', displayName: 'Shop Manager', roles: ['SHOP_MANAGER'] },
]

export const ROLE_LABELS = {
  PROGRESS: 'Progress',
  INSPECTION: 'Inspection',
  QA: 'QA / ORDAQA',
  STORES: 'Stores',
  CUSTOMER: 'Customer',
  SHOP_MANAGER: 'Shop Manager',
  ADMIN: 'System Administrator',
}
