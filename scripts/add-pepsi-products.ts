import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

import { db } from "../lib/db"
import { vendors, products } from "../lib/db/schema"
import { eq, and } from "drizzle-orm"

interface PepsiProductSpec {
  name: string
  packageSize: number
  unit: string
  caseCount: number
  defaultCasePrice: string
}

const pepsiProductsToAdd: PepsiProductSpec[] = [
  { name: "Alani Nu Hawaiian Shaved Ice", packageSize: 12, unit: "oz", caseCount: 12, defaultCasePrice: "22.50" },
  { name: "Alani Nu Pink Slush", packageSize: 12, unit: "oz", caseCount: 12, defaultCasePrice: "22.50" },
  { name: "Mountain Dew Baja Blast (Nostalgia Glass)", packageSize: 12, unit: "oz", caseCount: 24, defaultCasePrice: "40.45" },
  { name: "Celsius Orange", packageSize: 12, unit: "oz", caseCount: 12, defaultCasePrice: "20.72" },
  { name: "Celsius Green Apple Cherry", packageSize: 12, unit: "oz", caseCount: 12, defaultCasePrice: "20.72" },
  { name: "Celsius Watermelon Lemonade", packageSize: 12, unit: "oz", caseCount: 12, defaultCasePrice: "20.72" },
  { name: "Celsius Fantasy Fruit / Dragonfruit Lime", packageSize: 12, unit: "oz", caseCount: 12, defaultCasePrice: "20.72" },
  { name: "Muscle Milk Protein Strawberry Cream", packageSize: 14, unit: "oz", caseCount: 12, defaultCasePrice: "41.32" },
  { name: "Ocean Spray Cranberry Grape", packageSize: 15.2, unit: "oz", caseCount: 12, defaultCasePrice: "21.30" },
  { name: "Rockstar Sugar Free", packageSize: 16, unit: "oz", caseCount: 12, defaultCasePrice: "16.57" },
  { name: "Rockstar Punched", packageSize: 16, unit: "oz", caseCount: 12, defaultCasePrice: "16.57" },
  { name: "Rockstar Freeze / Silver Ice", packageSize: 16, unit: "oz", caseCount: 12, defaultCasePrice: "16.57" },
  { name: "Rockstar Recovery Orange", packageSize: 16, unit: "oz", caseCount: 12, defaultCasePrice: "16.57" },
  { name: "Mountain Dew Cans", packageSize: 16, unit: "oz", caseCount: 12, defaultCasePrice: "17.86" },
  { name: "Mountain Dew Amp Original", packageSize: 16, unit: "oz", caseCount: 12, defaultCasePrice: "21.65" },
  { name: "Mountain Dew Kickstart Pineapple Orange Mango", packageSize: 16, unit: "oz", caseCount: 12, defaultCasePrice: "21.63" },
  { name: "Lipton Pure Leaf Peach Tea", packageSize: 18.5, unit: "oz", caseCount: 12, defaultCasePrice: "23.10" },
  { name: "Mountain Dew", packageSize: 1, unit: "liter", caseCount: 15, defaultCasePrice: "31.10" },
  { name: "Dr Pepper", packageSize: 1, unit: "liter", caseCount: 15, defaultCasePrice: "28.06" },
  { name: "Brisk Fruit Punch", packageSize: 1, unit: "liter", caseCount: 15, defaultCasePrice: "18.53" },
  { name: "Brisk Lemonade", packageSize: 1, unit: "liter", caseCount: 15, defaultCasePrice: "18.53" },
  { name: "Brisk Pink Lemonade", packageSize: 1, unit: "liter", caseCount: 15, defaultCasePrice: "18.53" },
  { name: "Brisk Blood Orange", packageSize: 1, unit: "liter", caseCount: 15, defaultCasePrice: "18.53" },
  { name: "Brisk Blueberry Pomegranate", packageSize: 1, unit: "liter", caseCount: 15, defaultCasePrice: "18.53" },
  { name: "Diet Mountain Dew", packageSize: 20, unit: "oz", caseCount: 24, defaultCasePrice: "37.56" },
  { name: "Mountain Dew LiveWire", packageSize: 20, unit: "oz", caseCount: 24, defaultCasePrice: "37.56" },
  { name: "Gatorade Fruit Punch", packageSize: 24, unit: "oz", caseCount: 24, defaultCasePrice: "51.33" },
  { name: "Gatorade Cool Blue", packageSize: 28, unit: "oz", caseCount: 15, defaultCasePrice: "27.61" },
  { name: "Gatorade Zero Fruit Punch", packageSize: 28, unit: "oz", caseCount: 15, defaultCasePrice: "27.61" },
]

async function main() {
  console.log("Searching for vendor 'Pepsi'...")
  const allVendors = await db.select().from(vendors)
  let pepsiVendor = allVendors.find((v) => v.name.toLowerCase().includes("pepsi"))

  if (!pepsiVendor) {
    console.log("Vendor not found, creating 'Pepsi'...")
    const [newV] = await db.insert(vendors).values({ name: "Pepsi" }).returning()
    pepsiVendor = newV
  }

  console.log(`Using Vendor: ${pepsiVendor.name} (ID: ${pepsiVendor.id})\n`)

  for (const item of pepsiProductsToAdd) {
    // Check if product exists
    const [existing] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.vendorId, pepsiVendor.id),
          eq(products.name, item.name),
          eq(products.packageSize, String(item.packageSize))
        )
      )

    if (existing) {
      console.log(`Updating existing product: ${item.name} (${item.packageSize} ${item.unit}) -> Net Case Price $${item.defaultCasePrice}`)
      await db
        .update(products)
        .set({
          unit: item.unit,
          caseCount: item.caseCount,
          defaultCasePrice: item.defaultCasePrice,
        })
        .where(eq(products.id, existing.id))
    } else {
      console.log(`Inserting new product: ${item.name} (${item.packageSize} ${item.unit}) -> Net Case Price $${item.defaultCasePrice}`)
      await db
        .insert(products)
        .values({
          vendorId: pepsiVendor.id,
          name: item.name,
          packageSize: String(item.packageSize),
          unit: item.unit,
          caseCount: item.caseCount,
          defaultCasePrice: item.defaultCasePrice,
        })
    }
  }

  console.log("\n=== Complete Pepsi Products in Database ===")
  const currentPepsiProducts = await db
    .select()
    .from(products)
    .where(eq(products.vendorId, pepsiVendor.id))

  // Sort by package size (lowest to highest), then alphabetically
  currentPepsiProducts.sort((a, b) => {
    const sizeA = Number(a.packageSize) || 0
    const sizeB = Number(b.packageSize) || 0
    if (sizeA !== sizeB) return sizeA - sizeB
    return a.name.localeCompare(b.name)
  })

  for (const p of currentPepsiProducts) {
    console.log(
      ` - ID: ${p.id} | ${p.name} | ${p.packageSize} ${p.unit} | Case Count: ${p.caseCount} | Net Case Price: $${p.defaultCasePrice}`
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error adding Pepsi products:", err)
    process.exit(1)
  })
