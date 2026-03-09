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
            $unset: { refreshToken: 1 }, // Use $unset operator to remove the refreshToken field from the user document in the database
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

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    const user = await User.findById(req.user._id)
    const isOldPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isOldPasswordValid) {
        throw new ApiError(401, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: true }); // Ensure validation is performed when saving the new password

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user retrieved successfully"));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    // Validate the input
    if (!fullName || !email) {
        throw new ApiError(400, "Full name and email are required");
    }

    // Update the user details
    const user = await User.findByIdAndUpdate(req.user._id,
        { $set: { fullName, email } },
        { new: true }).select("-password"); // returns updated info
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path; // from multer middleware, contains uploaded file (avatar)

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(500, "Something went wrong while uploading the avatar");
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        { $set: { avatar: avatar.url } },
        { new: true }).select("-password"); // returns updated info

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path; // from multer middleware, contains uploaded file (cover image)

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(500, "Something went wrong while uploading the cover image");
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }).select("-password"); // returns updated info

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username.trim()) {
        throw new ApiError(400, "Username is required");
    }
    const channel = await User.aggregate([
        { $match: { username: username?.toLowerCase() } },
        {
            $lookup: { // perform a left outer join with the subscriptions collection to get the subscriptions of the user
                from: "subscriptions", // collection name in MongoDB
                localField: "_id",
                foreignField: "channel", // field in the subscriptions collection that references the user
                as: "subscribers"
            }
        },
        {
            $lookup: { // perform a left outer join with the subscriptions collection to get the subscribers of the user
                from: "subscriptions", // collection name in MongoDB
                localField: "_id",
                foreignField: "subscriber", // field in the subscriptions collection that references the user
                as: "subscribedTo"
            }
        },
        {
            $addFields: { // add a new field subscriberCount to the channel document which is the size of the subscribers array
                subscribersCount: { $size: "$subscribers" },
                channelsSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: { // add a new field isSubscribed to the channel document which is true if the user is subscribed to the channel and false otherwise
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] }, // check if the user is in the subscribers array
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: { // exclude the password and refreshToken fields from the channel document
                fullName: 1,
                username: 1,
                subscriberCount: 1, // exclude the subscribers array from the channel document since we only need the count
                channelsSubscribedToCount: 1, // exclude the subscribedTo array from the channel document since we only need the count
                isSubscribed: 1, // include the isSubscribed field in the channel document
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])

    console.log("Channel profile data:", channel);

    if (!channel || channel.length === 0) { // check if the channel array is empty or not found     
        throw new ApiError(404, "Channel not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile retrieved successfully"));
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.user._id) } }, // this is done to convert the string userId to ObjectId type which is required for the $match stage in the aggregation pipeline
        {
            $lookup: { // perform a left outer join with the videos collection to get the watch history of the user
                from: "videos", // collection name in MongoDB
                localField: "watchHistory", // field in the user document that contains the video IDs in the watch history
                foreignField: "_id", // field in the videos collection that is referenced by the watchHistory field in the user document
                as: "watchHistory", // name of the new field that will be added to the user document which will contain the details of the videos in the watch history
                pipeline: [{
                    $lookup: {
                        from: "users", // collection name in MongoDB
                        localField: "owner", // field in the videos document that contains the user ID of the owner of the video
                        foreignField: "_id", // field in the users collection that is referenced by the owner field in the videos document
                        as: "owner", // name of the new field that will be added to the videos document which will contain the details of the owner of the video
                        pipeline: [
                            {
                                $project: { // exclude the password and refreshToken fields from the owner document since we don't need them in the watch history response
                                    fullName: 1,
                                    username: 1,
                                }
                            }],

                    },
                    $addFields: { // add a new field owner to the videos document which will contain the details of the owner of the video
                        owner: { $first: "$owner" }
                    }
                }]
            }
        },

    ])

    return res
        .status(200)
        .json(new ApiResponse(
            200, 
            user[0].watchHistory, 
            "Watch history retrieved successfully"));      
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}