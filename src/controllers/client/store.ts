import { Response } from "express";
import prisma from "../../config/db";
import { ClientAuthRequest } from "../../middleware/clientMiddleware";

export const getStoreDetails = async (
  req: ClientAuthRequest,
  res: Response
) => {
  try {
    const domain = req.subdomain;
    if (!domain) {
      res.status(400).json({ message: "Invalid request" });
      return;
    }
    const store = await prisma.store.findFirst({
      where: {
        domain,
      },
    });

    if (!store) {
      res.status(404).json({ message: "Not Found!" });
      return;
    }

    res.status(200).json(store);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};
