import { useState, useEffect, useRef } from "react";
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
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// 👉 define Recipe type
interface Recipe {
  mongoId: string;
  name: string;
  imageUrl: string;
  totalTimeMinutes: number;
  cuisine: string;
  dietCategory: string;
  cookingMethod: string;
  ingredients: string[];
  instructions: string;
  liked: boolean;
}

interface RecipeDetailModalProps {
  recipeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecipeDetailModal({ recipeId, isOpen, onClose }: RecipeDetailModalProps) {
  const [isReading, setIsReading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { toggleLike } = useRecipes();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch recipe details
  const { data: recipe, isLoading } = useQuery<Recipe>({
    queryKey: recipeId ? ['/api/recipes', recipeId] : [''],
    enabled: !!recipeId && isOpen,
    queryFn: async ({ queryKey }) => {
      if (!queryKey[1]) return null;
      const response = await fetch(`/api/recipes/${queryKey[1]}`);
      if (!response.ok) throw new Error('Failed to fetch recipe');
      return response.json();
    }
  });

  // Fetch all recipes
  const { data: allRecipes } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes'],
    enabled: !!recipeId && isOpen,
    queryFn: async () => {
      const response = await fetch('/api/recipes');
      if (!response.ok) throw new Error('Failed to fetch recipes');
      return response.json();
    }
  });

  const similarRecipes = allRecipes
    ?.filter((r: Recipe) => r.mongoId !== recipeId && (
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
    if (!recipe) return; 
    await toggleLike(recipe.mongoId, !isLiked);
  };

  const handleShareRecipe = () => {
    if (navigator.share) {
      navigator.share({
        title: recipe?.name,
        text: `Check out this delicious recipe: ${recipe?.name}`,
        url: window.location.href,
      }).catch(() => {
        toast({
          title: "Sharing failed",
          description: "Could not share this recipe",
          variant: "destructive",
        });
      });
    } else {
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
    
    if ('speechSynthesis' in window && recipe?.instructions) {
      setIsReading(true);
      const utterance = new SpeechSynthesisUtterance(recipe.instructions);
      utterance.volume = 1;
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setIsReading(false);
      // store in ref so we can cancel from other handlers
      ttsRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: recipe && !recipe.instructions ? "No instructions available" : "Feature not supported",
        description: recipe && !recipe.instructions ? 
          "This recipe doesn't have any instructions to read" : 
          "Your browser does not support text-to-speech",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!isOpen && isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      if (ttsRef.current) {
        ttsRef.current.onend = null;
        ttsRef.current = null;
      }
    }
  }, [isOpen, isReading]);

  // Keep a ref to the current utterance for cleanup
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Prevent background scrolling when modal is open
  const previousBodyOverflow = useRef<string | null>(null);
  useEffect(() => {
    if (isOpen) {
      previousBodyOverflow.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      if (previousBodyOverflow.current !== null) {
        document.body.style.overflow = previousBodyOverflow.current;
        previousBodyOverflow.current = null;
      }
    }

    return () => {
      if (previousBodyOverflow.current !== null) {
        document.body.style.overflow = previousBodyOverflow.current;
        previousBodyOverflow.current = null;
      } else {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      // component unmount cleanup
      window.speechSynthesis.cancel();
      if (ttsRef.current) {
        ttsRef.current.onend = null;
        ttsRef.current = null;
      }
    };
  }, []);

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
                  src={recipe.imageUrl || `/api/photo?w=1200&h=800&q=${encodeURIComponent(recipe.name)}`}
                  alt={recipe.name}
                  className="w-full h-auto"
                  onError={(e) => {
                    const t = e.currentTarget as HTMLImageElement;
                    t.onerror = null;
                    t.src = `/api/placeholder?text=${encodeURIComponent(recipe.name)}`;
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
                  className="border-primary text-primary hover:bg-primary/10"
                  onClick={handleShareRecipe}
                >
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              {user && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Upload image</label>
                  <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" accept="image/*" className="" />
                    <Button
                      onClick={async () => {
                        if (!recipeId) return;
                        const files = fileRef.current?.files;
                        if (!files || files.length === 0) {
                          toast({ title: 'No file selected', variant: 'destructive' });
                          return;
                        }
                        const file = files[0];
                        const fd = new FormData();
                        fd.append('image', file);
                        setUploading(true);
                        try {
                          const res = await fetch(`/api/recipes/${recipeId}/image`, {
                            method: 'POST',
                            body: fd,
                            credentials: 'include'
                          });
                          if (!res.ok) throw new Error(await res.text());
                          const updated = await res.json();
                          toast({ title: 'Image uploaded', description: 'Recipe image updated' });
                          // Force refetch of the recipe by invalidating queries; simple approach: reload page route
                          window.location.reload();
                        } catch (err) {
                          toast({ title: 'Upload failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
                        } finally {
                          setUploading(false);
                        }
                      }}
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              )}
              
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
                    className="text-primary hover:text-primary/80 hover:bg-primary/10"
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
                                      {similarRecipes.map((similarRecipe) => (
                                        <SimilarRecipeItem
                                          key={similarRecipe.mongoId}
                                          similarRecipe={similarRecipe}
                                          onClose={onClose}
                                          isReading={isReading}
                                        />
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

// Small sub-component for similar recipes so we can perform client-side navigation
function SimilarRecipeItem({ similarRecipe, onClose, isReading }: { similarRecipe: Recipe; onClose: () => void; isReading: boolean }) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    if (isReading) {
      window.speechSynthesis.cancel();
    }
    onClose();
    // Use client-side navigation to the recipe route so the router opens the modal
    setLocation(`/recipe/${similarRecipe.mongoId}`);
  };

  return (
    <div className="flex items-center p-2 hover:bg-accent/5 rounded-md cursor-pointer" onClick={handleClick}>
      <img
        src={similarRecipe.imageUrl || `/api/photo?w=160&h=160&q=${encodeURIComponent(similarRecipe.name)}`}
        alt={similarRecipe.name}
        className="w-16 h-16 object-cover rounded-md mr-3"
        onError={(e) => {
          const t = e.currentTarget as HTMLImageElement;
          t.onerror = null;
          t.src = `/api/placeholder?text=${encodeURIComponent(similarRecipe.name)}`;
        }}
      />
      <div>
        <h4 className="font-medium">{similarRecipe.name}</h4>
        <p className="text-sm text-muted-foreground">
          {similarRecipe.cuisine} • {similarRecipe.totalTimeMinutes} mins
        </p>
      </div>
    </div>
  );
}
