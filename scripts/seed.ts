import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../server/db/schema'

// Initial product data (from original products.json)
const products = [
  {
    productId: 'ae-pulse-anc',
    productName: 'Pulse ANC Headphones',
    shortDescription: 'Over-ear wireless cans with deep noise cancelling and 40-hour battery for commutes, desks, and late work.',
    description: `Pulse is built for long days. The cups seal without clamping, the ANC actually cuts bus roar and office chatter, and the battery lasts through a work week if you are not living in them.

## What you actually get

A fold-flat wireless headset with Bluetooth 5.4, a USB-C charge in about two hours, and a 3.5 mm cable when you want zero latency. The mic array is tuned for calls, not just music, so you can take a client conversation without hunting for your phone.

## Sound, without the myth

Drivers are 40 mm and tuned slightly warm so podcasts stay clear and bass does not smear. Transparency mode is a one-tap slide so you can hear a conductor or a doorbell without peeling them off.

## In the box

- Pulse ANC headphones
- USB-C cable
- 3.5 mm cable
- Travel sleeve
- Quick start card

## Care

Wipe the cups with a dry cloth. Keep them out of heavy rain. Charge before the first use so the battery meter reads true.`,
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf4723?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?auto=format&fit=crop&w=1400&q=80',
    ],
    pack1Price: 4500,
    pack2Price: 8200,
    pack3Price: 11400,
    unitPrice: 4500,
    category: 'Audio',
    features: ['Active noise cancelling', '40-hour battery', 'Bluetooth 5.4 + 3.5 mm', 'Call-ready mics'],
    isActive: true,
    featured: true,
    soldCount: 1284,
    currency: 'KES',
  },
  {
    productId: 'ae-nova-buds',
    productName: 'Nova Encased Earbuds',
    shortDescription: 'Compact buds with a locking case, IPX5 sweat rating, and a clean fit that stays put on a run.',
    description: `Nova is the daily driver for people who lose dainty cases. The lid clicks shut, the buds magnetise home, and you can find the case in a bag without a torch.

## Fit and feel

Three silicone tip sizes ship in the box. The stem is short so they do not snag a mask or a collar. Touch controls cover play, skip, and calls — hold for ANC off if you want street noise back.

## Battery that matches a commute

Six hours in the buds, another twenty-four in the case. A 15-minute plug-in covers an evening out.

## Water

IPX5 means rain and gym sweat. Do not swim with them.

## In the box

- Nova earbuds and case
- USB-C cable
- Three tip sizes
- Lanyard loop`,
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=1400&q=80',
    ],
    pack1Price: 2200,
    pack2Price: 4000,
    pack3Price: 5400,
    unitPrice: 2200,
    category: 'Audio',
    features: ['IPX5 sweat ready', '30-hour total battery', 'Locking magnetic case', 'Stable sport fit'],
    isActive: true,
    featured: true,
    soldCount: 2416,
    currency: 'KES',
  },
  {
    productId: 'ae-volt-65',
    productName: 'Volt 65W GaN Brick',
    shortDescription: 'A pocket GaN charger that fills a laptop, a phone, and earbuds from one plug without cooking the desk.',
    description: `Volt replaces the brick you have been dragging around. GaN keeps it small. 65 watts is enough for most ultrabooks, and the two USB-C ports plus USB-A mean you are not unplugging one device to feed another.

## Ports

- USB-C1: up to 65W
- USB-C2: up to 30W
- USB-A: 18W

Plug in two devices and Volt splits power on its own. No app. No modes to remember.

## Heat

It runs warm, not hot. Leave space around it on a nightstand. Do not cover it with a pillow.

## Travel

Fold-flat pins. Works on 100–240V so you can use it with a cheap socket adapter abroad.

## In the box

- Volt 65W charger
- 1 m USB-C cable
- Pouch`,
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c2?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1591290619762-c588f7cb0f97?auto=format&fit=crop&w=1400&q=80',
    ],
    pack1Price: 2800,
    pack2Price: 5200,
    pack3Price: 7200,
    unitPrice: 2800,
    category: 'Charging',
    features: ['65W GaN, small body', '2× USB-C + USB-A', '100–240V travel pins', 'Laptop + phone at once'],
    isActive: true,
    featured: true,
    soldCount: 986,
    currency: 'KES',
  },
  {
    productId: 'ae-ridge-watch',
    productName: 'Ridge Sport Watch',
    shortDescription: 'A light GPS watch with a week of battery, heart-rate tracking, and a strap you can actually wash.',
    description: `Ridge is a watch you wear to work and then forget to take off for a Saturday run. GPS locks in under a minute in open sky. Heart rate is continuous. Sleep tracking is honest enough to be useful, not theatrical.

## Battery

Seven days with typical notifications. Two days with GPS left on for long sessions. Charge on USB-C in about an hour.

## Build

Aluminium case, mineral glass, 5 ATM water rating. Swim laps, do not dive wrecks.

## Strap

Quick-release fluoroelastomer. Rinse it. It will not rot like cheap silicone.

## What it will not do

It will not replace a phone. Maps are breadcrumbs, not turn-by-turn. That is the point — less to break.

## In the box

- Ridge watch
- USB-C charger
- Extra strap pins`,
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1400&q=80',
    ],
    pack1Price: 6200,
    pack2Price: 11500,
    pack3Price: 15900,
    unitPrice: 6200,
    category: 'Wearables',
    features: ['GPS + heart rate', '7-day typical battery', '5 ATM swim ready', 'Washable quick strap'],
    isActive: true,
    featured: true,
    soldCount: 743,
    currency: 'KES',
  },
  {
    productId: 'ae-core-ssd',
    productName: 'Core 1TB Pocket SSD',
    shortDescription: 'A metal USB-C drive that moves large video off a laptop at up to 1050 MB/s without a brick.',
    description: `Core is for people who fill a laptop by Thursday. Plug it in with USB-C. No extra power. The shell is aluminium so it sheds heat instead of throttling after one export.

## Speed

Up to 1050 MB/s read on USB 3.2 machines. Real-world copies of mixed files land lower, which is normal. Use the USB-C port on the laptop, not a tired hub.

## Durability

No spinning parts. Shock is not a feature pitch — it is just an SSD. Keep it dry.

## Format

Ships exFAT so macOS and Windows both see it. Reformat if you live in one ecosystem.

## In the box

- Core 1TB SSD
- Short USB-C cable
- USB-A adapter`,
    images: [
      'https://images.unsplash.com/photo-1597872200969-2b65d19bd22c?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1531492746076-161ca2bcad4e?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1628556270448-4d4e4147e19d?auto=format&fit=crop&w=1400&q=80',
    ],
    pack1Price: 7800,
    pack2Price: 14800,
    pack3Price: 21000,
    unitPrice: 7800,
    category: 'Storage',
    features: ['1TB usable', 'Up to 1050 MB/s', 'USB-C, no extra brick', 'exFAT, Mac and Windows'],
    isActive: true,
    featured: false,
    soldCount: 512,
    currency: 'KES',
  },
  {
    productId: 'ae-frame-cam',
    productName: 'Frame 1080p Desk Camera',
    shortDescription: 'A sharp USB webcam with a hardware privacy shutter and glass that does not smear under office LEDs.',
    description: `Frame is for calls that matter. Autofocus is quiet. The colour is tuned for indoor light so you do not look jaundiced under a cheap bulb. The shutter is physical — slide it, the lens is gone.

## Setup

USB-A. No drivers on current Windows or macOS. Clip it to a laptop lid or a monitor. The mount is spring steel, not a toy hinge.

## Mic

Dual mics with light noise reduction. Use a headset if the room echoes. Frame will not save a bathroom office.

## Privacy

The shutter is not software. If it is closed, nothing is watching.

## In the box

- Frame camera
- 1.5 m USB cable
- Monitor clip`,
    images: [
      'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1400&q=80',
    ],
    pack1Price: 3400,
    pack2Price: 6400,
    pack3Price: 9000,
    unitPrice: 3400,
    category: 'Imaging',
    features: ['1080p 30 fps', 'Physical privacy shutter', 'Plug-in USB, no app', 'Dual mics'],
    isActive: true,
    featured: false,
    soldCount: 418,
    currency: 'KES',
  },
  {
    productId: 'ae-halo-speaker',
    productName: 'Halo Carry Speaker',
    shortDescription: 'A dust-tight Bluetooth speaker with a real handle, 12-hour play, and a mix that holds up outdoors.',
    description: `Halo is the speaker you take outside and do not baby. IP67 means dust and a short dunk. The handle is part of the shell, not a strap that snaps.

## Sound

A 360° driver layout so it does not have a "front." Pair two Halos if you want stereo — the second pack exists for a reason.

## Battery

Twelve hours at a sane volume. Party volume is shorter. USB-C recharge in three hours. It can trickle a phone in a pinch.

## Pairing

Bluetooth 5.3. One-button reconnect to the last phone.

## In the box

- Halo speaker
- USB-C cable
- Shoulder loop`,
    images: [
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?auto=format&fit=crop&w=1400&q=80',
    ],
    pack1Price: 3900,
    pack2Price: 7200,
    pack3Price: 9900,
    unitPrice: 3900,
    category: 'Audio',
    features: ['IP67 dust and splash', '12-hour battery', 'Built-in carry handle', 'Stereo pair two units'],
    isActive: true,
    featured: false,
    soldCount: 867,
    currency: 'KES',
  },
  {
    productId: 'ae-dock-hub',
    productName: 'Dock 8-in-1 USB-C Hub',
    shortDescription: 'One cable to HDMI, Ethernet, SD, and extra ports so a slim laptop can sit on a real desk.',
    description: `Dock is the missing side of a modern laptop. HDMI 4K, gigabit Ethernet, two USB-A, SD and microSD, USB-C passthrough up to 100W. One cable in. Everything else out.

## Display

HDMI 2.0 up to 4K 30 Hz or 1080p 60 Hz. That is the honest spec. If you need 4K 60, say so before you order a different unit.

## Power

Passthrough charging if your brick is 100W or under. Use the laptop maker's charger when you can.

## Cards

SD and microSD are UHS-I. Fine for photo dumps, not a cinema workflow.

## In the box

- Dock hub
- Short USB-C lead (captive)
- Sleeve`,
    images: [
      'https://images.unsplash.com/photo-1625948515291-69613efd103f?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&w=1400&q=80',
    ],
    pack1Price: 3100,
    pack2Price: 5800,
    pack3Price: 8100,
    unitPrice: 3100,
    category: 'Accessories',
    features: ['HDMI 4K + gigabit LAN', 'SD and microSD', '100W pass-through', 'Single USB-C cable'],
    isActive: true,
    featured: false,
    soldCount: 1091,
    currency: 'KES',
  },
  {
    productId: 'ae-beam-lamp',
    productName: 'Beam Desk Lamp',
    shortDescription: 'A dimmable LED lamp with a high CRI for night work, a small footprint, and a joint that stays where you put it.',
    description: `Beam is a lamp for people who still work after dark. The LED is high CRI so skin and paper look right. The arm holds angle without a cheap sag after a month.

## Light

Stepless dimming. Warm-to-neutral shift if you want less blue late. No app, no account — a knob on the base.

## Power

USB-C. Use the included brick or a laptop charger. Flicker is low enough for webcam use.

## Desk

Base is weighted. It will not walk when you type. The head rotates so you can light a notebook without blasting the lens.

## In the box

- Beam lamp
- USB-C cable
- 20W power adapter`,
    images: [
      'https://images.unsplash.com/photo-1507473881161-04931a5ab2e0?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1543198126-a8ad8e47fb22?auto=format&fit=crop&w=1400&q=80',
    ],
    pack1Price: 2600,
    pack2Price: 4800,
    pack3Price: 6600,
    unitPrice: 2600,
    category: 'Lighting',
    features: ['High CRI LED', 'Stepless dim + warmth', 'Stiff, no-sag arm', 'USB-C powered'],
    isActive: true,
    featured: false,
    soldCount: 329,
    currency: 'KES',
  },
]

async function seed() {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  console.log('Connecting to database...')
  const client = postgres(connectionString, { ssl: 'require' })
  const db = drizzle(client, { schema })

  console.log('Seeding products...')
  
  for (const product of products) {
    try {
      await db.insert(schema.products).values(product).onConflictDoNothing()
      console.log(`  ✓ ${product.productName}`)
    } catch (error) {
      console.error(`  ✗ ${product.productName}:`, error)
    }
  }

  console.log('\nDone!')
  await client.end()
  process.exit(0)
}

seed().catch(console.error)
