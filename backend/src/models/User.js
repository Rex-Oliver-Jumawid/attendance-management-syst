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
      minlength: 6,
      select: false,
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
