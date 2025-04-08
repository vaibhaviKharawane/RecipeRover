import { users, recipes, type User, type InsertUser, type Recipe, type FilterParams } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserFavorites(userId: number, recipeIds: string[]): Promise<User | undefined>;
  
  getRecipes(filters?: FilterParams): Promise<Recipe[]>;
  getRecipeById(id: string): Promise<Recipe | undefined>;
  toggleRecipeLike(id: string, liked: boolean): Promise<Recipe | undefined>;
  getRecipeFilters(): Promise<{
    dietCategories: string[];
    ingredients: string[];
    cookingMethods: string[];
    cuisines: string[];
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recipesList: Recipe[];
  currentId: number;

  constructor() {
    this.users = new Map();
    this.recipesList = [];
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, favorites: [] };
    this.users.set(id, user);
    return user;
  }

  async updateUserFavorites(userId: number, recipeIds: string[]): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    user.favorites = recipeIds;
    this.users.set(userId, user);
    return user;
  }

  async loadRecipesFromJson(recipes: any[]): Promise<void> {
    // Convert MongoDB schema to our schema
    this.recipesList = recipes.map((recipe, index) => {
      const mongoId = recipe._id.$oid;
      return {
        id: index + 1,
        mongoId,
        name: recipe.name,
        ingredients: recipe.ingredients,
        cleanedIngredients: recipe.cleaned_ingredients || [],
        totalTimeMinutes: recipe.total_time_mins,
        cuisine: recipe.cuisine,
        instructions: recipe.instructions,
        url: recipe.url,
        imageUrl: recipe.image_url,
        ingredientCount: recipe.ingredient_count,
        dietCategory: recipe.diet_category,
        mealType: recipe.meal_type,
        cookingMethod: recipe.cooking_method,
        liked: false
      };
    });
  }

  async getRecipes(filters?: FilterParams): Promise<Recipe[]> {
    if (!filters) return this.recipesList;

    return this.recipesList.filter(recipe => {
      // Filter by diet category
      if (filters.dietCategory && filters.dietCategory.length > 0) {
        if (!filters.dietCategory.includes(recipe.dietCategory)) {
          return false;
        }
      }

      // Filter by cooking method
      if (filters.cookingMethod && filters.cookingMethod.length > 0) {
        if (!filters.cookingMethod.includes(recipe.cookingMethod)) {
          return false;
        }
      }

      // Filter by cuisine
      if (filters.cuisine && filters.cuisine.length > 0) {
        if (!filters.cuisine.includes(recipe.cuisine)) {
          return false;
        }
      }

      // Filter by max cooking time
      if (filters.maxTime && recipe.totalTimeMinutes > filters.maxTime) {
        return false;
      }

      // Filter by ingredients
      if (filters.ingredients && filters.ingredients.length > 0) {
        const recipeIngredientsLower = recipe.cleanedIngredients.map(i => i.toLowerCase());
        const hasAllIngredients = filters.ingredients.every(ingredient => 
          recipeIngredientsLower.some(recipeIngr => recipeIngr.includes(ingredient.toLowerCase()))
        );
        if (!hasAllIngredients) {
          return false;
        }
      }

      return true;
    });
  }

  async getRecipeById(id: string): Promise<Recipe | undefined> {
    return this.recipesList.find(recipe => recipe.mongoId === id);
  }

  async toggleRecipeLike(id: string, liked: boolean): Promise<Recipe | undefined> {
    const recipe = this.recipesList.find(r => r.mongoId === id);
    if (!recipe) return undefined;
    
    recipe.liked = liked;
    return recipe;
  }

  async getRecipeFilters(): Promise<{
    dietCategories: string[];
    ingredients: string[];
    cookingMethods: string[];
    cuisines: string[];
  }> {
    const dietCategories = [...new Set(this.recipesList.map(r => r.dietCategory))];
    const cookingMethods = [...new Set(this.recipesList.map(r => r.cookingMethod))];
    const cuisines = [...new Set(this.recipesList.map(r => r.cuisine))];
    
    // Get all unique ingredients from all recipes
    const allIngredients = this.recipesList.flatMap(r => r.cleanedIngredients);
    const ingredients = [...new Set(allIngredients)];
    
    return {
      dietCategories,
      ingredients,
      cookingMethods,
      cuisines
    };
  }
}

import { MongoStorage } from './mongoStorage';

// Use MongoStorage instead of MemStorage to connect to MongoDB Atlas
export const storage = new MongoStorage();
