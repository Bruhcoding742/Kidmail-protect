import React from "react";
import Header from "./Header";
import TabNavigation from "./TabNavigation";
import Footer from "./Footer";
import { useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  
  // Extract the current page from the location
  const currentPage = location === "/" ? "dashboard" : location.substring(1);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <TabNavigation currentPage={currentPage} />
      <main className="flex-grow py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
