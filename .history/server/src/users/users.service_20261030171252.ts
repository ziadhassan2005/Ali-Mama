import { User, IUser } from "./models/user.model";
import type { UserRole } from "./user-role";

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export class UsersService {
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  async create(input: CreateUserInput): Promise<IUser> {
    return User.create(input);
  }
}

export const usersService = new UsersService();
