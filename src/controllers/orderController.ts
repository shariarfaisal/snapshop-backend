import { Request, Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/authMiddleware";
import { sendEmail } from "../utils/sendEmail";

// POST: Create a new order with customer association
export const createOrder = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const { storeId, customerId, products } = req.body; // Accept customerId
  if (!products || products.length === 0) {
    res.status(400).json({ message: "Order must include products" });
    return;
  }

  try {
    let totalPrice = 0;

    // Validate and calculate total price
    const orderItems = await Promise.all(
      products.map(async (product: { productId: number; quantity: number }) => {
        const productData = await prisma.product.findUnique({
          where: { id: product.productId },
        });

        if (!productData)
          throw new Error(`Product ${product.productId} not found`);
        if (productData.stock < product.quantity)
          throw new Error(`Not enough stock for ${productData.name}`);

        totalPrice += productData.price * product.quantity;

        return {
          productId: product.productId,
          quantity: product.quantity,
          price: productData.price,
        };
      })
    );

    // Create the order with customer association
    const order = await prisma.order.create({
      data: {
        storeId,
        userId: user.userId,
        customerId, // Associate customer to the order
        totalPrice,
        orderItems: { create: orderItems },
      },
      include: { orderItems: true },
    });

    // Update product stock
    await Promise.all(
      products.map((product: { productId: number; quantity: number }) =>
        prisma.product.update({
          where: { id: product.productId },
          data: { stock: { decrement: product.quantity } },
        })
      )
    );

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (customer?.email) {
      const emailHtml = `
          <h2>Order Confirmation</h2>
          <p>Thank you, ${customer.name}, for your order!</p>
          <p>Order Total: $${totalPrice}</p>
          <p>Order Items:</p>
          <ul>
            ${orderItems
              .map(
                (item) =>
                  `<li>${item.quantity} x ${item.productId} - $${item.price}</li>`
              )
              .join("")}
          </ul>
          <p>We will notify you when your order status updates.</p>
        `;

      await sendEmail(customer.email, "Order Confirmation", emailHtml);
    }

    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

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
  const storeId = parseInt(req.query.storeId as string);

  try {
    const orders = await prisma.order.findMany({
      where: { storeId },
      include: { orderItems: { include: { product: true } } },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { status } = req.body;

  try {
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { orderStatus: status },
      include: { customer: true },
    });

    // Send email notification to customer
    if (updatedOrder.customer?.email) {
      const emailHtml = `
          <h2>Order Status Update</h2>
          <p>Your order #${updatedOrder.id} is now <strong>${status}</strong>.</p>
          <p>Thank you for shopping with us!</p>
        `;

      await sendEmail(
        updatedOrder.customer.email,
        "Order Status Update",
        emailHtml
      );
    }

    res.json({ message: "Order status updated successfully" });
  } catch (err) {
    res.status(400).json({ message: "Failed to update order status" });
  }
};
