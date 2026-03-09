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

// Use the async style pre-save hook without the `next` parameter. When the
// hook function returns a promise (async), Mongoose will wait for it — this
// avoids cases where `next` isn't passed and `next is not a function` is thrown.
userSchema.pre("save", async function() {
    // can't use arrow function since we need `this` to point to the document
    if (!this.isModified("password")) {
        return;
    }
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function(plainPassword){
    // Use the provided plainPassword variable (was referencing undefined `password`)
    return await bcrypt.compare(plainPassword, this.password);
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
