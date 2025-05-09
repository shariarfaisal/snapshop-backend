import { Response } from "express";
import prisma from "../../config/db";
import { ClientAuthRequest } from "../../middleware/clientMiddleware";

export const searchSuggestions = async (req: ClientAuthRequest, res: Response) => {
  try {
    const { query } = req.query;
    const domain = req.subdomain;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "Search query is required" });
    }

    if (!domain) {
      return res.status(400).json({ message: "Store not found" });
    }

    const store = await prisma.store.findFirst({ where: { domain } });
    if (!store) {
      return res.status(400).json({ message: "Store not found" });
    }

    const products = await prisma.product.findMany({
      where: {
        storeId: store.id,
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        basePrice: true,
        media: true,
      },
      take: 5, // Limit to 5 suggestions
    });

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const searchProducts = async (req: ClientAuthRequest, res: Response) => {
  try {
    const { query, page = "1", limit = "10" } = req.query;
    const domain = req.subdomain;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "Search query is required" });
    }

    if (!domain) {
      return res.status(400).json({ message: "Store not found" });
    }

    const store = await prisma.store.findFirst({ where: { domain } });
    if (!store) {
      return res.status(400).json({ message: "Store not found" });
    }

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          storeId: store.id,
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        },
        include: {
          category: true,
          media: true,
        },
        skip,
        take: limitNumber,
      }),
      prisma.product.count({
        where: {
          storeId: store.id,
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        },
      }),
    ]);

    res.json({
      products,
      page: pageNumber,
      limit: limitNumber,
      total,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}; 