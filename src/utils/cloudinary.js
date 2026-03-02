import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

//configure Cloudinary with your credentials (replace with your actual credentials) from your Cloudinary dashboard
cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath || !fs.existsSync(localFilePath)){
            throw new Error("Invalid file path provided for upload.");
        }
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto", // Automatically detect the file type (image, video, etc.)
        });
              // if uploaded successfully, you can delete the local file to save space
        console.log("Upload successful", result.url);

        return result;

    } catch (error) {
        fs.unlinkSync(localFilePath); // remove the local file in case of an error
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    }
}

export default uploadOnCloudinary;