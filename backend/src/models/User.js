const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () { return !this.googleId; },
      minlength: 6,
      select: false,
    },

    googleId: { type: String, unique: true, sparse: true },
    role: {
      type: String,
      enum: ["farmer", "expert", "admin"],
      default: "farmer",
    },
    expertProfile: {
      specialization: { type: String, trim: true },
      institution: { type: String, trim: true },
      isVerified: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  },
);
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
