import { z } from "zod";
import { AuthRequest } from "../../middleware/authMiddleware";
import prisma from "../../config/db";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";

const attributeSchema = z.object({
  key: z.string().min(1, "Attribute key is required"),
  value: z.string().min(1, "Attribute value is required"),
});

const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  price: z.number().nonnegative("Variant price must be a non-negative number"),
  stock: z
    .number()
    .int()
    .nonnegative("Variant stock must be a non-negative integer"),
  attributes: z.record(z.string()).optional(), // JSON object for attributes
  sku: z.string().optional(),
});

const mediaSchema = z.object({
  url: z.string().url("Invalid media URL"),
  type: z.enum(["image", "video", "document"]),
  altText: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  basePrice: z.number().nonnegative("Base price must be a non-negative number"),
  stock: z.number().int().nonnegative("Stock must be a non-negative integer"),
  storeId: z.number().int().positive("Invalid store ID"),
  categoryId: z.number().int().positive().optional(),
  customFields: z.record(z.string()).optional(), // JSON object for additional metadata
  attributes: z.array(attributeSchema).optional(),
  variants: z.array(variantSchema).optional(),
  media: z.array(mediaSchema).optional(),
});

// POST: Create a new product
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      basePrice,
      stock,
      storeId,
      categoryId,
      variants,
      attributes,
      media,
      customFields,
    } = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        name,
        description,
        basePrice,
        stock,
        storeId,
        categoryId,
        customFields,
        attributes: {
          create: attributes?.map((attr: any) => ({
            key: attr.key,
            value: attr.value,
          })),
        },
        variants: {
          create: variants?.map((variant: any) => ({
            name: variant.name,
            price: variant.price,
            stock: variant.stock,
            attributes: variant.attributes || {},
            sku: variant.sku,
          })),
        },
        media: {
          create: media?.map((item: any) => ({
            url: item.url,
            type: item.type,
            altText: item.altText,
          })),
        },
      },
      include: { variants: true, attributes: true, media: true },
    });

    res.status(201).json(product);
    return;
  } catch (err: any) {
    console.log(err);
    if (err.issues) {
      res.status(400).json({
        message: "Validation error",
        errors: err.issues.map((issue: any) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.log("code", err.code);
      if (err.code === "P2002") {
        res.status(400).json({ message: "Product already exists" });
        return;
      }
    }

    res.status(400).json({ error: err.message || "Failed to create product" });
  }
};
