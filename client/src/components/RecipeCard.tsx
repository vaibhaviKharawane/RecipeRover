import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRecipes } from "@/context/RecipeContext";
import { Heart, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RecipeCardProps {
  recipe: {
    mongoId: string;
    name: string;
    totalTimeMinutes: number;
    cuisine: string;
    imageUrl: string;
    dietCategory: string;
    mealType: string;
    cookingMethod: string;
    cleanedIngredients: string[];
    liked: boolean;
  };
  onView: (id: string) => void;
}

export default function RecipeCard({ recipe, onView }: RecipeCardProps) {
  const { user } = useAuth();
  const { toggleLike } = useRecipes();
  const [isLiked, setIsLiked] = useState(recipe.liked);

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    setIsLiked(!isLiked);
    toggleLike(recipe.mongoId, !isLiked);
  };

  const getIngredientsPreview = (ingredients: string[]) => {
    if (!ingredients || ingredients.length === 0) return '';
    if (ingredients.length <= 3) return ingredients.join(', ');
    return `${ingredients.slice(0, 3).join(', ')}...`;
  };

  const getDietCategoryColor = (category: string) => {
    switch (category) {
      case 'Vegan':
        return 'bg-green-100 text-green-800';
      case 'Veg':
        return 'bg-blue-100 text-blue-800';
      case 'Non-Veg':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const placeholder = `/api/placeholder?text=${encodeURIComponent(recipe.name)}`;
  // Use server photo redirect to Unsplash to avoid client-side CORS/redirect issues
  const photoSmall = `/api/photo?w=800&h=600&q=${encodeURIComponent(recipe.name)}`;

  return (
    <Card
      className="recipe-card cursor-pointer"
      onClick={() => onView(recipe.mongoId)}
    >
      <div className="relative h-48 overflow-hidden bg-gray-50 flex items-center justify-center">
        <img
          src={recipe.imageUrl || photoSmall}
          alt={recipe.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(ev) => {
            const t = ev.currentTarget as HTMLImageElement;
            // if the unsplash image fails, fall back to our server-generated SVG placeholder
            // If any fallback fails, use our SVG placeholder
            t.onerror = null;
            t.src = placeholder;
          }}
        />

        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/80 rounded-full h-8 w-8 hover:bg-white"
            onClick={handleToggleLike}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-primary text-primary' : 'text-gray-400 hover:text-primary'}`} />
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-foreground">{recipe.name}</h3>

        <div className="flex items-center mb-3 text-sm text-muted-foreground">
          <Clock className="text-accent mr-1 h-4 w-4" />
          <span>{recipe.totalTimeMinutes} mins</span>
          <span className="mx-2">•</span>
          <span className="text-primary">{recipe.cuisine}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="outline" className={getDietCategoryColor(recipe.dietCategory)}>
            {recipe.dietCategory}
          </Badge>
          <Badge variant="outline" className="bg-gray-100 text-gray-800">{recipe.mealType}</Badge>
          <Badge variant="outline" className="bg-gray-100 text-gray-800">{recipe.cookingMethod}</Badge>
        </div>

        <div>
          <p className="text-sm text-muted-foreground line-clamp-1">{getIngredientsPreview(recipe.cleanedIngredients)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
