import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import RecipeDetail from "@/pages/RecipeDetail";
import Favorites from "@/pages/Favorites";
import Auth from "@/pages/Auth";
import { AuthProvider } from "@/context/AuthContext";
import { RecipeProvider } from "@/context/RecipeContext";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/recipe/:id" component={RecipeDetail} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/auth/:mode" component={Auth} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Set the title of the application
  useEffect(() => {
    document.title = "ComfortBites - Recipe Recommendations";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RecipeProvider>
          <Router />
          <Toaster />
        </RecipeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
