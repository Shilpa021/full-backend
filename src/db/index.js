import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDb = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Connected to MongoDB successfully!! : DB host: ", connectionInstance.connection.host);

    } catch(error){
        console.error("Error connecting to MongoDB:", error);
        // keep the existing behavior for now (exit on failure)
        process.exit(1);
    }
}

export default connectDb;