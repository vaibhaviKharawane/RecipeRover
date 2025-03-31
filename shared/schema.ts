import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  favorites: jsonb("favorites").default([]).notNull(),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  mongoId: text("mongo_id").notNull(),
  name: text("name").notNull(),
  ingredients: jsonb("ingredients").notNull(),
  cleanedIngredients: jsonb("cleaned_ingredients").notNull(),
  totalTimeMinutes: integer("total_time_mins").notNull(),
  cuisine: text("cuisine").notNull(),
  instructions: text("instructions").notNull(),
  url: text("url").notNull(),
  imageUrl: text("image_url").notNull(),
  ingredientCount: integer("ingredient_count").notNull(),
  dietCategory: text("diet_category").notNull(),
  mealType: text("meal_type").notNull(),
  cookingMethod: text("cooking_method").notNull(),
  liked: boolean("liked").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
});

export const filterSchema = z.object({
  dietCategory: z.array(z.string()).optional(),
  ingredients: z.array(z.string()).optional(),
  cookingMethod: z.array(z.string()).optional(),
  cuisine: z.array(z.string()).optional(),
  maxTime: z.number().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type User = typeof users.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type FilterParams = z.infer<typeof filterSchema>;
