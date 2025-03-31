import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UtensilsCrossed } from "lucide-react";

interface EmptyStateProps {
  onAddIngredients?: () => void;
}

export default function EmptyState({ onAddIngredients }: EmptyStateProps) {
  return (
    <Card className="bg-white rounded-lg shadow-md">
      <CardContent className="p-8 text-center">
        <UtensilsCrossed className="h-16 w-16 mx-auto text-primary mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-3">
          Add your ingredients to get started
        </h2>
        <p className="text-muted-foreground mb-6">
          Every ingredient you add unlocks more recipes
        </p>
        <Button 
          className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
          onClick={onAddIngredients}
        >
          Add Ingredients
        </Button>
      </CardContent>
    </Card>
  );
}
