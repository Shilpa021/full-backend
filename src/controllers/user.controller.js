import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password, username } = req.body;

    console.log("Received registration data:", { fullName, email, password: "********", username }); // Mask password in logs

    // Validate user data
    if ([fullName, email, password, username].some(field => field.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existingUser) {
        throw new ApiError(409, "Email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path; // from multer middleware, contains uploaded files (avatar and coverImage)
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    console.log("req.files?.avata-----", req.files?.avatar);

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url, // Store the URL of the uploaded avatar
        coverImage: coverImage?.url || "", // Store the URL of the uploaded cover image
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken"); // Exclude sensitive fields from the response

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating the user");
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));

});

export {
    registerUser,
}