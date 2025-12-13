import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create sample exam slots
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() + 7) // 7 days from now

  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 13) // 13 days later (total 2 weeks)

  // Create slots for Hall A - 1 hour duration
  for (let i = 0; i < 7; i++) {
    const slotDate = new Date(startDate)
    slotDate.setDate(startDate.getDate() + i)

    await prisma.examSlot.create({
      data: {
        date: slotDate,
        startTime: '09:00',
        endTime: '12:00',
        allowedDurations: JSON.stringify([60, 120]),
        locationName: 'Hall A',
        rowStart: 1,
        rowEnd: 20,
        defaultSeatsPerRow: 30,
        isActive: true,
      },
    })

    await prisma.examSlot.create({
      data: {
        date: slotDate,
        startTime: '14:00',
        endTime: '17:00',
        allowedDurations: JSON.stringify([60, 90, 120]),
        locationName: 'Hall A',
        rowStart: 1,
        rowEnd: 20,
        defaultSeatsPerRow: 30,
        isActive: true,
      },
    })
  }

  // Create slots for Hall B - 2 hour duration
  for (let i = 0; i < 7; i++) {
    const slotDate = new Date(startDate)
    slotDate.setDate(startDate.getDate() + i)

    await prisma.examSlot.create({
      data: {
        date: slotDate,
        startTime: '10:00',
        endTime: '16:00',
        allowedDurations: JSON.stringify([60, 120, 180]),
        locationName: 'Hall B',
        rowStart: 1,
        rowEnd: 15,
        defaultSeatsPerRow: 25,
        isActive: true,
      },
    })
  }

  console.log('Seeding completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

