import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageToCloudinary(
  fileBase64: string,
  folder = "cv-generator/avatars"
): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // If Cloudinary is not configured, return base64 string directly so uploads still work seamlessly
  if (!cloudName || !apiKey || !apiSecret || cloudName === "your_cloud_name") {
    console.warn(
      "[CLOUDINARY] Credentials not configured. Storing image as data URL fallback."
    );
    return fileBase64;
  }

  const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
    folder,
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });

  return uploadResponse.secure_url;
}

export default cloudinary;
