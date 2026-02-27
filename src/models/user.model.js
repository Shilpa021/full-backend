import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jsonwebToken from "jsonwebtoken";


const userSchema = new Schema({
    username: {type: String, required: true, unique: true, lowercase: true, trim: true, index: true},
    email: {type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: {type: String, required: true, trim: true, index: true},
    avatar: {type: String, required: true},
    coverImage: {type: String},
    watchHistory: [
        {
            type: Schema.Types.ObjectId, 
            ref: "Video"}
    ],
    password: {type: String, required: [true, "Password is required"]},
    refreshToken: {type: String},
}, {timestamps: true});

userSchema.pre("save", async function(next){ // can't use arrow function since we do not access to this keyword in arrow function, we need to use regular function to access this keyword which will point to the document being saved
    if(!this.isModified("password")){ // isModified we get this from mongoose, it checks if the password field is modified or not, if not modified then we do not need to hash the password again, we can just move to next middleware
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next()
}) 

userSchema.methods.isPasswordCorrect = async function(plainPassword){
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function(){
    return jsonwebToken.sign( //sign generates token, we pass the payload which is an object containing userId and username, then we pass the secret key which is stored in environment variable, and then we pass the options which is the expiry time of the token
        {  userId: this._id,  // _id is the default field created by mongoose for each document, it is a unique identifier for each document, we can use it to identify the user in the database
            username: this.username,
            email: this.email, 
            fullName: this.fullName
            },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
}

userSchema.methods.generateRefreshToken = function(){
    return jsonwebToken.sign( //sign generates token, we pass the payload which is an object containing userId and username, then we pass the secret key which is stored in environment variable, and then we pass the options which is the expiry time of the token
        {
            userId: this._id,  // _id is the default field created by mongoose for each document, it is a unique identifier for each document, we can use it to identify the user in the database
            username: this.username,
            email: this.email, 
            fullName: this.fullName
            },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
}

export const User = mongoose.model("User", userSchema);
