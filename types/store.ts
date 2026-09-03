export type PackSize = 1 | 2 | 3

export interface Product {
  id: number
  productId: string
  productName: string
  shortDescription: string
  description: string
  images: string[]
  pack1Price: number
  pack2Price: number
  pack3Price: number
  isActive: boolean
  currency: string
  features: string[]
  metaPixel: string | null
  unitPrice: number
  category: string
  country: string
  featured: boolean
  soldCount: number
  createdAt: Date
  updatedAt: Date
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: number
  orderId: string
  customerName: string
  primaryPhone: string
  alternativePhone: string | null
  deliveryAddress: string
  city: string
  productName: string
  productId: string
  productCountry: string
  package: string
  quantity: number
  totalPrice: number
  currency: string
  orderDate: Date
  status: OrderStatus
  deliveryDate: string
  notes: string | null
  keverdEventId: string | null
  keverdVisitorId: string | null
  keverdAction: string | null
  keverdRiskScore: number | null
  keverdTimesSeen: number | null
  keverdErrorStage: string | null
  keverdError: string | null
  createdAt: Date
  updatedAt: Date
}

export type EventType = 
  | 'page_view' 
  | 'product_view' 
  | 'checkout_open' 
  | 'form_started' 
  | 'field_filled' 
  | 'order_submitted'

export interface OrderEvent {
  id: number
  visitorId: string
  eventType: EventType
  productId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export interface Admin {
  id: number
  email: string
  totpSecret: string | null
  isSetupComplete: boolean
  createdAt: Date
}

export interface AdminSession {
  id: string
  adminId: number
  expiresAt: Date
  createdAt: Date
}

export interface SiteSetting {
  id: number
  key: string
  value: unknown
  updatedAt: Date
}

export interface CreateOrderInput {
  customerName: string
  primaryPhone: string
  alternativePhone?: string
  deliveryAddress: string
  city: string
  productId: string
  package: string
  quantity: number
  deliveryDate: string
  keverdEventId?: string
  keverdVisitorId?: string
  keverdErrorStage?: string
  keverdError?: string
}

export type DescriptionBlock = {
  type: 'md'
  html: string
} | {
  type: 'img'
  src: string
  alt: string
}
