import { FilterParams, InsertUser, Recipe, User } from '@shared/schema';
import { IStorage } from './storage';
import { connectToDatabase } from './db';
import { Collection, Db, ObjectId } from 'mongodb';
import * as bcrypt from 'bcryptjs';

export class MongoStorage implements IStorage {
  private db: Db | null = null;
  private usersCollection: Collection | null = null;
  private recipesCollection: Collection | null = null;

  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      this.db = await connectToDatabase();
      this.usersCollection = this.db.collection('users');
      this.recipesCollection = this.db.collection('recipes');
      
      console.log("MongoDB collections initialized");
    } catch (error) {
      console.error("Failed to initialize MongoDB collections:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    if (!this.usersCollection) await this.initializeDatabase();
    
    // Try to find by numeric id or by MongoDB _id
    let user;
    try {
      user = await this.usersCollection?.findOne({ id: id });
      if (!user) {
        console.log(`No user found with numeric id: ${id}, checking other fields...`);
      }
    } catch (error) {
      console.error("Error finding user by id:", error);
    }
    
    return user as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!this.usersCollection) await this.initializeDatabase();
    console.log(`Looking for user with username: ${username}`);
    
    try {
      const user = await this.usersCollection?.findOne({ username });
      if (!user) {
        console.log(`No user found with username: ${username}`);
      } else {
        console.log(`Found user with username: ${username}`);
      }
      return user as User | undefined;
    } catch (error) {
      console.error("Error finding user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!this.usersCollection) await this.initializeDatabase();
    
    console.log(`Creating new user with username: ${insertUser.username}`);
    
    // Hash the password before inserting
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    // Get the next available ID
    const highestUser = await this.usersCollection?.find().sort({ id: -1 }).limit(1).toArray();
    const nextId = highestUser && highestUser.length > 0 ? highestUser[0].id + 1 : 1;
    
    const newUser: User = {
      ...insertUser,
      id: nextId,
      favorites: []
    };
    
    // Store the user in MongoDB with the hashed password
    const result = await this.usersCollection?.insertOne({
      ...newUser,
      password: hashedPassword
    });
    
    console.log(`User created with id: ${nextId}`);
    return newUser;
  }

  async updateUserFavorites(userId: number, recipeIds: string[]): Promise<User | undefined> {
    if (!this.usersCollection) await this.initializeDatabase();
    
    console.log(`Updating favorites for user ${userId} with recipes: ${recipeIds.join(', ')}`);
    
    try {
      await this.usersCollection?.updateOne(
        { id: userId },
        { $set: { favorites: recipeIds } }
      );
      
      return this.getUser(userId);
    } catch (error) {
      console.error("Error updating user favorites:", error);
      return undefined;
    }
  }

  // Recipe methods
  async getRecipes(filters?: FilterParams): Promise<Recipe[]> {
    if (!this.recipesCollection) await this.initializeDatabase();
    
    let query: any = {};
    
    if (filters) {
      if (filters.dietCategory && filters.dietCategory.length > 0) {
        query.diet_category = { $in: filters.dietCategory };
      }
      
      if (filters.ingredients && filters.ingredients.length > 0) {
        query.cleaned_ingredients = { $all: filters.ingredients };
      }
      
      if (filters.cookingMethod && filters.cookingMethod.length > 0) {
        query.cooking_method = { $in: filters.cookingMethod };
      }
      
      if (filters.cuisine && filters.cuisine.length > 0) {
        query.cuisine = { $in: filters.cuisine };
      }
      
      if (filters.maxTime && filters.maxTime > 0) {
        query.total_time_mins = { $lte: filters.maxTime };
      }
    }
    
    try {
      const recipes = await this.recipesCollection?.find(query).limit(100).toArray();
      return (recipes || []).map((recipe, index) => ({
        id: index + 1,
        mongoId: recipe._id.toString(),
        name: recipe.name || '',
        ingredients: recipe.ingredients || [],
        cleanedIngredients: recipe.cleaned_ingredients || [],
        totalTimeMinutes: recipe.total_time_mins || 0,
        cuisine: recipe.cuisine || '',
        instructions: recipe.instructions || '',
        url: recipe.url || '',
        imageUrl: recipe.image_url || '',
        ingredientCount: recipe.ingredient_count || 0,
        dietCategory: recipe.diet_category || '',
        mealType: recipe.meal_type || '',
        cookingMethod: recipe.cooking_method || '',
        liked: false
      })) as Recipe[];
    } catch (error) {
      console.error("Error fetching recipes:", error);
      return [];
    }
  }

  async getRecipeById(id: string): Promise<Recipe | undefined> {
    if (!this.recipesCollection) await this.initializeDatabase();
    
    try {
      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch (err) {
        // If id is not a valid ObjectId, try finding by mongoId field
        const recipeByMongoId = await this.recipesCollection?.findOne({ mongoId: id });
        if (recipeByMongoId) {
          return {
            id: 1, // We'll use a placeholder ID
            mongoId: recipeByMongoId._id.toString(),
            name: recipeByMongoId.name || '',
            ingredients: recipeByMongoId.ingredients || [],
            cleanedIngredients: recipeByMongoId.cleaned_ingredients || [],
            totalTimeMinutes: recipeByMongoId.total_time_mins || 0,
            cuisine: recipeByMongoId.cuisine || '',
            instructions: recipeByMongoId.instructions || '',
            url: recipeByMongoId.url || '',
            imageUrl: recipeByMongoId.image_url || '',
            ingredientCount: recipeByMongoId.ingredient_count || 0,
            dietCategory: recipeByMongoId.diet_category || '',
            mealType: recipeByMongoId.meal_type || '',
            cookingMethod: recipeByMongoId.cooking_method || '',
            liked: false
          };
        }
        return undefined;
      }
      
      const recipe = await this.recipesCollection?.findOne({ _id: objectId });
      
      if (!recipe) return undefined;
      
      return {
        id: 1, // We'll use a placeholder ID
        mongoId: recipe._id.toString(),
        name: recipe.name || '',
        ingredients: recipe.ingredients || [],
        cleanedIngredients: recipe.cleaned_ingredients || [],
        totalTimeMinutes: recipe.total_time_mins || 0,
        cuisine: recipe.cuisine || '',
        instructions: recipe.instructions || '',
        url: recipe.url || '',
        imageUrl: recipe.image_url || '',
        ingredientCount: recipe.ingredient_count || 0,
        dietCategory: recipe.diet_category || '',
        mealType: recipe.meal_type || '',
        cookingMethod: recipe.cooking_method || '',
        liked: false
      };
    } catch (error) {
      console.error("Error fetching recipe by ID:", error);
      return undefined;
    }
  }

  async toggleRecipeLike(id: string, liked: boolean): Promise<Recipe | undefined> {
    // This is just a mock implementation since we don't actually modify the recipes in the database
    // In a real app, you'd have a user-recipe relationship collection
    const recipe = await this.getRecipeById(id);
    if (recipe) {
      return {
        ...recipe,
        liked
      };
    }
    return undefined;
  }

  async getRecipeFilters(): Promise<{
    dietCategories: string[];
    ingredients: string[];
    cookingMethods: string[];
    cuisines: string[];
  }> {
    if (!this.recipesCollection) await this.initializeDatabase();
    
    try {
      // Get unique diet categories
      const dietCategories = await this.recipesCollection?.distinct('diet_category');
      
      // Get cooking methods
      const cookingMethods = await this.recipesCollection?.distinct('cooking_method');
      
      // Get cuisines
      const cuisines = await this.recipesCollection?.distinct('cuisine');
      
      // For ingredients, we'll sample from cleaned ingredients to get a reasonable list
      const sampleRecipes = await this.recipesCollection?.find().limit(1000).toArray();
      const ingredientSet = new Set<string>();
      
      sampleRecipes?.forEach(recipe => {
        if (recipe.cleaned_ingredients && Array.isArray(recipe.cleaned_ingredients)) {
          recipe.cleaned_ingredients.forEach((ingredient: string) => {
            if (ingredient && ingredient.length > 2) {
              ingredientSet.add(ingredient);
            }
          });
        }
      });
      
      // Convert sets to arrays and sort
      return {
        dietCategories: (dietCategories || []).filter(Boolean).sort() as string[],
        ingredients: Array.from(ingredientSet).filter(Boolean).sort() as string[],
        cookingMethods: (cookingMethods || []).filter(Boolean).sort() as string[],
        cuisines: (cuisines || []).filter(Boolean).sort() as string[],
      };
    } catch (error) {
      console.error("Error fetching recipe filters:", error);
      return {
        dietCategories: [],
        ingredients: [],
        cookingMethods: [],
        cuisines: [],
      };
    }
  }
}