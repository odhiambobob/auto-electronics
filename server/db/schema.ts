import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, jsonb, pgEnum } from 'drizzle-orm/pg-core'

// Enums
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
export const eventTypeEnum = pgEnum('event_type', ['page_view', 'product_view', 'checkout_open', 'form_started', 'field_filled', 'order_submitted'])

// Products table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  productId: varchar('product_id', { length: 100 }).unique().notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  shortDescription: text('short_description').notNull(),
  description: text('description').notNull(),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  pack1Price: integer('pack1_price').notNull(),
  pack2Price: integer('pack2_price').notNull(),
  pack3Price: integer('pack3_price').notNull(),
  unitPrice: integer('unit_price').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).notNull().default('Kenya'),
  features: jsonb('features').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  featured: boolean('featured').notNull().default(false),
  soldCount: integer('sold_count').notNull().default(0),
  metaPixel: varchar('meta_pixel', { length: 255 }),
  currency: varchar('currency', { length: 10 }).notNull().default('KES'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Orders table
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderId: varchar('order_id', { length: 50 }).unique().notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  primaryPhone: varchar('primary_phone', { length: 50 }).notNull(),
  alternativePhone: varchar('alternative_phone', { length: 50 }),
  deliveryAddress: text('delivery_address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  productId: varchar('product_id', { length: 100 }).notNull(),
  productCountry: varchar('product_country', { length: 100 }).notNull().default('Kenya'),
  package: varchar('package', { length: 50 }).notNull(),
  quantity: integer('quantity').notNull(),
  totalPrice: integer('total_price').notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('KES'),
  orderDate: timestamp('order_date').notNull().defaultNow(),
  deliveryDate: date('delivery_date').notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Order events for dropoff tracking
export const orderEvents = pgTable('order_events', {
  id: serial('id').primaryKey(),
  visitorId: varchar('visitor_id', { length: 100 }).notNull(),
  eventType: eventTypeEnum('event_type').notNull(),
  productId: varchar('product_id', { length: 100 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Admin users
export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  totpSecret: varchar('totp_secret', { length: 255 }),
  isSetupComplete: boolean('is_setup_complete').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Admin sessions
export const adminSessions = pgTable('admin_sessions', {
  id: varchar('id', { length: 100 }).primaryKey(),
  adminId: integer('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Site settings
export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Type exports
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type OrderEvent = typeof orderEvents.$inferSelect
export type NewOrderEvent = typeof orderEvents.$inferInsert
export type Admin = typeof admins.$inferSelect
export type NewAdmin = typeof admins.$inferInsert
export type AdminSession = typeof adminSessions.$inferSelect
export type NewAdminSession = typeof adminSessions.$inferInsert
export type SiteSetting = typeof siteSettings.$inferSelect
export type NewSiteSetting = typeof siteSettings.$inferInsert
