import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema({
    videoFile: {type: String, required: true}, // from cloudanary
    title: {type: String, required: true},
    description: {type: String, required: true},
    duration: {type: Number, required: true}, // duration in seconds
    views: {type: Number, default: 0},
    isPublished: {type: Boolean, default: false},
    owner: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    thumbnail: {type: String, required: true},
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
}, { timestamps: true});

const Video = mongoose.model("Video", videoSchema);

//aggregation pipeline
videoSchema.plugin(mongooseAggregatePaginate);

export default Video;