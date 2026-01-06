const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const qrcode = require("qrcode");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      select: false,
      validate: {
        validator: function (v) {
          // Password is only required for moderators and admins
          if (this.role === "moderator" || this.role === "admin") {
            return v && v.length >= 6;
          }
          // For members, password is optional (can be undefined or any length)
          if (!v) return true; // undefined/null is okay for members
          return v.length >= 6; // if provided, must be at least 6 chars
        },
        message: function (props) {
          if (
            props.instance.role === "moderator" ||
            props.instance.role === "admin"
          ) {
            return "Password is required for moderators and admins (minimum 6 characters)";
          }
          return "Password must be at least 6 characters if provided";
        },
      },
    },
    role: {
      type: String,
      enum: ["member", "moderator", "admin"],
      default: "member",
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      sparse: true,
    },
    emailPassword: {
      type: String,
      select: false, // Don't include by default in queries
      required: false, // Optional - only for admins who want to send emails
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    qrCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    qrCodeImage: {
      type: String, // Base64 encoded PNG image
    },
  },
  {
    timestamps: true, // This auto-creates createdAt and updatedAt!
  }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (this.password && this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  // Generate permanent QR code if not exists
  if (!this.qrCode) {
    this.qrCode = crypto.randomBytes(32).toString("hex");
    try {
      this.qrCodeImage = await qrcode.toDataURL(this.qrCode);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
