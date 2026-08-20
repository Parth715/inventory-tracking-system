/**
 * Seed script — populates the database with initial locations, vendors, and products.
 *
 * Usage:
 *   npx tsx lib/db/seed.ts
 *
 * Requires DATABASE_URL in .env.local (loaded via dotenv).
 */

import { config } from "dotenv"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { locations, vendors, products } from "./schema"

// Load .env.local first, fallback to .env
config({ path: ".env.local" })
config({ path: ".env" })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

async function seed() {
  console.log("🌱 Seeding database...")

  // ── Locations ──────────────────────────────────────────────────────────
  const createdLocations = await db
    .insert(locations)
    .values([
      { name: "Sharonville FoodMart" },
      { name: "Sharonville Liquor" },
      { name: "Sharonville Shell" },
      { name: "Springdale Shell" },
    ])
    .onConflictDoNothing()
    .returning()

  console.log(`  ✓ Locations: ${createdLocations.length} created`)

  // ── Vendors ────────────────────────────────────────────────────────────
  const insertedVendors = await db
    .insert(vendors)
    .values([
      { name: "Coca-Cola Consolidated" },
      { name: "Pepsi" },
      { name: "Red Bull" },
    ])
    .onConflictDoNothing()
    .returning()

  console.log(`  ✓ Vendors: ${insertedVendors.length} created`)

  // Fetch vendor records (either newly inserted or existing)
  const allVendors = await db.select().from(vendors)
  const coke = allVendors.find((v) => v.name === "Coca-Cola Consolidated")
  const pepsi = allVendors.find((v) => v.name === "Pepsi")
  const redbull = allVendors.find((v) => v.name === "Red Bull")

  const existingProducts = await db.select().from(products)

  // ── Products ───────────────────────────────────────────────────────────
  if (existingProducts.length === 0 && coke && pepsi && redbull) {
    const productRows = await db
      .insert(products)
      .values([
        // Coca-Cola Consolidated
        { vendorId: coke.id, name: "BodyArmor Flash I.V.", packageSize: "20", unit: "oz", caseCount: 12, defaultCasePrice: "19.88" },
        { vendorId: coke.id, name: "BodyArmor SportWater", packageSize: "23.7", unit: "oz", caseCount: 24, defaultCasePrice: "37.50" },
        { vendorId: coke.id, name: "BodyArmor Strawberry Lemonade", packageSize: "28", unit: "oz", caseCount: 15, defaultCasePrice: "20.62" },
        { vendorId: coke.id, name: "BodyArmor Grape", packageSize: "28", unit: "oz", caseCount: 15, defaultCasePrice: "20.62" },
        { vendorId: coke.id, name: "BodyArmor SuperDrink Fruit Punch", packageSize: "28", unit: "oz", caseCount: 15, defaultCasePrice: "22.99" },
        { vendorId: coke.id, name: "BodyArmor Zero Sugar Fruit Punch", packageSize: "28", unit: "oz", caseCount: 15, defaultCasePrice: "22.99" },
        { vendorId: coke.id, name: "Dunkin' Mocha Iced Coffee", packageSize: "13.7", unit: "oz", caseCount: 12, defaultCasePrice: "27.59" },
        { vendorId: coke.id, name: "Full Throttle Energy", packageSize: "16", unit: "oz", caseCount: 24, defaultCasePrice: "44.83" },
        { vendorId: coke.id, name: "Monster Energy Sugar Free", packageSize: "16", unit: "oz", caseCount: 24, defaultCasePrice: "44.83" },
        { vendorId: coke.id, name: "NOS Energy", packageSize: "24", unit: "oz", caseCount: 12, defaultCasePrice: "36.30" },
        { vendorId: coke.id, name: "Vitaminwater Zero Squeezed", packageSize: "20", unit: "oz", caseCount: 12, defaultCasePrice: "18.78" },
        { vendorId: coke.id, name: "Minute Maid Pineapple Burst", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "24.34" },
        { vendorId: coke.id, name: "Diet Coke (15-Pack Cans)", packageSize: "12", unit: "oz", caseCount: 30, defaultCasePrice: "16.98" },
        { vendorId: coke.id, name: "Coke Zero Sugar (15-Pack Cans)", packageSize: "12", unit: "oz", caseCount: 30, defaultCasePrice: "16.98" },
        { vendorId: coke.id, name: "Coke Zero Sugar Cans", packageSize: "16", unit: "oz", caseCount: 24, defaultCasePrice: "26.66" },
        { vendorId: coke.id, name: "Cherry Coke", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "32.48" },
        { vendorId: coke.id, name: "Sprite", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "32.48" },
        { vendorId: coke.id, name: "Coca-Cola Classic", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "32.48" },
        { vendorId: coke.id, name: "Diet Coke", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "32.48" },
        { vendorId: coke.id, name: "Coke Zero Sugar", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "32.48" },
        { vendorId: coke.id, name: "Coca-Cola Classic", packageSize: "2", unit: "liter", caseCount: 8, defaultCasePrice: "16.63" },
        { vendorId: coke.id, name: "Coke Zero Sugar", packageSize: "2", unit: "liter", caseCount: 8, defaultCasePrice: "16.63" },
        { vendorId: coke.id, name: "Diet Coke", packageSize: "2", unit: "liter", caseCount: 8, defaultCasePrice: "16.63" },
        { vendorId: coke.id, name: "Fanta Orange", packageSize: "2", unit: "liter", caseCount: 8, defaultCasePrice: "14.93" },
        { vendorId: coke.id, name: "Gold Peak Zero Sugar Sweet Tea", packageSize: "18.5", unit: "oz", caseCount: 12, defaultCasePrice: "19.15" },
        { vendorId: coke.id, name: "Dasani Water", packageSize: "16.9", unit: "oz", caseCount: 24, defaultCasePrice: "6.86" },
        { vendorId: coke.id, name: "Smartwater", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "32.88" },
        { vendorId: coke.id, name: "Smartwater", packageSize: "23.7", unit: "oz", caseCount: 24, defaultCasePrice: "35.70" },
        { vendorId: coke.id, name: "Smartwater", packageSize: "33.8", unit: "oz", caseCount: 12, defaultCasePrice: "20.26" },

        // Pepsi
        { vendorId: pepsi.id, name: "Alani Nu Hawaiian Shaved Ice", packageSize: "12", unit: "oz", caseCount: 12, defaultCasePrice: "22.50" },
        { vendorId: pepsi.id, name: "Alani Nu Pink Slush", packageSize: "12", unit: "oz", caseCount: 12, defaultCasePrice: "22.50" },
        { vendorId: pepsi.id, name: "Mountain Dew Baja Blast (Nostalgia Glass)", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "40.45" },
        { vendorId: pepsi.id, name: "Celsius Orange", packageSize: "12", unit: "oz", caseCount: 12, defaultCasePrice: "20.72" },
        { vendorId: pepsi.id, name: "Celsius Green Apple Cherry", packageSize: "12", unit: "oz", caseCount: 12, defaultCasePrice: "20.72" },
        { vendorId: pepsi.id, name: "Celsius Watermelon Lemonade", packageSize: "12", unit: "oz", caseCount: 12, defaultCasePrice: "20.72" },
        { vendorId: pepsi.id, name: "Celsius Fantasy Fruit / Dragonfruit Lime", packageSize: "12", unit: "oz", caseCount: 12, defaultCasePrice: "20.72" },
        { vendorId: pepsi.id, name: "Pepsi", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "29.00" },
        { vendorId: pepsi.id, name: "Mountain Dew", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "29.00" },
        { vendorId: pepsi.id, name: "Muscle Milk Protein Strawberry Cream", packageSize: "14", unit: "oz", caseCount: 12, defaultCasePrice: "41.32" },
        { vendorId: pepsi.id, name: "Ocean Spray Cranberry Grape", packageSize: "15.2", unit: "oz", caseCount: 12, defaultCasePrice: "21.30" },
        { vendorId: pepsi.id, name: "Rockstar Sugar Free", packageSize: "16", unit: "oz", caseCount: 12, defaultCasePrice: "16.57" },
        { vendorId: pepsi.id, name: "Rockstar Punched", packageSize: "16", unit: "oz", caseCount: 12, defaultCasePrice: "16.57" },
        { vendorId: pepsi.id, name: "Rockstar Freeze / Silver Ice", packageSize: "16", unit: "oz", caseCount: 12, defaultCasePrice: "16.57" },
        { vendorId: pepsi.id, name: "Rockstar Recovery Orange", packageSize: "16", unit: "oz", caseCount: 12, defaultCasePrice: "16.57" },
        { vendorId: pepsi.id, name: "Mountain Dew Cans", packageSize: "16", unit: "oz", caseCount: 12, defaultCasePrice: "17.86" },
        { vendorId: pepsi.id, name: "Mountain Dew Amp Original", packageSize: "16", unit: "oz", caseCount: 12, defaultCasePrice: "21.65" },
        { vendorId: pepsi.id, name: "Mountain Dew Kickstart Pineapple Orange Mango", packageSize: "16", unit: "oz", caseCount: 12, defaultCasePrice: "21.63" },
        { vendorId: pepsi.id, name: "Aquafina Water", packageSize: "16", unit: "oz", caseCount: 24, defaultCasePrice: "17.00" },
        { vendorId: pepsi.id, name: "Lipton Pure Leaf Peach Tea", packageSize: "18.5", unit: "oz", caseCount: 12, defaultCasePrice: "23.10" },
        { vendorId: pepsi.id, name: "Pepsi", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "27.00" },
        { vendorId: pepsi.id, name: "Mountain Dew", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "27.00" },
        { vendorId: pepsi.id, name: "Diet Mountain Dew", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "37.56" },
        { vendorId: pepsi.id, name: "Mountain Dew LiveWire", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "37.56" },
        { vendorId: pepsi.id, name: "Gatorade", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "32.00" },
        { vendorId: pepsi.id, name: "Gatorade Fruit Punch", packageSize: "24", unit: "oz", caseCount: 24, defaultCasePrice: "51.33" },
        { vendorId: pepsi.id, name: "Gatorade Cool Blue", packageSize: "28", unit: "oz", caseCount: 15, defaultCasePrice: "27.61" },
        { vendorId: pepsi.id, name: "Gatorade Zero Fruit Punch", packageSize: "28", unit: "oz", caseCount: 15, defaultCasePrice: "27.61" },
        { vendorId: pepsi.id, name: "Mountain Dew", packageSize: "1", unit: "liter", caseCount: 15, defaultCasePrice: "31.10" },
        { vendorId: pepsi.id, name: "Dr Pepper", packageSize: "1", unit: "liter", caseCount: 15, defaultCasePrice: "28.06" },
        { vendorId: pepsi.id, name: "Brisk Fruit Punch", packageSize: "1", unit: "liter", caseCount: 15, defaultCasePrice: "18.53" },
        { vendorId: pepsi.id, name: "Brisk Lemonade", packageSize: "1", unit: "liter", caseCount: 15, defaultCasePrice: "18.53" },
        { vendorId: pepsi.id, name: "Brisk Pink Lemonade", packageSize: "1", unit: "liter", caseCount: 15, defaultCasePrice: "18.53" },
        { vendorId: pepsi.id, name: "Brisk Blood Orange", packageSize: "1", unit: "liter", caseCount: 15, defaultCasePrice: "18.53" },
        { vendorId: pepsi.id, name: "Brisk Blueberry Pomegranate", packageSize: "1", unit: "liter", caseCount: 15, defaultCasePrice: "18.53" },
        { vendorId: pepsi.id, name: "Pepsi", packageSize: "2", unit: "liter", caseCount: 8, defaultCasePrice: "21.00" },

        // Red Bull
        { vendorId: redbull.id, name: "Red Bull Original", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull Original", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
        { vendorId: redbull.id, name: "Red Bull Sugar Free", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull Sugar Free", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
        { vendorId: redbull.id, name: "Red Bull Tropical", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull Tropical", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
        { vendorId: redbull.id, name: "Red Bull Iced Vanilla Berry", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull Iced Vanilla Berry", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
        { vendorId: redbull.id, name: "Red Bull JuneBerry", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull JuneBerry", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
        { vendorId: redbull.id, name: "Red Bull White Peach", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull White Peach", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
        { vendorId: redbull.id, name: "Red Bull Sudachi Lime", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull Sudachi Lime", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
        { vendorId: redbull.id, name: "Red Bull Coconut", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull Coconut", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
        { vendorId: redbull.id, name: "Red Bull Strawberry Apricot", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull Strawberry Apricot", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
        { vendorId: redbull.id, name: "Red Bull Wild Berries", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull Wild Berries", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
        { vendorId: redbull.id, name: "Red Bull Watermelon", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "40.24", retailPrice: "2.99" },
        { vendorId: redbull.id, name: "Red Bull Watermelon", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "52.96", retailPrice: "3.89" },
      ])
      .returning()

    console.log(`  ✓ Products: ${productRows.length} created`)
  } else {
    console.log(`  ✓ Products: ${existingProducts.length} already exist`)
  }

  console.log("\n✅ Seed complete!")
  await pool.end()
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
