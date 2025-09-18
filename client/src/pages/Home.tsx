import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import FilterSidebar from "@/components/FilterSidebar";
import RecipeGrid from "@/components/RecipeGrid";
import EmptyState from "@/components/EmptyState";
import ActiveFilters from "@/components/ActiveFilters";
import { useRecipes } from "@/context/RecipeContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LoginModal from "@/components/LoginModal";
import SignupModal from "@/components/SignupModal";
import RecipeDetailModal from "@/components/RecipeDetailModal";

export default function Home() {
  const { filters } = useRecipes();
  const [searchTerm, setSearchTerm] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Convert filters to query parameters
  const queryParams = new URLSearchParams();
  
  if (filters.dietCategory?.length) {
    filters.dietCategory.forEach(cat => queryParams.append('dietCategory', cat));
  }
  
  if (filters.cookingMethod?.length) {
    filters.cookingMethod.forEach(method => queryParams.append('cookingMethod', method));
  }
  
  if (filters.cuisine?.length) {
    filters.cuisine.forEach(cuisine => queryParams.append('cuisine', cuisine));
  }
  
  if (filters.ingredients?.length) {
    filters.ingredients.forEach(ing => queryParams.append('ingredients', ing));
  }
  
  if (filters.maxTime) {
    queryParams.append('maxTime', filters.maxTime.toString());
  }

  // Fetch recipes based on filters
  const { data: recipes, isLoading } = useQuery<any[]>({
    queryKey: [`/api/recipes?${queryParams.toString()}`],
  });

  // Filter recipes by search term (client-side filtering)
  const filteredRecipes = recipes?.filter((recipe: any) => 
    searchTerm ? recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleOpenLoginModal = () => {
    setShowLoginModal(true);
    setShowSignupModal(false);
  };

  const handleOpenSignupModal = () => {
    setShowSignupModal(true);
    setShowLoginModal(false);
  };

  const handleViewRecipe = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
  };

  const areFiltersApplied = Boolean(
    filters.dietCategory?.length || 
    filters.cookingMethod?.length || 
    filters.cuisine?.length ||
    filters.ingredients?.length ||
    filters.maxTime
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar onLogin={handleOpenLoginModal} onSignup={handleOpenSignupModal} />
      
      <div className="flex-grow flex h-full">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <FilterSidebar />
        </div>
        
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="app-container">
            {/* Mobile filter toggle */}
            <div className="md:hidden mb-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter size={16} />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <FilterSidebar />
                </SheetContent>
              </Sheet>
            </div>
            
            {/* Search bar */}
            <div className="relative mb-6">
              <Input
                type="text"
                placeholder="Search recipes..."
                className="main-search pl-12"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-muted-foreground" />
              </div>
            </div>
            
            {/* Active filters */}
            {areFiltersApplied && <ActiveFilters />}
            
            <h1 className="text-2xl font-bold text-foreground mb-4">
              {areFiltersApplied ? "Recommended Recipes" : "Popular Recipes"}
            </h1>
            
            {/* Show either recipe grid or empty state */}
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              filteredRecipes && filteredRecipes.length > 0 ? (
                <RecipeGrid recipes={filteredRecipes} onViewRecipe={handleViewRecipe} />
              ) : (
                <EmptyState />
              )
            )}
          </div>
        </main>
      </div>
      
      {/* Modals */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onSwitchToSignup={() => {
          setShowLoginModal(false);
          setShowSignupModal(true);
        }}
      />
      
      <SignupModal 
        isOpen={showSignupModal} 
        onClose={() => setShowSignupModal(false)} 
        onSwitchToLogin={() => {
          setShowSignupModal(false);
          setShowLoginModal(true);
        }}
      />
      
      <RecipeDetailModal
        recipeId={selectedRecipeId}
        isOpen={!!selectedRecipeId}
        onClose={() => setSelectedRecipeId(null)}
      />
    </div>
  );
}
