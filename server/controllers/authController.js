const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;
const authLogFile = path.join(__dirname, "..", "auth_errors.log");

function logAuthError(err) {
    const text = `${new Date().toISOString()} ERROR ${err.stack || err}\n`;
    fs.appendFileSync(authLogFile, text);
}

function logAuthInfo(message) {
    const text = `${new Date().toISOString()} INFO ${message}\n`;
    fs.appendFileSync(authLogFile, text);
}

exports.signup = async (req, res) => {
    try {
        logAuthInfo(`signup request body: ${JSON.stringify(req.body)}`);
        logAuthInfo(`JWT_SECRET present: ${!!JWT_SECRET}`);
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All field are required",
            });
        }

        const passwordRegex = /^(?=.*\d).{8,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters and contain a number",
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
            },
        });
    } catch (err) {
        console.error(err);
        logAuthError(err);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.login = async (req, res) => {
    try {
        logAuthInfo(`login request body: ${JSON.stringify(req.body)}`);
        logAuthInfo(`JWT_SECRET present: ${!!JWT_SECRET}`);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isPasswordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
        });

    } catch (err) {
        console.error(err);
        logAuthError(err);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.profile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("name email");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            message: "Welcome to your profile",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "none",
        secure: false,
    });
    res.json({
        message: "Logged out successfully",
    });
}