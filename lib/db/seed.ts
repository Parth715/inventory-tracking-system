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
        { vendorId: coke.id, name: "Coca-Cola Classic", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "30.00" },
        { vendorId: coke.id, name: "Coca-Cola Classic", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "28.00" },
        { vendorId: coke.id, name: "Coca-Cola Classic", packageSize: "2", unit: "liter", caseCount: 8, defaultCasePrice: "22.00" },
        { vendorId: coke.id, name: "Sprite", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "30.00" },
        { vendorId: coke.id, name: "Sprite", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "28.00" },
        { vendorId: coke.id, name: "Dr Pepper", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "30.00" },
        { vendorId: coke.id, name: "Dasani Water", packageSize: "16", unit: "oz", caseCount: 24, defaultCasePrice: "18.00" },
        { vendorId: coke.id, name: "Coca-Cola Classic Bottles", packageSize: "11", unit: "oz", caseCount: 24, defaultCasePrice: "25.00" },

        // Pepsi
        { vendorId: pepsi.id, name: "Pepsi", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "29.00" },
        { vendorId: pepsi.id, name: "Pepsi", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "27.00" },
        { vendorId: pepsi.id, name: "Pepsi", packageSize: "2", unit: "liter", caseCount: 8, defaultCasePrice: "21.00" },
        { vendorId: pepsi.id, name: "Mountain Dew", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "29.00" },
        { vendorId: pepsi.id, name: "Mountain Dew", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "27.00" },
        { vendorId: pepsi.id, name: "Gatorade", packageSize: "20", unit: "oz", caseCount: 24, defaultCasePrice: "32.00" },
        { vendorId: pepsi.id, name: "Aquafina Water", packageSize: "16", unit: "oz", caseCount: 24, defaultCasePrice: "17.00" },

        // Red Bull
        { vendorId: redbull.id, name: "Red Bull Original", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "38.00" },
        { vendorId: redbull.id, name: "Red Bull Original", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "48.00" },
        { vendorId: redbull.id, name: "Red Bull Sugar Free", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "38.00" },
        { vendorId: redbull.id, name: "Red Bull Sugar Free", packageSize: "12", unit: "oz", caseCount: 24, defaultCasePrice: "48.00" },
        { vendorId: redbull.id, name: "Red Bull Tropical", packageSize: "8.4", unit: "oz", caseCount: 24, defaultCasePrice: "38.00" },
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
