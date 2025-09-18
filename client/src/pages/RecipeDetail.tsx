import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import RecipeDetailModal from "@/components/RecipeDetailModal";

export default function RecipeDetail() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // This page is only for route handling, it redirects
    // to home and opens the recipe modal through state
    setLocation('/', { 
      replace: true,
      state: { openRecipeId: id ?? null }
    });
  }, [id, setLocation]);
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
      
      {/* Modal will be shown on the Home page after redirect */}
      <RecipeDetailModal
        recipeId={id ?? null}
        isOpen={true}
        onClose={() => setLocation('/')}
      />
    </div>
  );
}
