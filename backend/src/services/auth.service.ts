
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { UserModel } from "../models/user.js";

export async function loginUser(email: string, password: string) {
  // Find the user and explicitly retrieve the password hash.
  const user = await UserModel.findOne({ email }).select("+passwordHash");

  // Use the same response for invalid credentials and inactive accounts.
  if (!user || !user.isActive) {
    return null;
  }

  // Compare the supplied password with the stored hash.
  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    return null;
  }

  // Create a token that expires after one hour.
  const token = jwt.sign(
    { role: user.role },
    env.JWT_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: "1h"
    }
  );

  // Never return the password hash to the client.
  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}
