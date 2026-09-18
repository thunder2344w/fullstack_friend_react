require("dotenv").config({ path: __dirname + "/.env" });

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const friendRoutes = require("./routes/friendRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    credentials: true,
    allowedHeaders: [
        "Content-Type",
        "Authorization",
    ],
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../client/dist")));

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
})
.then(() =>{
    console.log("MongoDB connected");
})
.catch((err) =>{
    console.error("MongoDB connection error:", err);
    if (err && err.reason) {
        console.error("MongoDB topology reason:", err.reason);
    }
});

app.use("/api", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chat", chatRoutes);


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});