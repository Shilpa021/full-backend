import dotenv from "dotenv";
import connectDb from "./db/index.js";
import app from "./app.js";

// Load environment variables from the project's .env file (default).
// Previously this used a wrong path ("./env") which prevented dotenv from
// loading variables like MONGODB_URI. Use the default so .env at project root
// is picked up when the app is started from the project directory.
dotenv.config();


connectDb()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
}).catch((error) => {
    console.error("Error during database connection:", error);
    process.exit(1); // Exit the process with an error code
});





// import mongoose from "mongoose";
// import DB_NAME from "./constants.js";
// import express from "express";

// const app = express();

// //first approach to connect to mongodb and start the server, second is in dn folder
// // ;( async() => {
// //     try{
// //         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
// //         app.on("error", (error) => {
// //             console.error("Error starting the server:", error);
// //             throw error;
// //         });
// //         app.listen(process.env.PORT, () => {
// //             console.log(`Server is running on port ${process.env.PORT}`);
// //         });
// //     } catch(error){
// //         console.error("Error connecting to MongoDB:", error);
// //         throw error;
// //     }
// // })()