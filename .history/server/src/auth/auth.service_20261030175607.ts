import bcrypt from "bcryptjs";
import { HttpError } from "../common/errors/http-error";
import type { UserRole } from "../users/user-role";
import { usersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { RegisterDto } from "./dto/register.dto";
import { signAccessToken } from "./jwt.util";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const SALT_ROUNDS = 10;

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function serializeUser(user: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export class AuthService {
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!email || !password) {
      throw new HttpError(400, "Email and password are required");
    }

    const user = await usersService.findByEmail(email);
    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new HttpError(401, "Invalid email or password");
    }

    const token = signAccessToken(user.id, user.role);

    return {
      token,
      user: serializeUser(user),
    };
  }

  async updateEmail(
    userId: string,
    dto: { email?: string }
  ): Promise<{ user: { id: string; email: string; name: string; role: string } }> {
    const email = dto.email?.trim().toLowerCase();

    if (!email) {
      throw new HttpError(400, "Email is required");
    }

    if (!validateEmail(email)) {
      throw new HttpError(400, "Please enter a valid email address");
    }

    const user = await usersService.findById(userId);
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    if (user.email === email) {
      return { user: serializeUser(user) };
    }

    const conflictingUser = await usersService.findByEmail(email);
    if (conflictingUser && conflictingUser.id !== userId) {
      throw new HttpError(409, "An account with this email already exists");
    }

    user.email = email;
    await user.save();

    return { user: serializeUser(user) };
  }

  async updatePassword(
    userId: string,
    dto: { currentPassword?: string; newPassword?: string }
  ): Promise<{ message: string }> {
    const currentPassword = dto.currentPassword;
    const newPassword = dto.newPassword;

    if (!currentPassword || !newPassword) {
      throw new HttpError(400, "Current password and new password are required");
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(400, "Password must be at least 8 characters long");
    }

    if (Buffer.byteLength(newPassword, "utf8") > MAX_PASSWORD_BYTES) {
      throw new HttpError(400, "Password must be 72 bytes or fewer");
    }

    const user = await usersService.findById(userId);
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new HttpError(401, "Current password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password = hashedPassword;
    await user.save();

    return { message: "Password updated successfully" };
  }

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    const name = dto.name?.trim();
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!name || !email || !password) {
      throw new HttpError(400, "Name, email, and password are required");
    }

    if (!validateEmail(email)) {
      throw new HttpError(400, "Please enter a valid email address");
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(400, "Password must be at least 8 characters long");
    }

    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
      throw new HttpError(400, "Password must be 72 bytes or fewer");
    }

    const existingUser = await usersService.findByEmail(email);
    if (existingUser) {
      throw new HttpError(409, "An account with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      const user = await usersService.create({
        name,
        email,
        password: hashedPassword,
        role: "shopper",
      });

      const token = signAccessToken(user.id, user.role);

      return {
        token,
        user: serializeUser(user),
      };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new HttpError(409, "An account with this email already exists");
      }

      throw new HttpError(500, "Unable to create account");
    }
  }
}

export const authService = new AuthService();
