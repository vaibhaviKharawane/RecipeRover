import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRecipes } from "@/context/RecipeContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";

type FilterOptions = {
  ingredients: string[];
  dietCategories: string[];
  cookingMethods: string[];
  cuisines: string[];
};



export default function FilterSidebar() {
  const { filters, toggleFilter, setMaxTime, clearFilters } = useRecipes();
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["diet-category"]);
  const [timeValue, setTimeValue] = useState<number>(60);

  // Fetch filter options
  const { data: filterOptions, isLoading } = useQuery<FilterOptions>({
    queryKey: ['/api/recipes/filters/options'],
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isSectionExpanded = (section: string) => {
    return expandedSections.includes(section);
  };

  const handleSliderChange = (value: number[]) => {
    const time = value[0];
    setTimeValue(time);
    setMaxTime(time);
  };

  const filteredIngredients = ingredientSearch
    ? filterOptions?.ingredients.filter(ing =>
      ing.toLowerCase().includes(ingredientSearch.toLowerCase())
    ).slice(0, 20)
    : filterOptions?.ingredients.slice(0, 10);

  const handleApplyFilters = () => {
    // Filters are already applied when toggled, so this is just for UX
  };

  return (
    <aside className="w-64 filters-panel overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold text-[#8B4513] mb-4">Filters</h2>

        {/* Diet Category Filter */}
        <Accordion type="multiple" defaultValue={["diet-category"]} className="space-y-4">
          <AccordionItem value="diet-category" className="border-b-0">
            <AccordionTrigger className="py-2 font-medium text-foreground">
              Diet Category
            </AccordionTrigger>
            <AccordionContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filterOptions?.dietCategories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`diet-${category}`}
                        checked={filters.dietCategory?.includes(category) || false}
                        onCheckedChange={() => toggleFilter('dietCategory', category)}
                      />
                      <Label htmlFor={`diet-${category}`} className="text-muted-foreground">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Ingredients Filter */}
          <AccordionItem value="ingredients" className="border-b-0">
            <AccordionTrigger className="py-2 font-medium text-foreground">
              Ingredients
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search ingredients..."
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    className="pl-8"
                  />
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>

                {isLoading ? (
                  <div className="space-y-2 mt-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ) : (
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {filteredIngredients?.map((ingredient) => (
                      <div key={ingredient} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ingredient-${ingredient}`}
                          checked={filters.ingredients?.includes(ingredient) || false}
                          onCheckedChange={() => toggleFilter('ingredients', ingredient)}
                        />
                        <Label htmlFor={`ingredient-${ingredient}`} className="text-muted-foreground">
                          {ingredient}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {filterOptions?.ingredients.length && filterOptions.ingredients.length > 10 && (
                  <Button
                    variant="link"
                    className="text-primary p-0 h-auto"
                    onClick={() => ingredientSearch ? setIngredientSearch("") : toggleSection("ingredients")}
                  >
                    {ingredientSearch ? "Clear search" : "Show more..."}
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Cooking Method Filter */}
          <AccordionItem value="cooking-method" className="border-b-0">
            <AccordionTrigger className="py-2 font-medium text-foreground">
              Cooking Method
            </AccordionTrigger>
            <AccordionContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filterOptions?.cookingMethods.map((method) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox
                        id={`method-${method}`}
                        checked={filters.cookingMethod?.includes(method) || false}
                        onCheckedChange={() => toggleFilter('cookingMethod', method)}
                      />
                      <Label htmlFor={`method-${method}`} className="text-muted-foreground">
                        {method}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Cuisine Filter */}
          <AccordionItem value="cuisine" className="border-b-0">
            <AccordionTrigger className="py-2 font-medium text-foreground">
              Cuisine
            </AccordionTrigger>
            <AccordionContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filterOptions?.cuisines.map((cuisine) => (
                    <div key={cuisine} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cuisine-${cuisine}`}
                        checked={filters.cuisine?.includes(cuisine) || false}
                        onCheckedChange={() => toggleFilter('cuisine', cuisine)}
                      />
                      <Label htmlFor={`cuisine-${cuisine}`} className="text-muted-foreground">
                        {cuisine}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Time Filter */}
          <AccordionItem value="time-filter" className="border-b-0">
            <AccordionTrigger className="py-2 font-medium text-foreground">
              Cooking Time
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Max cooking time (minutes):</Label>
                <Slider
                  defaultValue={[filters.maxTime || 60]}
                  max={120}
                  min={15}
                  step={15}
                  onValueChange={handleSliderChange}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>15 min</span>
                  <span>{timeValue} min</span>
                  <span>120 min</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-6 space-y-2">
          <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleApplyFilters}>
            Apply Filters
          </Button>

          <Button
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary/10"
            onClick={clearFilters}
          >
            Clear All
          </Button>
        </div>
      </div>
    </aside>
  );
}
