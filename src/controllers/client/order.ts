import { Response } from "express";
import prisma from "../../config/db";
import { ClientAuthRequest } from "../../middleware/clientMiddleware";
import { z } from "zod";
import { sendEmail } from "../../utils/sendEmail";

const cartItemSchema = z.object({
  id: z.number(),
  quantity: z.number(),
  variantId: z.number().optional(),
});

const orderSchema = z.object({
  items: z.array(cartItemSchema),
  shippingAddress: z.string(),
});

export const createOrder = async (req: ClientAuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { userId, storeId } = user;
  const { items, shippingAddress } = orderSchema.parse(req.body);

  if (!items || !items.length) {
    res.status(400).json({ message: "Items can't be empty" });
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
      image: prod.media?.[0]?.url,
      stock: prod.stock,
      quantity: item.quantity,
      variant,
      price,
      total,
    };
  });

  try {
    let totalPrice = 0;

    const items = cartItems.reduce(
      (acc, product) => {
        if (product) {
          if (product.stock < product.quantity)
            throw new Error(`Not enough stock for ${product.name}`);

          totalPrice += product.price * product.quantity;

          const details = {
            name: product.name,
            variantId: product.variant?.id,
            image: product.image,
          };

          acc.push({
            productId: product.id,
            quantity: product.quantity,
            price: product.price,
            details: JSON.stringify(details),
          });
        }

        return acc;
      },
      [] as {
        productId: number;
        quantity: number;
        price: number;
        details: string;
      }[]
    );

    // Validate and calculate total price
    const orderItems = await Promise.all(items);

    // Create the order with customer association
    const order = await prisma.order.create({
      data: {
        storeId,
        customerId: userId,
        totalPrice,
        orderItems: { create: orderItems },
        shippingAddress,
      },
      include: { orderItems: true },
    });

    // Update product stock
    await Promise.all(
      items.map((product: { productId: number; quantity: number }) =>
        prisma.product.update({
          where: { id: product.productId },
          data: { stock: { decrement: product.quantity } },
        })
      )
    );

    // const customer = await prisma.customer.findUnique({
    //   where: { id: userId },
    // });

    // if (customer?.email) {
    //   const emailHtml = `
    //         <h2>Order Confirmation</h2>
    //         <p>Thank you, ${customer.name}, for your order!</p>
    //         <p>Order Total: $${totalPrice}</p>
    //         <p>Order Items:</p>
    //         <ul>
    //           ${orderItems
    //             .map(
    //               (item) =>
    //                 `<li>${item.quantity} x ${item.productId} - $${item.price}</li>`
    //             )
    //             .join("")}
    //         </ul>
    //         <p>We will notify you when your order status updates.</p>
    //       `;

    //   await sendEmail(customer.email, "Order Confirmation", emailHtml);
    // }

    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
