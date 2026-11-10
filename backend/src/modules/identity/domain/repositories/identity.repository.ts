import type {
  UserProfile,
} from "../entities/user-profile.entity.js";

export interface ProfileReader {
  findByUserId(
    userId: string
  ): Promise<UserProfile | null>;
}