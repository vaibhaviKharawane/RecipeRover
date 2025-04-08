import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { filterSchema, loginUserSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  // We're using MongoDB Atlas now, so we don't need to load recipes from JSON
  console.log("Using MongoDB Atlas for recipe data");

  // Setup session with longer duration for persistence
  const SessionStore = MemoryStore(session);
  app.use(session({
    secret: 'comfort-bites-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, 
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    store: new SessionStore({ 
      checkPeriod: 86400000, // 1 day cleanup
      ttl: 30 * 24 * 60 * 60 // 30 days ttl
    })
  }));

  // Setup passport for authentication
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      console.log(`Attempting login for user: ${username}`);
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log(`No user found with username: ${username}`);
        return done(null, false, { message: 'Incorrect username.' });
      }
      
      console.log(`Found user, checking password`);
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        console.log(`Password does not match for user: ${username}`);
        return done(null, false, { message: 'Incorrect password.' });
      }
      
      console.log(`Login successful for user: ${username}`);
      return done(null, user);
    } catch (error) {
      console.error(`Login error:`, error);
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    console.log(`Serializing user: ${user.username} with id: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user with id: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.log(`No user found with id: ${id} during deserialization`);
        return done(null, false);
      }
      
      console.log(`Found user during deserialization: ${user.username}`);
      done(null, user);
    } catch (error) {
      console.error(`Deserialization error:`, error);
      done(error);
    }
  });

  // Authentication routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      console.log('Received signup request:', req.body);
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        console.log(`Signup failed: Username ${validatedData.username} already exists`);
        return res.status(400).json({ message: 'Username already exists' });
      }

      console.log(`Creating new user with username: ${validatedData.username}`);
      
      // Create the user (password hashing is done in the storage implementation)
      const user = await storage.createUser(validatedData);
      
      // Exclude password from response
      const { password, ...userWithoutPassword } = user;
      
      console.log(`User created, logging in: ${validatedData.username}`);
      
      req.login(user, (err) => {
        if (err) {
          console.error(`Error during automatic login after signup:`, err);
          return res.status(500).json({ message: 'Error during login' });
        }
        console.log(`User logged in after signup: ${validatedData.username}`);
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error(`Signup error:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/auth/login', (req, res, next) => {
    try {
      console.log('Received login request:', req.body);
      loginUserSchema.parse(req.body);
      
      passport.authenticate('local', (err, user, info) => {
        if (err) {
          console.error(`Login error:`, err);
          return next(err);
        }
        if (!user) {
          console.log(`Login failed: ${info?.message || 'Unknown reason'}`);
          return res.status(401).json({ message: info?.message || 'Authentication failed' });
        }
        
        console.log(`User authenticated, establishing session for: ${user.username}`);
        
        req.login(user, (err) => {
          if (err) {
            console.error(`Error during login session establishment:`, err);
            return next(err);
          }
          
          // Exclude password from response
          const { password, ...userWithoutPassword } = user;
          console.log(`User successfully logged in: ${user.username}`);
          return res.json(userWithoutPassword);
        });
      })(req, res, next);
    } catch (error) {
      console.error(`Login validation error:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/auth/user', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Exclude password from response
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error during logout' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Recipe routes
  app.get('/api/recipes', async (req, res) => {
    try {
      // Parse filter parameters
      const filters: any = {};
      
      if (req.query.dietCategory) {
        filters.dietCategory = Array.isArray(req.query.dietCategory) 
          ? req.query.dietCategory as string[]
          : [req.query.dietCategory as string];
      }
      
      if (req.query.cookingMethod) {
        filters.cookingMethod = Array.isArray(req.query.cookingMethod)
          ? req.query.cookingMethod as string[]
          : [req.query.cookingMethod as string];
      }
      
      if (req.query.cuisine) {
        filters.cuisine = Array.isArray(req.query.cuisine)
          ? req.query.cuisine as string[]
          : [req.query.cuisine as string];
      }
      
      if (req.query.ingredients) {
        filters.ingredients = Array.isArray(req.query.ingredients)
          ? req.query.ingredients as string[]
          : [req.query.ingredients as string];
      }
      
      if (req.query.maxTime) {
        filters.maxTime = parseInt(req.query.maxTime as string);
      }
      
      const validatedFilters = filterSchema.parse(filters);
      const recipes = await storage.getRecipes(validatedFilters);
      
      res.json(recipes);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/recipes/:id', async (req, res) => {
    try {
      const recipe = await storage.getRecipeById(req.params.id);
      
      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' });
      }
      
      res.json(recipe);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/recipes/:id/like', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const recipe = await storage.toggleRecipeLike(req.params.id, true);
      
      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' });
      }
      
      // Add to user favorites
      const user = req.user as any;
      const favorites = user.favorites || [];
      
      if (!favorites.includes(recipe.mongoId)) {
        const updatedFavorites = [...favorites, recipe.mongoId];
        await storage.updateUserFavorites(user.id, updatedFavorites);
      }
      
      res.json(recipe);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/recipes/:id/unlike', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const recipe = await storage.toggleRecipeLike(req.params.id, false);
      
      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' });
      }
      
      // Remove from user favorites
      const user = req.user as any;
      const favorites = user.favorites || [];
      
      const updatedFavorites = favorites.filter((id: string) => id !== recipe.mongoId);
      await storage.updateUserFavorites(user.id, updatedFavorites);
      
      res.json(recipe);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/recipes/filters/options', async (req, res) => {
    try {
      const filters = await storage.getRecipeFilters();
      res.json(filters);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
