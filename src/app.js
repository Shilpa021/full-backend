import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN, // Allow requests from this origin
    credentials: true, // Allow cookies to be sent with requests
}));

app.use(express.json({
    limit: '16kb', // Set the maximum request body size to 16KB
})); // Middleware to parse JSON request bodies

app.use(express.urlencoded({
    extended: true, // Use the qs library for parsing URL-encoded data
    limit: '16kb', // Set the maximum request body size to 16KB
})); // Middleware to parse URL-encoded request bodies

app.use(express.static('public')); // Serve static files from the 'public' directory

app.use(cookieParser()); // Middleware to parse cookies from incoming requests

//Routes import
import userRouter from "./routes/user.routes.js";


//routes declaration
app.use("/api/v1/users", userRouter);
// http://localhost:8000/api/v1/users/register - this will be the endpoint for user registration, and it will be handled by the userRouter which is imported from the user.routes.js file. The userRouter will define the specific routes and handlers for user-related operations, such as registration, login, etc.


export default app;