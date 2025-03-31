import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import RecipeGrid from "@/components/RecipeGrid";
import RecipeDetailModal from "@/components/RecipeDetailModal";
import { Button } from "@/components/ui/button";
import LoginModal from "@/components/LoginModal";
import SignupModal from "@/components/SignupModal";
import { Loader2 } from "lucide-react";

export default function Favorites() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  // Fetch all recipes to filter favorites
  const { data: allRecipes, isLoading } = useQuery({
    queryKey: ['/api/recipes'],
  });

  const handleViewRecipe = (id: string) => {
    setSelectedRecipeId(id);
    setShowRecipeDetail(true);
  };

  const handleCloseRecipeDetail = () => {
    setShowRecipeDetail(false);
    setSelectedRecipeId(null);
  };

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          onLogin={() => setIsLoginModalOpen(true)} 
          onSignup={() => setIsSignupModalOpen(true)} 
        />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-primary mb-4">Please log in to view your favorites</h2>
            <p className="text-muted-foreground mb-6">
              You need to be logged in to access your saved recipes
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => setIsLoginModalOpen(true)}>
                Log In
              </Button>
              <Button variant="outline" onClick={() => setIsSignupModalOpen(true)}>
                Sign Up
              </Button>
            </div>
          </div>
        </main>
        
        <LoginModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
          onSwitchToSignup={() => {
            setIsLoginModalOpen(false);
            setIsSignupModalOpen(true);
          }} 
        />
        
        <SignupModal 
          isOpen={isSignupModalOpen} 
          onClose={() => setIsSignupModalOpen(false)} 
          onSwitchToLogin={() => {
            setIsSignupModalOpen(false);
            setIsLoginModalOpen(true);
          }} 
        />
      </div>
    );
  }

  // Filter recipes to show only user's favorites
  const favoriteRecipes = allRecipes?.filter(recipe => 
    user.favorites.includes(recipe.mongoId)
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Favorite Recipes</h1>
          <p className="text-muted-foreground mt-2">Your saved recipes for easy access</p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : favoriteRecipes.length > 0 ? (
          <RecipeGrid recipes={favoriteRecipes} onViewRecipe={handleViewRecipe} />
        ) : (
          <div className="text-center py-16 border border-dashed rounded-lg">
            <h2 className="text-xl font-semibold text-foreground mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6">
              Save recipes by clicking the heart icon on recipes you love
            </p>
            <Button onClick={() => setLocation("/")}>
              Browse Recipes
            </Button>
          </div>
        )}
      </main>
      
      <RecipeDetailModal 
        recipeId={selectedRecipeId} 
        isOpen={showRecipeDetail}
        onClose={handleCloseRecipeDetail}
      />
    </div>
  );
}