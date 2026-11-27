import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToVault(fileData, options = {}) {
  const result = await cloudinary.uploader.upload(fileData, options);
  return result;
}

export async function uploadFileToVault(fileData, fileType, options = {}) {
  let resourceType = "image";
  if (fileType === "video") resourceType = "video";
  else if (fileType === "audio")
    resourceType = "video"; // Cloudinary handles audio as video
  else if (fileType === "document") resourceType = "raw";

  const result = await cloudinary.uploader.upload(fileData, {
    resource_type: resourceType,
    ...options,
  });
  return result;
}
