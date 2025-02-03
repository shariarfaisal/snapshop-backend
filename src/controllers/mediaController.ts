import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest } from "../middleware/authMiddleware";
import { Response } from "express";

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    // Make sure the upload folder exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4(); // Generate a unique ID for the file
    const fileExtension = path.extname(file.originalname); // Get file extension
    const filename = `${uniqueId}${fileExtension}`; // Rename the file
    cb(null, filename);
  },
});

// File filter (optional, to check file types)
const fileFilter = (
  req: AuthRequest,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedTypes = /jpg|jpeg|png|gif|mp4/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Error: Only image and video files are allowed!"));
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10 MB
});

// Upload controller
const uploadFile = (req: AuthRequest, res: Response) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: "File upload error", error: err });
    } else if (err) {
      return res.status(400).json({ message: err });
    }

    // Generate the public URL of the uploaded file
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file?.filename
    }`;

    let fileType: "image" | "video" | "document";
    if (req.file?.mimetype.startsWith("image")) {
      fileType = "image";
    } else if (req.file?.mimetype.startsWith("video")) {
      fileType = "video";
    } else {
      fileType = "document";
    }

    // Respond with the full URL of the uploaded file
    res.status(201).json({
      message: "File uploaded successfully!",
      fileUrl,
      fileType,
    });
  });
};

const deleteFile = (req: AuthRequest, res: Response) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, `../uploads/${fileName}`);

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: "File not found" });
    return;
  }

  // Delete the file
  fs.unlink(filePath, (err) => {
    if (err) {
      res.status(500).json({ message: "Failed to delete file" });
      return;
    }
    res.json({ message: "File deleted successfully" });
  });
};

const getFiles = (req: AuthRequest, res: Response) => {
  const uploadPath = path.join(__dirname, "../uploads");
  fs.readdir(uploadPath, (err, files) => {
    if (err) {
      res.status(500).json({ message: "Failed to fetch files" });
      return;
    }
    res.json(files);
  });
};

export { uploadFile, deleteFile, getFiles };
