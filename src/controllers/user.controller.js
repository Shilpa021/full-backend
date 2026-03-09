import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); // Skip validation since we're only updating the refreshToken field

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
}

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
    let coverImageLocalPath
    if (req.files?.coverImage && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    else {
        coverImageLocalPath = ""; // or you can set a default cover image path if you have one
    }

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

const loginUser = asyncHandler(async (req, res) => {
    // enter fileds: email, password
    // validate user data
    // find in db
    // if found compare password
    // if password is correct generate access token and refresh token and send to client
    const { email, username, password } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "Email or username is required");
    }

    const user = await User.findOne({
        $or: [
            { email },
            { username }
        ]

    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken"); // Exclude sensitive fields from the response
    const options = {
        httpOnly: true, // Make the cookie inaccessible to JavaScript on the client side
        secure: process.env.NODE_ENV === "production", // Set secure flag in production
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    // Clear the access token and refresh token cookies
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: { refreshToken: undefined },
            new: true // Clear the refresh token in the database
        }); // Clear the refresh token from the database

    const options = {
        httpOnly: true, // Make the cookie inaccessible to JavaScript on the client side
        secure: true, // Set secure flag in production
    };

    return res
        .status(200)
        .clearCookie("accessToken", options) // Clear access token cookie
        .clearCookie("refreshToken", options) // Clear refresh token cookie
        .json(new ApiResponse(200, "User logged out successfully"));
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(400, "Refresh token is required");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id);
        console.log("Decoded token:", decodedToken);
        if (!user || user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }
    
        const options = {
            httpOnly: true, // Make the cookie inaccessible to JavaScript on the client side
            secure: true, // Set secure flag in production
        };
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed successfully"));
    } catch (error) {
        console.error("Error refreshing access token:", error);
        throw new ApiError(500, "Internal server error");
    }
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}