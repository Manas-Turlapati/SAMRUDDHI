const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

async function provision(uri, dbName) {
  console.log(`Connecting to ${dbName}...`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const User = conn.collection("users");

  const expertHashStandard = await bcrypt.hash("Expert@123", 10);
  const expertHashSimple = await bcrypt.hash("expert123", 10);
  const adminHashStandard = await bcrypt.hash("Admin@123", 10);
  const adminHashSimple = await bcrypt.hash("admin123", 10);

  // 1. expert@ldfrs.com (Password: Expert@123)
  await User.updateOne(
    { email: "expert@ldfrs.com" },
    {
      $set: {
        name: "Dr. Agronomist Expert",
        email: "expert@ldfrs.com",
        password: expertHashStandard,
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

  // 2. expert1@ldfrs.com (Password: expert123 - all lowercase, no special characters)
  await User.updateOne(
    { email: "expert1@ldfrs.com" },
    {
      $set: {
        name: "Dr. Agronomist Expert (Simple)",
        email: "expert1@ldfrs.com",
        password: expertHashSimple,
        role: "expert",
        expertProfile: {
          specialization: "Plant Pathology",
          institution: "Samruddhi Agronomy Lab",
          isVerified: true,
        },
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 3. expert.demo.ba5a321e@example.com (Password: Expert@123)
  await User.updateOne(
    { email: "expert.demo.ba5a321e@example.com" },
    {
      $set: {
        password: expertHashStandard,
        role: "expert",
        "expertProfile.isVerified": true,
        updatedAt: new Date(),
      },
    }
  );

  // 4. admin@ldfrs.com (Password: Admin@123)
  await User.updateOne(
    { email: "admin@ldfrs.com" },
    {
      $set: {
        name: "Samruddhi Admin",
        email: "admin@ldfrs.com",
        password: adminHashStandard,
        role: "admin",
        expertProfile: { isVerified: true },
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 5. admin1@ldfrs.com (Password: admin123 - all lowercase)
  await User.updateOne(
    { email: "admin1@ldfrs.com" },
    {
      $set: {
        name: "Samruddhi Admin (Simple)",
        email: "admin1@ldfrs.com",
        password: adminHashSimple,
        role: "admin",
        expertProfile: { isVerified: true },
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  console.log(`✓ ${dbName} accounts provisioned successfully!`);
  await conn.close();
}

async function main() {
  try {
    await provision("mongodb://127.0.0.1:27017/ldfrs", "Local MongoDB");
  } catch (e) {
    console.error("Local DB error:", e.message);
  }

  try {
    await provision("mongodb+srv://turlapatinaga2024_db_user:tFOcI9JGB06u3VXH@cluster0.wctc0z9.mongodb.net/?appName=Cluster0", "MongoDB Atlas (Deployed)");
  } catch (e) {
    console.error("Atlas DB error:", e.message);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
