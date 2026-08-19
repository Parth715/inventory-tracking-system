import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

import { db } from "../lib/db"
import { vendors, products } from "../lib/db/schema"
import { eq, and } from "drizzle-orm"

interface ProductSpec {
  name: string
  packageSize: number
}

const itemsToAdd: ProductSpec[] = [
  { name: "Red Bull Iced Vanilla Berry", packageSize: 8.4 },
  { name: "Red Bull JuneBerry", packageSize: 8.4 },
  { name: "Red Bull JuneBerry", packageSize: 12 },
  { name: "Red Bull White Peach", packageSize: 8.4 },
  { name: "Red Bull White Peach", packageSize: 12 },
  { name: "Red Bull Sudachi Lime", packageSize: 12 },
  { name: "Red Bull Sudachi Lime", packageSize: 8.4 },
  { name: "Red Bull Coconut", packageSize: 12 },
  { name: "Red Bull Coconut", packageSize: 8.4 },
  { name: "Red Bull Strawberry Apricot", packageSize: 12 },
  { name: "Red Bull Strawberry Apricot", packageSize: 8.4 },
  { name: "Red Bull Wild Berries", packageSize: 12 },
  { name: "Red Bull Wild Berries", packageSize: 8.4 },
  { name: "Red Bull Watermelon", packageSize: 12 },
  { name: "Red Bull Watermelon", packageSize: 8.4 },
]

async function main() {
  console.log("Searching for vendor 'Red Bull'...")
  let [redBullVendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.name, "Red Bull"))

  if (!redBullVendor) {
    console.log("Vendor 'Red Bull' not found, creating vendor...")
    const [newVendor] = await db
      .insert(vendors)
      .values({ name: "Red Bull" })
      .returning()
    redBullVendor = newVendor
  }

  console.log(`Using Vendor: ${redBullVendor.name} (ID: ${redBullVendor.id})\n`)

  for (const item of itemsToAdd) {
    let retailPrice = "0.00"
    let defaultCasePrice = "0.00"
    const unit = "oz"
    const caseCount = 24

    if (item.packageSize === 12) {
      retailPrice = "3.89"
      defaultCasePrice = "52.96"
    } else if (item.packageSize === 8.4) {
      retailPrice = "2.99"
      defaultCasePrice = "40.24"
    } else {
      console.warn(`Warning: unhandled package size ${item.packageSize} for ${item.name}`)
    }

    // Check if product already exists
    const [existing] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.vendorId, redBullVendor.id),
          eq(products.name, item.name),
          eq(products.packageSize, String(item.packageSize))
        )
      )

    if (existing) {
      console.log(`Updating existing product: ${item.name} (${item.packageSize} ${unit})...`)
      await db
        .update(products)
        .set({
          unit,
          caseCount,
          retailPrice,
          defaultCasePrice,
        })
        .where(eq(products.id, existing.id))
      console.log(`  ✓ Updated Product ID: ${existing.id}`)
    } else {
      console.log(`Inserting new product: ${item.name} (${item.packageSize} ${unit})...`)
      const [inserted] = await db
        .insert(products)
        .values({
          vendorId: redBullVendor.id,
          name: item.name,
          packageSize: String(item.packageSize),
          unit,
          caseCount,
          retailPrice,
          defaultCasePrice,
        })
        .returning()
      console.log(`  ✓ Created Product ID: ${inserted.id}`)
    }
  }

  console.log("\n=== Complete Red Bull Products in Database ===")
  const redBullProducts = await db
    .select()
    .from(products)
    .where(eq(products.vendorId, redBullVendor.id))

  for (const p of redBullProducts) {
    console.log(
      ` - ID: ${p.id} | ${p.name} | ${p.packageSize} ${p.unit} | Case Count: ${p.caseCount} | Case Price: $${p.defaultCasePrice} | Retail Price: $${p.retailPrice}`
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error adding products:", err)
    process.exit(1)
  })
