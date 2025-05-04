// image.model.js
import mongoose from "mongoose";

const imageSchema = mongoose.Schema({
    image : {type: String}
    
})

const ImageModel = mongoose.model("images", imageSchema)

export default ImageModel