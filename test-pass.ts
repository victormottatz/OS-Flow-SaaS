import bcrypt from 'bcryptjs';
async function run() {
  const match = await bcrypt.compare("MGV@2026", "$2b$10$K5vNSUSCpzBqTroqrAbNlOHkqX19qCdqcB.D1jYvG//ilBA6m810S");
  console.log("Password match:", match);
}
run();
