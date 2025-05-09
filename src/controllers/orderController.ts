import { Request, Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/authMiddleware";
import { sendEmail } from "../utils/sendEmail";
import { z } from "zod";

// GET: Retrieve all orders for a customer
// GET: Retrieve all orders for a customer with pagination and filtering
export const getOrdersByCustomer = async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { page = 1, limit = 10, orderStatus } = req.query;

  try {
    const pageNumber = Number(page);
    const pageSize = Number(limit);

    const filters: any = { customerId: parseInt(customerId) };
    if (orderStatus) {
      filters.orderStatus = String(orderStatus);
    }

    const orders = await prisma.order.findMany({
      where: filters,
      include: { orderItems: { include: { product: true } } },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" }, // Sort by latest orders
    });

    const totalOrders = await prisma.order.count({ where: filters });

    res.json({
      total: totalOrders,
      page: pageNumber,
      limit: pageSize,
      orders,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch customer orders" });
  }
};

// GET: Retrieve all orders for a store
export const getOrders = async (req: AuthRequest, res: Response) => {
  const {
    page = 1,
    limit = 10,
    storeId,
    status,
    customerId,
    search,
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const searchQuery: any = {};

  if (search && String(search)[0] === "#") {
    searchQuery.id = Number(String(search).slice(1));
  } else if (search) {
    searchQuery.OR = [
      {
        customer: {
          name: {
            contains: String(search),
            mode: "insensitive",
          },
        },
      },
      {
        customer: {
          email: {
            contains: String(search),
            mode: "insensitive",
          },
        },
      },
      {
        customer: {
          phone: {
            contains: String(search),
            mode: "insensitive",
          },
        },
      },
      {
        orderItems: {
          some: {
            product: {
              name: {
                contains: String(search),
                mode: "insensitive",
              },
            },
          },
        },
      },
    ];
  }

  if (storeId) {
    searchQuery.storeId = Number(storeId);
  }

  if (status) {
    searchQuery.orderStatus = String(status);
  }

  if (customerId) {
    searchQuery.customerId = Number(customerId);
  }

  try {
    const orders = await prisma.order.findMany({
      where: searchQuery,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        orderItems: { include: { product: true } },
        customer: true,
        store: true,
      },
    });

    const total = await prisma.order.count({
      where: {
        storeId: storeId ? Number(storeId) : undefined,
        orderStatus: status ? String(status) : undefined,
      },
    });

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      orders,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                media: true,
              },
            },
          },
        },
        customer: true,
      },
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

const updateOrderStatusSchema = z.object({
  status: z.enum(["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]),
});

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const orderId = parseInt(req.params.id);
    const { status } = updateOrderStatusSchema.parse(req.body);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Check if order exists and belongs to user's store
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        store: {
          userId,
        },
      },
      include: {
        customer: true,
      },
    });

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });

    res.json(updatedOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid status value" });
      return;
    }
    res.status(500).json({ message: "Failed to update order status" });
  }
};
