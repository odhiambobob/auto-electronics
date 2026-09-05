import { sql, gte, eq, and, desc, inArray } from 'drizzle-orm'

const eventTypes = ['page_view', 'product_view', 'checkout_open', 'form_started', 'field_filled', 'order_submitted'] as const
const fieldOrder = ['customerName', 'primaryPhone', 'alternativePhone', 'deliveryAddress', 'city', 'deliveryDate']

function stageRank(eventType?: string | null) {
  const index = eventTypes.indexOf(eventType as typeof eventTypes[number])
  return index === -1 ? 0 : index
}

export default defineSafeEventHandler(async (event) => {
  await requireAdmin(event)
  
  const query = getQuery(event)
  const days = parseInt(query.days as string) || 7
  
  const db = useDb()
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const funnelData = await Promise.all(
    eventTypes.map(async (eventType) => {
      const rows = await db
        .select({
          count: sql<number>`cast(count(distinct coalesce(${schema.orderEvents.keverdVisitorId}, ${schema.orderEvents.visitorId})) as int)`,
        })
        .from(schema.orderEvents)
        .where(and(
          eq(schema.orderEvents.eventType, eventType),
          gte(schema.orderEvents.createdAt, startDate),
        ))

      return {
        eventType,
        count: Number(rows[0]?.count ?? 0),
      }
    })
  )

  const funnel = funnelData.map((stage, index) => {
    const previousCount = index === 0 ? stage.count : funnelData[index - 1]?.count ?? 0
    const dropoffRate = previousCount > 0 
      ? Math.round(((previousCount - stage.count) / previousCount) * 100) 
      : 0
    
    return {
      ...stage,
      dropoffRate,
      conversionRate: funnelData[0]?.count
        ? Math.round((stage.count / funnelData[0].count) * 100)
        : 0,
    }
  })

  const snapshots = await db
    .select()
    .from(schema.visitorSnapshots)
    .where(gte(schema.visitorSnapshots.lastSeenAt, startDate))
    .orderBy(desc(schema.visitorSnapshots.lastSeenAt))
    .limit(400)

  const productIds = [...new Set(snapshots.map((row) => row.lastProductId).filter((id): id is string => Boolean(id)))]
  const products = productIds.length
    ? await db
      .select({
        productId: schema.products.productId,
        productName: schema.products.productName,
      })
      .from(schema.products)
      .where(inArray(schema.products.productId, productIds))
    : []
  const productNames = new Map(products.map((product) => [product.productId, product.productName]))

  const people = new Map<string, typeof snapshots>()
  for (const row of snapshots) {
    const key = row.keverdVisitorId || row.visitorId
    const list = people.get(key) || []
    list.push(row)
    people.set(key, list)
  }

  const journeys = [...people.entries()].map(([personId, rows]) => {
    const latest = rows.reduce((best, row) => (
      new Date(row.lastSeenAt).getTime() > new Date(best.lastSeenAt).getTime() ? row : best
    ), rows[0])
    const firstSeenAt = rows.reduce((earliest, row) => (
      new Date(row.firstSeenAt).getTime() < new Date(earliest).getTime() ? row.firstSeenAt : earliest
    ), rows[0].firstSeenAt)
    const converted = rows.some((row) => row.converted)
    const touched = [...new Set(rows.flatMap((row) => row.touchedFields || []))]
    const cleared = rows
      .flatMap((row) => row.clearedFields || [])
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    const identity = {
      name: rows.find((row) => row.customerName)?.customerName || null,
      phone: rows.find((row) => row.primaryPhone)?.primaryPhone || null,
      alternativePhone: rows.find((row) => row.alternativePhone)?.alternativePhone || null,
      city: rows.find((row) => row.city)?.city || null,
      address: rows.find((row) => row.deliveryAddress)?.deliveryAddress || null,
      deliveryDate: rows.find((row) => row.deliveryDate)?.deliveryDate || null,
    }
    const lastStage = rows.reduce((best, row) => (
      stageRank(row.lastEventType) > stageRank(best) ? row.lastEventType : best
    ), latest.lastEventType)
    const lastField = latest.lastField || touched.at(-1) || null
    const hoursAgo = Math.max(0, (Date.now() - new Date(latest.lastSeenAt).getTime()) / 3600000)
    const heat = (
      stageRank(lastStage) * 10
      + (identity.phone ? 40 : 0)
      + (identity.name ? 15 : 0)
      + (identity.address || identity.city ? 8 : 0)
      + (cleared.length ? 10 : 0)
      + Math.max(0, 20 - hoursAgo)
    )

    return {
      personId,
      visitorId: latest.visitorId,
      keverdVisitorId: latest.keverdVisitorId,
      sessions: rows.length,
      identity,
      lastPath: latest.lastPath,
      lastProductId: latest.lastProductId,
      lastProductName: latest.lastProductId ? productNames.get(latest.lastProductId) || latest.lastProductId : null,
      lastStage,
      lastField,
      lastSeenAt: latest.lastSeenAt,
      firstSeenAt,
      converted,
      eventCount: rows.reduce((sum, row) => sum + (row.eventCount || 0), 0),
      touchedFields: touched,
      clearedFields: cleared,
      leftOnField: !converted ? lastField : null,
      heat: Math.round(heat),
      keverd: {
        country: latest.keverdCountry,
        action: latest.keverdAction,
        riskScore: latest.keverdRiskScore,
        timesSeen: latest.keverdTimesSeen,
        isNew: latest.keverdIsNew,
        profile: latest.keverdProfile,
      },
    }
  }).sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())

  const reachOuts = journeys
    .filter((journey) => (
      !journey.converted && (journey.identity.phone || journey.identity.name || journey.clearedFields.length)
    ))
    .sort((a, b) => b.heat - a.heat)

  const ghosts = journeys.flatMap((journey) =>
    journey.clearedFields
      .filter((item) => /phone|name|address|city/i.test(item.field))
      .map((item) => ({
        personId: journey.personId,
        visitorId: journey.visitorId,
        field: item.field,
        lastValue: item.lastValue,
        at: item.at,
        productName: journey.lastProductName,
        lastPath: journey.lastPath,
      })),
  )

  const trendTypes = ['page_view', 'form_started', 'order_submitted'] as const
  const trendRows = await db
    .select({
      day: sql<string>`to_char(${schema.orderEvents.createdAt}, 'YYYY-MM-DD')`,
      eventType: schema.orderEvents.eventType,
      count: sql<number>`cast(count(distinct coalesce(${schema.orderEvents.keverdVisitorId}, ${schema.orderEvents.visitorId})) as int)`,
    })
    .from(schema.orderEvents)
    .where(and(
      gte(schema.orderEvents.createdAt, startDate),
      inArray(schema.orderEvents.eventType, [...trendTypes]),
    ))
    .groupBy(sql`to_char(${schema.orderEvents.createdAt}, 'YYYY-MM-DD')`, schema.orderEvents.eventType)

  const dayKeys: string[] = []
  const cursor = new Date(startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  while (cursor <= today) {
    const year = cursor.getFullYear()
    const month = String(cursor.getMonth() + 1).padStart(2, '0')
    const day = String(cursor.getDate()).padStart(2, '0')
    dayKeys.push(`${year}-${month}-${day}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  const trendLookup = new Map<string, number>()
  for (const row of trendRows) {
    trendLookup.set(`${row.day}:${row.eventType}`, Number(row.count || 0))
  }

  const trend = {
    labels: dayKeys,
    visitors: dayKeys.map((day) => trendLookup.get(`${day}:page_view`) || 0),
    checkouts: dayKeys.map((day) => trendLookup.get(`${day}:form_started`) || 0),
    orders: dayKeys.map((day) => trendLookup.get(`${day}:order_submitted`) || 0),
  }

  const fieldHeat = fieldOrder.map((field) => {
    const filled = journeys.filter((journey) => journey.touchedFields.includes(field)).length
    const cleared = journeys.filter((journey) => journey.clearedFields.some((item) => item.field === field)).length
    const stillHave = journeys.filter((journey) => {
      if (field === 'customerName') return Boolean(journey.identity.name)
      if (field === 'primaryPhone') return Boolean(journey.identity.phone)
      if (field === 'alternativePhone') return Boolean(journey.identity.alternativePhone)
      if (field === 'deliveryAddress') return Boolean(journey.identity.address)
      if (field === 'city') return Boolean(journey.identity.city)
      return journey.touchedFields.includes(field)
    }).length
    return { field, filled, cleared, stillHave }
  })

  return {
    funnel,
    trend,
    fieldHeat,
    reachOuts: reachOuts.slice(0, 80),
    ghosts: ghosts.slice(0, 80),
    journeys: journeys.slice(0, 120),
    totals: {
      people: journeys.length,
      converted: journeys.filter((journey) => journey.converted).length,
      abandonedWithContact: reachOuts.length,
      ghosts: ghosts.length,
      repeatDevices: journeys.filter((journey) => (journey.keverd?.timesSeen || 0) > 1 || journey.sessions > 1).length,
    },
  }
})
