import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import LoginModal from "@/components/LoginModal";
import SignupModal from "@/components/SignupModal";
import { useAuth } from "@/context/AuthContext";

export default function Auth() {
  const { mode } = useParams();
  const [, setLocation] = useLocation();
  const [showLogin, setShowLogin] = useState(mode === "login");
  const [showSignup, setShowSignup] = useState(mode === "signup");
  const { user } = useAuth();

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  useEffect(() => {
    setShowLogin(mode === "login");
    setShowSignup(mode === "signup");
  }, [mode]);

  const handleSwitchToSignup = () => {
    setLocation('/auth/signup');
  };

  const handleSwitchToLogin = () => {
    setLocation('/auth/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {mode === "login" ? "Login to ComfortBites" : "Sign up for ComfortBites"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "login" 
              ? "Login to save your favorite recipes and preferences" 
              : "Create an account to save recipes and get personalized recommendations"}
          </p>
        </div>
      </div>
      
      <LoginModal 
        isOpen={showLogin} 
        onClose={() => setLocation('/')} 
        onSwitchToSignup={handleSwitchToSignup} 
      />
      
      <SignupModal 
        isOpen={showSignup} 
        onClose={() => setLocation('/')} 
        onSwitchToLogin={handleSwitchToLogin} 
      />
    </div>
  );
}
