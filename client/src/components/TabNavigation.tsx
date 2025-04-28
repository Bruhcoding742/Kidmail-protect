import React from "react";
import { Link } from "wouter";

interface TabNavigationProps {
  currentPage: string;
}

export default function TabNavigation({ currentPage }: TabNavigationProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", path: "/dashboard" },
    { id: "settings", label: "Settings", path: "/settings" },
    { id: "logs", label: "Activity Logs", path: "/logs" },
    { id: "help", label: "Help", path: "/help" },
  ];

  return (
    <div className="border-b border-neutral-light bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex -mb-px space-x-8">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.path}
              className={`border-b-2 py-4 px-1 text-sm font-medium ${
                currentPage === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral-medium hover:text-neutral-dark hover:border-neutral-medium"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
