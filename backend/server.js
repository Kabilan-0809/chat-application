const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());
app.use(cors({ origin: "https://kabilan-0809.github.io/chat-application/", credentials: true }));
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Connection Failed", err));

// User Schema & Model
const UserSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String,
  profilePic: String,
});
const User = mongoose.model("User", UserSchema);

// Passport Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          profilePic: profile.photos[0].value,
        });
      }
      done(null, user);
    }
  )
);

// Session Serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// OAuth Routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("http://localhost:3000/dashboard");
  }
);

app.get("/auth/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

// Check Authentication
app.get("/auth/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

// WebSocket for Real-time Messaging
io.on("connection", (socket) => {
  console.log("--User Connected:", socket.id);

  socket.on("sendMessage", (data) => {
    console.log("==Message received:", { encryptedMessage: Buffer.from(data.message).toString("base64") }); // Log encrypted message

    // Encrypt message for backend storage
    const encryptedMessage = Buffer.from(data.message).toString("base64");

    // Decrypt before sending to frontend
    const decryptedMessage = Buffer.from(encryptedMessage, "base64").toString("utf-8");

    io.emit("receiveMessage", { sender: data.sender, decryptedMessage }); //Send decrypted message to frontend
  });

  socket.on("disconnect", () => {
    console.log("--User Disconnected:", socket.id);
  });
});

// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to the Secure Chat API!");
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`-**Server running on port ${PORT}`);
});
