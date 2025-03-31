import RecipeCard from "@/components/RecipeCard";

interface RecipeGridProps {
  recipes: any[];
  onViewRecipe: (id: string) => void;
}

export default function RecipeGrid({ recipes, onViewRecipe }: RecipeGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard 
          key={recipe.mongoId} 
          recipe={recipe} 
          onView={onViewRecipe} 
        />
      ))}
    </div>
  );
}
