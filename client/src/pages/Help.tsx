import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter
} from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  HelpCircle, 
  FileText, 
  Mail, 
  MessageSquare, 
  LucideIcon,
  KeyRound,
  Layers,
  AlertTriangle,
  Settings,
  RotateCw,
  ShieldAlert
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function Help() {
  // FAQ data
  const faqItems: FaqItem[] = [
    {
      question: "How do I get an App-specific password for my child's iCloud account?",
      answer: "To generate an app-specific password for your child's iCloud account, follow these steps:\n\n1. Sign in to your child's Apple ID account page at appleid.apple.com\n2. Go to Security > Generate Password under App-Specific Passwords\n3. Follow the steps to create a password\n4. Use this password in KidMail Protector instead of the actual account password"
    },
    {
      question: "How often does KidMail Protector check for new emails?",
      answer: "By default, KidMail Protector checks for new junk emails every 15 minutes. You can customize this interval for each child account in the Settings page. The minimum check interval is 5 minutes and the maximum is 60 minutes."
    },
    {
      question: "What types of content does KidMail Protector filter?",
      answer: "KidMail Protector has built-in filters for several categories of inappropriate content, including:\n\n- Adult/explicit content\n- Gambling and betting\n- Pharmaceutical and recreational drugs\n- Certain types of financial scams\n\nYou can also create custom filters for specific words, phrases, or patterns that you want to monitor."
    },
    {
      question: "Does KidMail Protector read all my child's emails?",
      answer: "No. KidMail Protector only checks emails that have been filtered to the Junk folder by iCloud's own spam filtering system. It doesn't access or scan emails in the Inbox or other folders."
    },
    {
      question: "Is KidMail Protector secure?",
      answer: "Yes, KidMail Protector takes security very seriously. We use app-specific passwords instead of the main account password, all connections are encrypted with TLS/SSL, and we don't store the actual content of emails on our servers."
    },
    {
      question: "What happens when inappropriate content is detected?",
      answer: "When KidMail Protector detects inappropriate content in a junk email, it forwards the email to your specified parent email address with a safety wrapper that indicates why it was flagged. The original email is left unchanged in the child's junk folder."
    }
  ];
  
  // Help categories
  const helpCategories: HelpCategory[] = [
    {
      id: "setup",
      title: "Account Setup",
      description: "Learn how to set up and configure child accounts",
      icon: Layers
    },
    {
      id: "passwords",
      title: "App Passwords",
      description: "Generate and manage app-specific passwords",
      icon: KeyRound
    },
    {
      id: "filters",
      title: "Content Filters",
      description: "Understand how content filtering works",
      icon: ShieldAlert
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      description: "Solve common issues and errors",
      icon: AlertTriangle
    },
    {
      id: "settings",
      title: "System Settings",
      description: "Configure the system to your needs",
      icon: Settings
    },
    {
      id: "updates",
      title: "Updates & Changes",
      description: "Learn about recent updates and changes",
      icon: RotateCw
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HelpCircle className="mr-2 h-5 w-5" />
            Help Center
          </CardTitle>
          <CardDescription>
            Find answers to common questions and learn how to use KidMail Protector
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {helpCategories.map((category) => (
              <Card key={category.id} className="bg-neutral-lightest">
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-primary bg-opacity-10 flex items-center justify-center text-primary mr-2">
                      <category.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-sm text-neutral-medium">{category.description}</p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="outline" size="sm" className="w-full">
                    View Guide
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Quick answers to common questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-neutral-medium whitespace-pre-line">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
        
        {/* Contact Support Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Contact Support
            </CardTitle>
            <CardDescription>
              Need more help? Contact our support team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Your Name
                </label>
                <Input id="name" placeholder="Enter your name" />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email Address
                </label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-1">
                  Subject
                </label>
                <Input id="subject" placeholder="What is your question about?" />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1">
                  Message
                </label>
                <Textarea 
                  id="message" 
                  placeholder="Describe your issue or question in detail" 
                  rows={4}
                />
              </div>
              
              <Button className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Send Message
              </Button>
              
              <div className="pt-4 text-center text-sm text-neutral-medium">
                <p>Our support team typically responds within 24 hours</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Video Tutorials</CardTitle>
          <CardDescription>
            Step-by-step video guides to help you get the most out of KidMail Protector
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border overflow-hidden">
              <div className="aspect-video bg-neutral-light flex items-center justify-center">
                <PlayButton />
              </div>
              <div className="p-4">
                <h3 className="font-medium">Getting Started Guide</h3>
                <p className="text-sm text-neutral-medium mt-1">
                  Learn how to set up your first protected account
                </p>
              </div>
            </div>
            
            <div className="rounded-lg border overflow-hidden">
              <div className="aspect-video bg-neutral-light flex items-center justify-center">
                <PlayButton />
              </div>
              <div className="p-4">
                <h3 className="font-medium">Creating Custom Filters</h3>
                <p className="text-sm text-neutral-medium mt-1">
                  How to create and manage custom content filters
                </p>
              </div>
            </div>
            
            <div className="rounded-lg border overflow-hidden">
              <div className="aspect-video bg-neutral-light flex items-center justify-center">
                <PlayButton />
              </div>
              <div className="p-4">
                <h3 className="font-medium">Troubleshooting</h3>
                <p className="text-sm text-neutral-medium mt-1">
                  Solutions for common connection issues
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple play button component for video placeholders
function PlayButton() {
  return (
    <div className="h-12 w-12 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="text-primary"
      >
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    </div>
  );
}
