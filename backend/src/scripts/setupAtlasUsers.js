const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const uri = "mongodb+srv://turlapatinaga2024_db_user:tFOcI9JGB06u3VXH@cluster0.wctc0z9.mongodb.net/?appName=Cluster0";

async function setup() {
  await mongoose.connect(uri);
  const User = mongoose.connection.collection("users");

  const expertHash = await bcrypt.hash("Expert@123", 10);
  const adminHash = await bcrypt.hash("Admin@123", 10);

  // 1. expert@ldfrs.com
  await User.updateOne(
    { email: "expert@ldfrs.com" },
    {
      $set: {
        name: "Dr. Agronomist Expert",
        email: "expert@ldfrs.com",
        password: expertHash,
        role: "expert",
        expertProfile: {
          specialization: "Plant Pathology & Crop Recovery",
          institution: "Samruddhi Agronomy Lab",
          isVerified: true,
        },
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 2. expert.demo.ba5a321e@example.com
  await User.updateOne(
    { email: "expert.demo.ba5a321e@example.com" },
    {
      $set: {
        password: expertHash,
        role: "expert",
        "expertProfile.isVerified": true,
        updatedAt: new Date(),
      },
    }
  );

  // 3. admin@ldfrs.com
  await User.updateOne(
    { email: "admin@ldfrs.com" },
    {
      $set: {
        name: "Samruddhi Admin",
        email: "admin@ldfrs.com",
        password: adminHash,
        role: "admin",
        expertProfile: { isVerified: true },
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 4. admin.demo.ba5a321e@example.com
  await User.updateOne(
    { email: "admin.demo.ba5a321e@example.com" },
    {
      $set: {
        password: adminHash,
        role: "admin",
        updatedAt: new Date(),
      },
    }
  );

  console.log("Atlas accounts updated successfully!");
  process.exit(0);
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
