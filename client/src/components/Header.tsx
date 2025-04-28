import React from "react";
import ShieldIcon from "./ui/shield-icon";

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ShieldIcon className="mr-2" />
            <h1 className="text-xl font-semibold text-neutral-dark">KidMail Protector</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success bg-opacity-10 text-success">
              System Active
            </span>
            <div className="relative">
              <button className="flex items-center text-sm font-medium text-neutral-dark hover:text-primary focus:outline-none">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                  <span>P</span>
                </div>
                <span className="ml-2 hidden md:block">Parent Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
