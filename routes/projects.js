import express from "express";
import Project from "../models/Project.js";

const router = express.Router();

// GET all
router.get("/", async (req, res) => {
    const items = await Project.find();
    res.json(items);
});

// POST new
router.post("/", async (req, res) => {
    const newProject = new Project(req.body);
    await newProject.save();
    res.json(newProject);
});

export default router;
