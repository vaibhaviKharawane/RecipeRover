import { X } from "lucide-react";
import { useRecipes } from "@/context/RecipeContext";

export default function ActiveFilters() {
  const { filters, toggleFilter, setFilters } = useRecipes();
  
  const handleRemoveFilter = (type: 'dietCategory' | 'ingredients' | 'cookingMethod' | 'cuisine', value: string) => {
    toggleFilter(type, value);
  };
  
  const handleRemoveTimeFilter = () => {
    setFilters(prev => ({ ...prev, maxTime: undefined }));
  };
  
  // Check if there are any active filters
  const hasActiveFilters = 
    (filters.dietCategory && filters.dietCategory.length > 0) ||
    (filters.ingredients && filters.ingredients.length > 0) ||
    (filters.cookingMethod && filters.cookingMethod.length > 0) ||
    (filters.cuisine && filters.cuisine.length > 0) ||
    filters.maxTime !== undefined;
  
  if (!hasActiveFilters) {
    return null;
  }
  
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.dietCategory?.map(category => (
        <div 
          key={category}
          className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
        >
          <span>{category}</span>
          <button 
            className="ml-1" 
            onClick={() => handleRemoveFilter('dietCategory', category)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      
      {filters.ingredients?.map(ingredient => (
        <div 
          key={ingredient}
          className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
        >
          <span>{ingredient}</span>
          <button 
            className="ml-1" 
            onClick={() => handleRemoveFilter('ingredients', ingredient)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      
      {filters.cookingMethod?.map(method => (
        <div 
          key={method}
          className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
        >
          <span>{method}</span>
          <button 
            className="ml-1" 
            onClick={() => handleRemoveFilter('cookingMethod', method)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      
      {filters.cuisine?.map(cuisine => (
        <div 
          key={cuisine}
          className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
        >
          <span>{cuisine}</span>
          <button 
            className="ml-1" 
            onClick={() => handleRemoveFilter('cuisine', cuisine)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      
      {filters.maxTime && (
        <div 
          className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
        >
          <span>Under {filters.maxTime} min</span>
          <button 
            className="ml-1" 
            onClick={handleRemoveTimeFilter}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
