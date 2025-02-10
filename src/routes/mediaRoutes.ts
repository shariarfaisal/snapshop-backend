import { Router } from "express";
import { deleteFile, getFiles, uploadFile } from "../controllers";
const router = Router();

router.post("/upload", uploadFile);
router.delete("/upload/:fileName", deleteFile);
router.get("/files", getFiles);

export default router;
