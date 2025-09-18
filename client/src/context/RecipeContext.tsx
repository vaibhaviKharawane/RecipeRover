import React, { createContext, useContext, useState, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";

interface Recipe {
  id: number;
  mongoId: string;
  name: string;
  ingredients: string[];
  cleanedIngredients: string[];
  totalTimeMinutes: number;
  cuisine: string;
  instructions: string;
  url: string;
  imageUrl: string;
  ingredientCount: number;
  dietCategory: string;
  mealType: string;
  cookingMethod: string;
  liked: boolean;
}

interface Filters {
  dietCategory?: string[];
  ingredients?: string[];
  cookingMethod?: string[];
  cuisine?: string[];
  maxTime?: number;
}

interface FilterOptions {
  dietCategories: string[];
  ingredients: string[];
  cookingMethods: string[];
  cuisines: string[];
}

type ArrayFilterKey = Exclude<keyof Filters, 'maxTime'>;

interface RecipeContextType {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  clearFilters: () => void;
  // toggleFilter only applies to the array-based filter keys (not maxTime)
  toggleFilter: (type: ArrayFilterKey, value: string) => void;
  setMaxTime: (time: number) => void;
  filterOptions: FilterOptions | null;
  toggleLike: (recipeId: string, isLiked: boolean) => Promise<void>;
  loadingFilterOptions: boolean;
}

const RecipeContext = createContext<RecipeContextType>({
  filters: {},
  setFilters: () => {},
  clearFilters: () => {},
  toggleFilter: () => {},
  setMaxTime: () => {},
  filterOptions: null,
  toggleLike: async () => {},
  loadingFilterOptions: true,
});

export const useRecipes = () => useContext(RecipeContext);

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<Filters>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch filter options (typed)
  const { data: filterOptionsData, isLoading: loadingFilterOptions } = useQuery<FilterOptions>({
    queryKey: ['/api/recipes/filters/options'],
    staleTime: Infinity, // Filter options don't change often
  });

  const filterOptions = filterOptionsData ?? null;

  const clearFilters = () => {
    setFilters({});
  };

  const toggleFilter = (type: ArrayFilterKey, value: string) => {
    setFilters(prevFilters => {
      const currentValues = (prevFilters[type] as string[]) || [];

      if (currentValues.includes(value)) {
        return {
          ...prevFilters,
          [type]: currentValues.filter((v: string) => v !== value)
        };
      } else {
        return {
          ...prevFilters,
          [type]: [...currentValues, value]
        };
      }
    });
  };

  const setMaxTime = (time: number) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      maxTime: time
    }));
  };

  const toggleLike = async (recipeId: string, isLiked: boolean) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save recipes",
        variant: "destructive",
      });
      return;
    }

    try {
      const endpoint = isLiked 
        ? `/api/recipes/${recipeId}/like` 
        : `/api/recipes/${recipeId}/unlike`;
        
      await apiRequest("POST", endpoint);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.invalidateQueries({ queryKey: [`/api/recipes/${recipeId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: isLiked ? "Recipe saved" : "Recipe removed",
        description: isLiked 
          ? "Recipe has been added to your favorites" 
          : "Recipe has been removed from your favorites",
      });
    } catch (error) {
      toast({
        title: "Action failed",
        description: "Could not update recipe status",
        variant: "destructive",
      });
    }
  };

  return (
    <RecipeContext.Provider 
      value={{ 
        filters, 
        setFilters, 
        clearFilters, 
        toggleFilter, 
        setMaxTime, 
        filterOptions, 
        toggleLike,
        loadingFilterOptions
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
};
