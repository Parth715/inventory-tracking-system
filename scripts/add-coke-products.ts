import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

import { db } from "../lib/db"
import { vendors, products } from "../lib/db/schema"
import { eq, and, ilike } from "drizzle-orm"

interface CokeProductSpec {
  name: string
  packageSize: number
  unit: string
  caseCount: number
  defaultCasePrice: string
}

const cokeProductsToAdd: CokeProductSpec[] = [
  { name: "BodyArmor Flash I.V.", packageSize: 20, unit: "oz", caseCount: 12, defaultCasePrice: "19.88" },
  { name: "BodyArmor SportWater", packageSize: 23.7, unit: "oz", caseCount: 24, defaultCasePrice: "37.50" },
  { name: "BodyArmor Strawberry Lemonade", packageSize: 28, unit: "oz", caseCount: 15, defaultCasePrice: "20.62" },
  { name: "BodyArmor Grape", packageSize: 28, unit: "oz", caseCount: 15, defaultCasePrice: "20.62" },
  { name: "BodyArmor SuperDrink Fruit Punch", packageSize: 28, unit: "oz", caseCount: 15, defaultCasePrice: "22.99" },
  { name: "BodyArmor Zero Sugar Fruit Punch", packageSize: 28, unit: "oz", caseCount: 15, defaultCasePrice: "22.99" },
  { name: "Dunkin' Mocha Iced Coffee", packageSize: 13.7, unit: "oz", caseCount: 12, defaultCasePrice: "27.59" },
  { name: "Full Throttle Energy", packageSize: 16, unit: "oz", caseCount: 24, defaultCasePrice: "44.83" },
  { name: "Monster Energy Sugar Free", packageSize: 16, unit: "oz", caseCount: 24, defaultCasePrice: "44.83" },
  { name: "NOS Energy", packageSize: 24, unit: "oz", caseCount: 12, defaultCasePrice: "36.30" },
  { name: "Vitaminwater Zero Squeezed", packageSize: 20, unit: "oz", caseCount: 12, defaultCasePrice: "18.78" },
  { name: "Minute Maid Pineapple Burst", packageSize: 20, unit: "oz", caseCount: 24, defaultCasePrice: "24.34" },
  { name: "Diet Coke (15-Pack Cans)", packageSize: 12, unit: "oz", caseCount: 30, defaultCasePrice: "16.98" },
  { name: "Coke Zero Sugar (15-Pack Cans)", packageSize: 12, unit: "oz", caseCount: 30, defaultCasePrice: "16.98" },
  { name: "Coke Zero Sugar Cans", packageSize: 16, unit: "oz", caseCount: 24, defaultCasePrice: "26.66" },
  { name: "Cherry Coke", packageSize: 20, unit: "oz", caseCount: 24, defaultCasePrice: "32.48" },
  { name: "Sprite", packageSize: 20, unit: "oz", caseCount: 24, defaultCasePrice: "32.48" },
  { name: "Coca-Cola Classic", packageSize: 20, unit: "oz", caseCount: 24, defaultCasePrice: "32.48" },
  { name: "Diet Coke", packageSize: 20, unit: "oz", caseCount: 24, defaultCasePrice: "32.48" },
  { name: "Coke Zero Sugar", packageSize: 20, unit: "oz", caseCount: 24, defaultCasePrice: "32.48" },
  { name: "Coca-Cola Classic", packageSize: 2, unit: "liter", caseCount: 8, defaultCasePrice: "16.63" },
  { name: "Coke Zero Sugar", packageSize: 2, unit: "liter", caseCount: 8, defaultCasePrice: "16.63" },
  { name: "Diet Coke", packageSize: 2, unit: "liter", caseCount: 8, defaultCasePrice: "16.63" },
  { name: "Fanta Orange", packageSize: 2, unit: "liter", caseCount: 8, defaultCasePrice: "14.93" },
  { name: "Gold Peak Zero Sugar Sweet Tea", packageSize: 18.5, unit: "oz", caseCount: 12, defaultCasePrice: "19.15" },
  { name: "Dasani Water", packageSize: 16.9, unit: "oz", caseCount: 24, defaultCasePrice: "6.86" },
  { name: "Smartwater", packageSize: 20, unit: "oz", caseCount: 24, defaultCasePrice: "32.88" },
  { name: "Smartwater", packageSize: 23.7, unit: "oz", caseCount: 24, defaultCasePrice: "35.70" },
  { name: "Smartwater", packageSize: 33.8, unit: "oz", caseCount: 12, defaultCasePrice: "20.26" },
]

async function main() {
  console.log("Searching for vendor 'Coca-Cola Consolidated'...")
  const allVendors = await db.select().from(vendors)
  let cokeVendor = allVendors.find(
    (v) =>
      v.name.toLowerCase().includes("coca-cola") ||
      v.name.toLowerCase().includes("coke")
  )

  if (!cokeVendor) {
    console.log("Vendor not found, creating 'Coca-Cola Consolidated'...")
    const [newV] = await db
      .insert(vendors)
      .values({ name: "Coca-Cola Consolidated" })
      .returning()
    cokeVendor = newV
  }

  console.log(`Using Vendor: ${cokeVendor.name} (ID: ${cokeVendor.id})\n`)

  for (const item of cokeProductsToAdd) {
    // Check if product with same name + size + vendor exists
    const [existing] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.vendorId, cokeVendor.id),
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
          vendorId: cokeVendor.id,
          name: item.name,
          packageSize: String(item.packageSize),
          unit: item.unit,
          caseCount: item.caseCount,
          defaultCasePrice: item.defaultCasePrice,
        })
    }
  }

  console.log("\n=== Complete Coca-Cola Consolidated Products in Database ===")
  const currentCokeProducts = await db
    .select()
    .from(products)
    .where(eq(products.vendorId, cokeVendor.id))

  // Sort by package size (lowest to highest), then alphabetically
  currentCokeProducts.sort((a, b) => {
    const sizeA = Number(a.packageSize) || 0
    const sizeB = Number(b.packageSize) || 0
    if (sizeA !== sizeB) return sizeA - sizeB
    return a.name.localeCompare(b.name)
  })

  for (const p of currentCokeProducts) {
    console.log(
      ` - ID: ${p.id} | ${p.name} | ${p.packageSize} ${p.unit} | Case Count: ${p.caseCount} | Net Case Price: $${p.defaultCasePrice}`
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error adding Coke products:", err)
    process.exit(1)
  })
