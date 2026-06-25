import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { Visualizer } from "@/pages/Visualizer";
import { PrivacyPolicy } from "@/pages/PrivacyPolicy";
import { Blog } from "@/pages/Blog";
import { BlogPost } from "@/pages/BlogPost";
import { FAQ } from "@/pages/FAQ";
import { NotFound } from "@/pages/NotFound";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Visualizer} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/blogs" component={Blog} />
      <Route path="/blogs/:slug" component={BlogPost} />
      <Route path="/faq" component={FAQ} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
          <Analytics />
          <SpeedInsights />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
