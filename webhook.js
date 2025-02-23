require('dotenv').config();
const {Webhook} = require('svix')
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// Connect to MongoDB
console.log("Connecting to MongoDB...");
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("database connected")
});
console.log("Connected to MongoDB");
const User = mongoose.connection.collection("users");

app.post("/webhooks", async (req, res) => {
    try {
        console.log("Request hit webhook endpoint");
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
        const payload = JSON.stringify(req.body);

        whook.verify(payload, {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        });
        console.log("Svix verified");
        const { data, type } = req.body;
        console.log(`Webhook event type: ${type}`);

        switch (type) {
            case 'user.created': {
                console.log("Processing user.created event");
                const newUser = new User({
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: `${data.first_name} ${data.last_name}`,
                    image: data.image_url,
                    resume: ''
                });

                await newUser.save();
                console.log("User created successfully");
                return res.json({ message: "User created successfully" });
            }

            case 'user.updated': {
                console.log("Processing user.updated event");
                await User.findByIdAndUpdate(data.id, {
                    name: `${data.first_name} ${data.last_name}`,
                    email: data.email_addresses[0].email_address,
                    image: data.image_url
                });
                console.log("User updated successfully");
                return res.json({ message: "User updated successfully" });
            }

            case 'user.deleted': {
                console.log("Processing user.deleted event");
                await User.findByIdAndDelete(data.id);
                console.log("User deleted successfully");
                return res.json({ message: "User deleted successfully" });
            }

            default:
                console.log("Unknown webhook event");
                return res.status(400).json({ error: "Unknown webhook event" });
        }
    } catch (err) {
        console.error("Webhook error:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});