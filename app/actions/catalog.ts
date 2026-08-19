"use server"

import { db } from "@/lib/db"
import { locations, products, vendors } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/* ----------------------------- Locations ----------------------------- */

export async function getLocations() {
  return db.select().from(locations).orderBy(asc(locations.name))
}

export async function createLocation(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Location name is required")
  const [row] = await db
    .insert(locations)
    .values({ name: trimmed })
    .returning()
  revalidatePath("/locations")
  revalidatePath("/orders/new")
  return row
}

export async function updateLocation(id: number, name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Location name is required")
  await db.update(locations).set({ name: trimmed }).where(eq(locations.id, id))
  revalidatePath("/locations")
  revalidatePath("/")
}

export async function deleteLocation(id: number) {
  await db.delete(locations).where(eq(locations.id, id))
  revalidatePath("/locations")
}

/* ----------------------------- Vendors ----------------------------- */

export async function getVendors() {
  return db.select().from(vendors).orderBy(asc(vendors.name))
}

export async function createVendor(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Vendor name is required")
  const [row] = await db.insert(vendors).values({ name: trimmed }).returning()
  revalidatePath("/vendors")
  revalidatePath("/orders/new")
  return row
}

export async function updateVendor(id: number, name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Vendor name is required")
  await db.update(vendors).set({ name: trimmed }).where(eq(vendors.id, id))
  revalidatePath("/vendors")
  revalidatePath("/")
}

export async function deleteVendor(id: number) {
  await db.delete(products).where(eq(products.vendorId, id))
  await db.delete(vendors).where(eq(vendors.id, id))
  revalidatePath("/vendors")
  revalidatePath("/products")
}

/* ----------------------------- Products ----------------------------- */

export type ProductInput = {
  vendorId: number
  name: string
  packageSize: number
  unit: string
  caseCount: number
  defaultCasePrice: number | null
  retailPrice: number | null
}

export async function getProducts() {
  const list = await db.select().from(products)
  return list.sort((a, b) => {
    const sizeA = Number(a.packageSize) || 0
    const sizeB = Number(b.packageSize) || 0
    if (sizeA !== sizeB) return sizeA - sizeB
    return a.name.localeCompare(b.name)
  })
}

export async function getProductsByVendor(vendorId: number) {
  const list = await db
    .select()
    .from(products)
    .where(eq(products.vendorId, vendorId))
  return list.sort((a, b) => {
    const sizeA = Number(a.packageSize) || 0
    const sizeB = Number(b.packageSize) || 0
    if (sizeA !== sizeB) return sizeA - sizeB
    return a.name.localeCompare(b.name)
  })
}

export async function createProduct(input: ProductInput) {
  const name = input.name.trim()
  if (!name) throw new Error("Product name is required")
  if (!input.vendorId) throw new Error("Vendor is required")
  const [row] = await db
    .insert(products)
    .values({
      vendorId: input.vendorId,
      name,
      packageSize: String(input.packageSize ?? 0),
      unit: input.unit || "oz",
      caseCount: input.caseCount ?? 0,
      defaultCasePrice:
        input.defaultCasePrice == null ? null : String(input.defaultCasePrice),
      retailPrice:
        input.retailPrice == null ? null : String(input.retailPrice),
    })
    .returning()
  revalidatePath("/products")
  revalidatePath("/orders/new")
  return row
}

export async function updateProduct(id: number, input: ProductInput) {
  const name = input.name.trim()
  if (!name) throw new Error("Product name is required")
  await db
    .update(products)
    .set({
      vendorId: input.vendorId,
      name,
      packageSize: String(input.packageSize ?? 0),
      unit: input.unit || "oz",
      caseCount: input.caseCount ?? 0,
      defaultCasePrice:
        input.defaultCasePrice == null ? null : String(input.defaultCasePrice),
      retailPrice:
        input.retailPrice == null ? null : String(input.retailPrice),
    })
    .where(eq(products.id, id))
  revalidatePath("/products")
}

export async function deleteProduct(id: number) {
  await db.delete(products).where(eq(products.id, id))
  revalidatePath("/products")
}
