import { asyncHandler } from "../utils/asyncHandler.js";
import jwt  from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req, res, next) => {
try {
    const token = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ", "") || req.headers("authorization")?.replace("Bearer ", "");
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

const user = await User.findById(decodedToken?._id)
.select("-password -refreshToken");

if (!user) {
    return res.status(401).json({ success: false, message: "Invalid access token" });
}

req.user = user; // Attach the user object to the request for use in subsequent middleware or route handlers
next();
} catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
}
});
