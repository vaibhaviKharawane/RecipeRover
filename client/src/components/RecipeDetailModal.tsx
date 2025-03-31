import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRecipes } from "@/context/RecipeContext";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Heart, Share, Clock, Volume2, VolumeX, Utensils, Globe, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecipeDetailModalProps {
  recipeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecipeDetailModal({ recipeId, isOpen, onClose }: RecipeDetailModalProps) {
  const [isReading, setIsReading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const { toggleLike } = useRecipes();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch recipe details
  const { data: recipe, isLoading } = useQuery({
    queryKey: recipeId ? [`/api/recipes/${recipeId}`] : null,
    enabled: !!recipeId && isOpen,
  });

  // Fetch similar recipes (in a real app this would be from an API)
  const { data: allRecipes } = useQuery({
    queryKey: ['/api/recipes'],
    enabled: !!recipeId && isOpen,
  });

  const similarRecipes = allRecipes
    ?.filter(r => r.mongoId !== recipeId && (
      r.cuisine === recipe?.cuisine || 
      r.dietCategory === recipe?.dietCategory ||
      r.cookingMethod === recipe?.cookingMethod
    ))
    .slice(0, 3);

  useEffect(() => {
    if (recipe) {
      setIsLiked(recipe.liked);
    }
  }, [recipe]);

  const handleToggleLike = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save recipes",
        variant: "destructive",
      });
      return;
    }

    setIsLiked(!isLiked);
    await toggleLike(recipe.mongoId, !isLiked);
  };

  const handleShareRecipe = () => {
    if (navigator.share) {
      navigator.share({
        title: recipe?.name,
        text: `Check out this delicious recipe: ${recipe?.name}`,
        url: window.location.href,
      }).catch(err => {
        toast({
          title: "Sharing failed",
          description: "Could not share this recipe",
          variant: "destructive",
        });
      });
    } else {
      // Fallback
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Recipe link copied to clipboard",
      });
    }
  };

  const handleReadInstructions = () => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }
    
    if ('speechSynthesis' in window && recipe) {
      setIsReading(true);
      const speech = new SpeechSynthesisUtterance();
      speech.text = recipe.instructions;
      speech.volume = 1;
      speech.rate = 1;
      speech.pitch = 1;
      
      speech.onend = () => {
        setIsReading(false);
      };
      
      window.speechSynthesis.speak(speech);
    } else {
      toast({
        title: "Feature not supported",
        description: "Your browser does not support text-to-speech",
        variant: "destructive",
      });
    }
  };

  // Clean up speech synthesis when modal closes
  useEffect(() => {
    if (!isOpen && isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    }
  }, [isOpen, isReading]);

  if (isLoading || !recipe) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white z-10 border-b pb-2">
          <DialogTitle className="text-xl font-bold pr-6">{recipe.name}</DialogTitle>
          <Button
            className="absolute right-4 top-4"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isReading) {
                window.speechSynthesis.cancel();
              }
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="p-2">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/2">
              <div className="rounded-lg overflow-hidden mb-4">
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.name} 
                  className="w-full h-auto"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/400x300?text=ComfortBites";
                  }}
                />
              </div>
              
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1 text-accent" />
                  <span>{recipe.totalTimeMinutes} mins</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Globe className="h-4 w-4 mr-1 text-primary" />
                  <span>{recipe.cuisine}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Utensils className="h-4 w-4 mr-1 text-secondary" />
                  <span>{recipe.dietCategory}</span>
                </div>
              </div>
              
              <div className="flex gap-2 mb-6">
                <Button 
                  variant={isLiked ? "default" : "outline"} 
                  className={`${isLiked ? 'bg-primary text-white' : 'border-primary text-primary hover:bg-primary/10'}`}
                  onClick={handleToggleLike}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-white' : ''}`} />
                  {isLiked ? "Saved" : "Save Recipe"}
                </Button>
                <Button 
                  variant="outline" 
                  className="border-accent text-accent hover:bg-accent/10"
                  onClick={handleShareRecipe}
                >
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
              
              <Card className="bg-background p-4 mb-6">
                <h3 className="font-semibold text-lg mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 mr-2 mt-1 text-secondary" />
                      <span className="text-muted-foreground">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            
            <div className="md:w-1/2">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">Instructions</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-accent hover:text-accent/80 hover:bg-accent/10"
                    onClick={handleReadInstructions}
                  >
                    {isReading ? (
                      <>
                        <VolumeX className="h-4 w-4 mr-1" />
                        <span>Stop Reading</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 mr-1" />
                        <span>Read Aloud</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-4 text-muted-foreground">
                  {recipe.instructions.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
              
              {similarRecipes && similarRecipes.length > 0 && (
                <Card className="bg-background p-4">
                  <h3 className="font-semibold text-lg mb-3">Similar Recipes</h3>
                  <div className="space-y-3">
                    {similarRecipes.map(similarRecipe => (
                      <div 
                        key={similarRecipe.mongoId} 
                        className="flex items-center p-2 hover:bg-accent/5 rounded-md cursor-pointer"
                        onClick={() => {
                          if (isReading) {
                            window.speechSynthesis.cancel();
                          }
                          onClose();
                          // This would navigate to the recipe in a full implementation
                          window.location.href = `/recipe/${similarRecipe.mongoId}`;
                        }}
                      >
                        <img 
                          src={similarRecipe.imageUrl} 
                          alt={similarRecipe.name} 
                          className="w-16 h-16 object-cover rounded-md mr-3"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/64x64?text=CB";
                          }}
                        />
                        <div>
                          <h4 className="font-medium">{similarRecipe.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {similarRecipe.cuisine} • {similarRecipe.totalTimeMinutes} mins
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
