const { execSync } = require("child_process");
const fs = require("fs");

function runCommand(command, cwd, message) {
  try {
    console.log(`\n🔄 ${message}`);
    execSync(command, { stdio: "inherit", cwd });
  } catch (err) {
    console.error(`❌ Failed: ${message}`);
    process.exit(1);
  }
}

try {
  console.log("🚀 Starting setup...\n");

  // 📦 Backend install (only if missing)
  if (!fs.existsSync("./backend/node_modules")) {
    runCommand("npm install", "./backend", "Installing backend dependencies");
  } else {
    console.log("✅ Backend already installed");
  }

  // 📦 Frontend install (only if missing)
  if (!fs.existsSync("./frontend/node_modules")) {
    runCommand("npm install", "./frontend", "Installing frontend dependencies");
  } else {
    console.log("✅ Frontend already installed");
  }

  // 🚀 Run both (مرة واحدة بس!)
  runCommand("npm run start-all", "./", "Starting backend + frontend");

} catch (err) {
  console.error("❌ Unexpected Error:", err);
}