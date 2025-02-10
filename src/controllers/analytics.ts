import { Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/authMiddleware";

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  const { storeId, startDate, endDate } = req.query;

  try {
    const filters: any = {
      storeId: storeId ? Number(storeId) : undefined,
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
      where: { storeId: storeId ? Number(storeId) : undefined },
    });

    const newCustomers = await prisma.customer.count({
      where: {
        storeId: storeId ? Number(storeId) : undefined,
        createdAt: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined,
        },
      },
    });

    // 5. Top-selling products (based on quantity)
    const topSellingProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: filters,
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

    // Fetch product names using the productIds
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds, // Match productIds
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Attach the product names to the top-selling products
    const topSellingProductsWithNames = topSellingProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        ...item,
        productName: product?.name || "Unknown", // Attach product name
      };
    });

    // 7. Product Inventory Metrics
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: {
          lt: 5, // Example threshold for low stock
        },
        storeId: storeId ? Number(storeId) : undefined,
      },
    });

    // 8. Sales Growth (Weekly / Monthly)
    const lastMonthSales = await prisma.order.aggregate({
      where: {
        storeId: storeId ? Number(storeId) : undefined,
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Last month
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const currentMonthSales = await prisma.order.aggregate({
      where: {
        storeId: storeId ? Number(storeId) : undefined,
        createdAt: {
          gte: new Date(new Date().setDate(1)), // Current month
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const salesGrowth =
      (currentMonthSales._sum.totalPrice || 0) -
      (lastMonthSales._sum.totalPrice || 0);

    // get all sales data group by store
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

    // Respond with the collected analytics
    res.json({
      totalSales: totalSales._sum.totalPrice,
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
    console.log(err);
    res.status(500).json({ message: "Failed to fetch analytics data" });
  }
};
