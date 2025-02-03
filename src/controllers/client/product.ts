import { Response } from "express";
import prisma from "../../config/db";
import { ClientAuthRequest } from "../../middleware/clientMiddleware";
import { z } from "zod";

export const getProducts = async (req: ClientAuthRequest, res: Response) => {
  const { subdomain } = req;
  const { name, page = 0, limit = 100 } = req.query;

  if (!subdomain) {
    res.json({ error: "Invalid request" });
    return;
  }

  let skip = Number(page) * Number(limit) - Number(limit);
  const where: any = {
    store: {
      domain: {
        equals: subdomain,
      },
    },
  };

  // Prepare OR condition for the name search
  if (name) {
    where.OR = [
      {
        name: {
          contains: String(name),
          mode: "insensitive",
        },
      },
      {
        attributes: {
          some: {
            value: {
              contains: String(name),
              mode: "insensitive",
            },
          },
        },
      },
      {
        variants: {
          some: {
            name: {
              contains: String(name),
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  try {
    const products = await prisma.product.findMany({
      where: where,
      take: Number(limit),
      skip,
      include: {
        variants: true,
        media: true,
        category: true,
      },
    });

    const total = await prisma.product.count({
      where: where,
    });

    res.json({ total, page, limit, products });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch products" });
    return;
  }
};

export const getProductById = async (req: ClientAuthRequest, res: Response) => {
  const { subdomain } = req;
  const { id } = req.params;

  if (!subdomain) {
    res.json({ error: "Invalid request" });
    return;
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: Number(id),
        store: {
          domain: {
            equals: subdomain,
          },
        },
      },
      include: {
        variants: true,
        media: true,
        category: true,
        attributes: true,
      },
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json(product);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch product" });
    return;
  }
};

const cartItemSchema = z.object({
  id: z.number(),
  quantity: z.number(),
  variantId: z.number().optional(),
});

const cartSchema = z.object({
  items: z.array(cartItemSchema),
});

export const getCartDetails = async (req: ClientAuthRequest, res: Response) => {
  try {
    const { items } = cartSchema.parse(req.body);

    if (!items || !items.length) {
      res.json([]);
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: items.map((item) => item.id),
        },
      },
      include: {
        variants: true,
        media: true,
        category: true,
      },
    });

    const cartItems = items.map((item) => {
      const prod = products.find((p) => p.id === item.id);
      if (!prod) return null;
      let variant = prod.variants?.find((v) => v.id === item.variantId);
      let price = prod.basePrice;
      let total = price * item.quantity;
      if (variant) {
        price = variant.price;
        total = price * item.quantity;
      }

      return {
        id: prod.id,
        name: prod.name,
        quantity: item.quantity,
        variant,
        price,
        total,
      };
    });

    res.json(cartItems);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};
