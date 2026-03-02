export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise
        .resolve(fn(req, res, next))
        .catch((error) => {
            res.status(error.code || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
            // No need to re-throw the error here, as we've already handled it and sent a response
        });
    }
}




// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(error.code || 500).json({ 
//             success: false,
//             message: error.message || "Internal Server Error",
//         });
//         console.error("Error in asyncHandler:", error);
//         throw error; // Re-throw the error to be handled by Express's error handling middleware
//     }
// }

// export default asyncHandler;