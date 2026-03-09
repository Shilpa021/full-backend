import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: { type: Schema.Types.ObjectId, ref: "User", required: true }, // one who is subscribing to the channel, ref is used to reference the User model, it will store the ObjectId of the user who is subscribing
    channel: { type: Schema.Types.ObjectId, ref: "User", required: true }, // one who is being subscribed to, ref is used to reference the User model, it will store the ObjectId of the user who is being subscribed to
},
    { timestamps: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);