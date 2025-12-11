import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    desc: { type: String, required: true },
    link: { type: String },
    image: { type: String }
});

export default mongoose.model("Project", ProjectSchema);
