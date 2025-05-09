import { Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/authMiddleware";

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  const { storeId, startDate, endDate } = req.query;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Get user's stores
    const userStores = await prisma.store.findMany({
      where: { userId },
      select: { id: true },
    });

    const storeIds = userStores.map(store => store.id);

    if (storeIds.length === 0) {
      return res.json({
        totalSales: 0,
        totalOrders: 0,
        orderStatusCount: [],
        customerCount: 0,
        newCustomers: 0,
        topSellingProducts: [],
        lowStockProducts: [],
        salesGrowth: 0,
        sales: [],
      });
    }

    const filters: any = {
      storeId: storeId ? Number(storeId) : { in: storeIds },
    };

    if (startDate && endDate) {
      filters.createdAt = {
        gte: startDate ? new Date(startDate as string) : undefined,
        lte: endDate ? new Date(endDate as string) : undefined,
      };
    }

    // 1. Total Sales (sum of totalPrice from orders)
    const totalSales = await prisma.order.aggregate({
      where: filters,
      _sum: {
        totalPrice: true,
      },
    });

    // 2. Order Count (Total number of orders)
    const totalOrders = await prisma.order.count({
      where: filters,
    });

    // 3. Order Status Count (Grouped by order status)
    const orderStatusCount = await prisma.order.groupBy({
      by: ["orderStatus"],
      where: filters,
      _count: {
        id: true,
      },
    });

    // 4. Customer Metrics
    const customerCount = await prisma.customer.count({
      where: { 
        storeId: storeId ? Number(storeId) : { in: storeIds }
      },
    });

    const newCustomers = await prisma.customer.count({
      where: {
        storeId: storeId ? Number(storeId) : { in: storeIds },
        createdAt: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined,
        },
      },
    });

    // 5. Top-selling products
    const topSellingProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: filters,
      },
      _sum: {
        quantity: true,
        price: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    const productIds = topSellingProducts.map((item) => item.productId);

    // Fetch product names
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const topSellingProductsWithNames = topSellingProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        ...item,
        productName: product?.name || "Unknown",
      };
    });

    // 7. Product Inventory Metrics
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: {
          lt: 5,
        },
        storeId: storeId ? Number(storeId) : { in: storeIds },
      },
    });

    // 8. Sales Growth (Monthly)
    const lastMonthSales = await prisma.order.aggregate({
      where: {
        ...filters,
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const currentMonthSales = await prisma.order.aggregate({
      where: {
        ...filters,
        createdAt: {
          gte: new Date(new Date().setDate(1)),
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const salesGrowth =
      (currentMonthSales._sum.totalPrice || 0) -
      (lastMonthSales._sum.totalPrice || 0);

    // Get sales data grouped by store
    const storeSales = await prisma.order.groupBy({
      by: ["storeId"],
      where: filters,
      _sum: {
        totalPrice: true,
      },
    });

    const stores = await prisma.store.findMany({
      where: {
        id: {
          in: storeSales.map((item) => item.storeId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const sales = storeSales.map((item) => {
      const store = stores.find((s) => s.id === item.storeId);
      return {
        storeId: item.storeId,
        total: item._sum.totalPrice,
        name: store?.name || "Unknown",
      };
    });

    res.json({
      totalSales: totalSales._sum.totalPrice || 0,
      totalOrders,
      orderStatusCount,
      customerCount,
      newCustomers,
      topSellingProducts: topSellingProductsWithNames,
      lowStockProducts,
      salesGrowth,
      sales,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch analytics data" });
  }
};
