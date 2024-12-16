import { Request, Response } from "express";
import prisma from "../config/db";

// GET: Retrieve all customers
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { orders: true },
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch customers" });
  }
};

// GET: Retrieve a single customer
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { orders: true },
    });

    if (!customer) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }

    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch customer" });
  }
};

// POST: Create a new customer
export const createCustomer = async (req: Request, res: Response) => {
  const { name, email, phone, address } = req.body;

  try {
    const newCustomer = await prisma.customer.create({
      data: { name, email, phone, address },
    });
    res.status(201).json(newCustomer);
  } catch (err: any) {
    res
      .status(400)
      .json({ message: "Failed to create customer", error: err.message });
  }
};

// PUT: Update a customer
export const updateCustomer = async (req: Request, res: Response) => {
  const { name, email, phone, address } = req.body;

  try {
    const updatedCustomer = await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: { name, email, phone, address },
    });
    res.json(updatedCustomer);
  } catch (err: any) {
    res
      .status(400)
      .json({ message: "Failed to update customer", error: err.message });
  }
};

// DELETE: Delete a customer
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    await prisma.customer.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete customer" });
  }
};
