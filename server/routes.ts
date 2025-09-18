import express, { type Express, Request, Response } from "express";
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
// @ts-ignore: optional dependency may not have types in this workspace
let multer: any = null;
let sharp: any = null;
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  // ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.warn('Could not ensure uploads directory:', err);
  }

  // serve uploaded files statically at /uploads
  app.use('/uploads', express.static(uploadsDir));

  // Configure multer to store uploads on disk
  // Try to dynamically load multer and sharp so server can run even if deps aren't installed
  try {
    // Dynamically import multer and normalize default export in case of ESM/CJS interop
    // @ts-ignore: optional dependency
    const _multer = await import('multer');
    // Some environments expose the function as default when using dynamic import
    // so prefer .default if present.
    // @ts-ignore
    multer = _multer && (_multer.default || _multer);
  } catch (err) {
    multer = null;
    console.warn('multer not available - upload endpoints disabled');
  }

  try {
    // Dynamically import sharp and normalize default export
    // @ts-ignore: optional dependency
    const _sharp = await import('sharp');
    // @ts-ignore
    sharp = _sharp && (_sharp.default || _sharp);
  } catch (err) {
    sharp = null;
    console.warn('sharp not available - uploaded images will not be optimized');
  }

  let upload: any = null;
  if (multer) {
    const storageEngine = multer.diskStorage({
      destination: function (_req: Request, _file: any, cb: any) {
        cb(null, uploadsDir);
      },
      filename: function (_req: Request, file: any, cb: any) {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const safe = file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_');
        cb(null, `${unique}-${safe}`);
      }
    });

    upload = multer({ storage: storageEngine });
  }
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
      
      passport.authenticate('local', (err:any, user:any, info:any) => {
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
      // Ensure instructions is a string to make TTS on the client reliable
      if (!recipe.instructions || typeof recipe.instructions !== 'string') {
        recipe.instructions = 'Instructions are not available for this recipe.';
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

  // Lightweight SVG placeholder generator — returns an SVG with the provided text
  app.get('/api/placeholder', (req, res) => {
    try {
      const text = (req.query.text as string) || 'Recipe';
      const width = 800;
      const height = 600;
      const bg = '#f3f4f6'; // light gray
      const fg = '#374151'; // dark gray
      const escaped = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${bg}" />
  <g transform="translate(40, 40)">
    <rect x="0" y="0" width="${width - 80}" height="${height - 80}" rx="12" fill="#ffffff" fill-opacity="0.6" />
    <text x="20" y="70" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="40" fill="${fg}">${escaped}</text>
    <text x="20" y="120" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="18" fill="#6b7280">Generated placeholder</text>
  </g>
</svg>`;

      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch (error) {
      res.status(500).send('Error generating placeholder');
    }
  });

  // Simple photo proxy/redirect to Unsplash Source to provide photographic fallbacks
  app.get('/api/photo', async (req, res) => {
    try {
      const q = (req.query.q as string) || (req.query.query as string) || 'food';
      const w = (req.query.w as string) || '800';
      const h = (req.query.h as string) || '600';

      // ensure cache dir
      const cacheDir = path.join(uploadsDir, 'cache');
      try { fs.mkdirSync(cacheDir, { recursive: true }); } catch (e) { /* ignore */ }

      // create cache key
      const crypto = await import('crypto');
      const key = crypto.createHash('sha1').update(`${q}|${w}|${h}`).digest('hex');
      const filename = `${key}.jpg`;
      const cachedPath = path.join(cacheDir, filename);

      // If cached already exists, redirect to static file
      if (fs.existsSync(cachedPath)) {
        return res.redirect(302, `/uploads/cache/${filename}`);
      }

      // Fetch image from Unsplash Source and save to cache
      const unsplash = `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(q)}`;
      // Determine fetch function (global fetch or node-fetch)
      // @ts-ignore: optional dependency
      const fetchModule: any = (global as any).fetch ? { default: (global as any).fetch } : await import('node-fetch').catch((e) => {
        console.warn('node-fetch import failed:', e && e.message ? e.message : e);
        return null;
      });
      const fetchFn: any = (fetchModule && (fetchModule.default || fetchModule)) || (global as any).fetch;
      console.log('Fetching Unsplash:', unsplash, 'using fetchFn:', typeof fetchFn === 'function' ? 'function' : typeof fetchFn);
      if (!fetchFn) {
        console.error('No fetch function available on server to fetch Unsplash images');
        return res.status(502).json({ message: 'Server cannot fetch remote photos (no fetch available)' });
      }

      let response: any;
      try {
        response = await fetchFn(unsplash);
        console.log('Unsplash fetch response status:', response && response.status);
      } catch (fetchErr) {
        const fe: any = fetchErr;
        console.error('Error fetching Unsplash image:', fe && fe.message ? fe.message : fe);
        return res.status(502).json({ message: 'Failed to fetch photo from Unsplash', error: String(fe) });
      }

      if (!response || !response.ok) {
        return res.status(502).json({ message: 'Failed to fetch photo from Unsplash' });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        fs.writeFileSync(cachedPath, buffer);
        console.log('Wrote cached photo to', cachedPath);
      } catch (writeErr) {
        const we: any = writeErr;
        console.error('Failed to write cached photo:', we && we.message ? we.message : we);
        // Fall back to returning the image directly
        res.setHeader('Content-Type', 'image/jpeg');
        return res.send(buffer);
      }

      return res.redirect(302, `/uploads/cache/${filename}`);
    } catch (error) {
      console.error('Error in /api/photo:', error);
      res.status(500).json({ message: 'Error generating photo redirect' });
    }
  });

  // Upload image for a recipe (authenticated)
  if (!upload) {
    // If multer isn't available register a stub route so server doesn't crash.
    app.post('/api/recipes/:id/image', (_req, res) => {
      res.status(501).json({ message: 'Image upload not available on this server (missing multer).' });
    });
  } else {
    app.post('/api/recipes/:id/image', upload.single('image'), async (req: any, res: Response) => {
      try {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
          return res.status(401).json({ message: 'Not authenticated' });
        }

        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
        }

        const uploadedPath = path.join(uploadsDir, req.file.filename);
        // If sharp is available, process to optimized + thumb; otherwise keep original
        if (sharp) {
          try {
            const parsed = path.parse(req.file.filename);
            const optimizedName = `${parsed.name}-opt.jpg`;
            const optimizedPath = path.join(uploadsDir, optimizedName);

            await sharp(uploadedPath)
              .resize({ width: 1600, withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toFile(optimizedPath);

            const thumbName = `${parsed.name}-thumb.jpg`;
            const thumbPath = path.join(uploadsDir, thumbName);
            await sharp(optimizedPath).resize({ width: 400 }).jpeg({ quality: 70 }).toFile(thumbPath);

            try { fs.unlinkSync(uploadedPath); } catch (e) { /* ignore */ }

            const imageUrl = `/uploads/${optimizedName}`;
            // @ts-ignore
            const updated = await storage.setRecipeImageUrl(req.params.id, imageUrl);
            if (!updated) return res.status(404).json({ message: 'Recipe not found' });
            return res.json(updated);
          } catch (procErr) {
            console.error('Image processing failed:', procErr);
            const imageUrl = `/uploads/${req.file.filename}`;
            // @ts-ignore
            const updated = await storage.setRecipeImageUrl(req.params.id, imageUrl);
            if (!updated) return res.status(404).json({ message: 'Recipe not found' });
            return res.json(updated);
          }
        } else {
          const imageUrl = `/uploads/${req.file.filename}`;
          // @ts-ignore
          const updated = await storage.setRecipeImageUrl(req.params.id, imageUrl);
          if (!updated) return res.status(404).json({ message: 'Recipe not found' });
          return res.json(updated);
        }
      } catch (error) {
        console.error('Error uploading recipe image:', error);
        res.status(500).json({ message: 'Error uploading image' });
      }
    });
  }

  // Debug helper: return the first recipe raw for inspection
  app.get('/api/debug/sample-recipe', async (req, res) => {
    try {
      const recipes = await storage.getRecipes();
      if (!recipes || recipes.length === 0) return res.status(404).json({ message: 'No recipes available' });
      res.json(recipes[0]);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
