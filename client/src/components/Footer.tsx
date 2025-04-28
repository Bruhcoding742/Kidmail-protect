import React from "react";
import ShieldIcon from "./ui/shield-icon";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-light">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center">
            <ShieldIcon className="mr-2" />
            <p className="text-sm text-neutral-medium">KidMail Protector &copy; {new Date().getFullYear()}</p>
          </div>
          <nav className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-sm text-neutral-medium hover:text-primary">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-neutral-medium hover:text-primary">
              Terms of Service
            </a>
            <a href="#" className="text-sm text-neutral-medium hover:text-primary">
              Contact Support
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
