import {
  Play, Pause, StepForward, RotateCcw, ChevronDown, Code2,
  CircleDot,
  Download, Upload, Share2, Eye, Activity, Settings,
  GitCompare,
  MemoryStick,
  Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useRuntimeStore } from '@/lib/runtimeStore';
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExamplesControlPanel } from '@/components/ExamplesControlPanel';

interface ControlBarProps {
  onRun: () => void;
  onStep: () => void;
  onReset: () => void;
}

export function ControlBar({ onRun, onStep, onReset }: ControlBarProps) {
  const {
    executionState, speed, setSpeed, setCode, reset,
    breakpoints,
    showPerformancePanel, togglePerformancePanel,
    comparisonMode, setComparisonMode,
    exportState, importState, generateShareableLink,
    showMemoryPanel, toggleMemoryPanel,
    customExamples, customCategoryLabels,
  } = useRuntimeStore();

  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [shareLink, setShareLink] = useState('');

  const handleExampleSelect = (code: string) => {
    reset();
    setCode(code);
  };

  const isRunning = executionState === 'running';
  const isCompleted = executionState === 'completed';
  const isPaused = executionState === 'paused' || executionState === 'breakpoint';

  const groupedExamples = customExamples
    .filter(ex => ex.visible)
    .reduce((acc, example) => {
      if (!acc[example.category]) acc[example.category] = [];
      acc[example.category].push(example);
      return acc;
    }, {} as Record<string, typeof customExamples>);

  // Sort groups by the order defined in customCategoryLabels
  const categoryOrder = Object.keys(customCategoryLabels);
  const sortedGroupedEntries = Object.entries(groupedExamples).sort(
    ([a], [b]) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    }
  );

  const handleExport = useCallback(() => {
    const data = exportState();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'js-visualizer-state.json';
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Export Successful",
      description: "Configuration exported to file",
    });
  }, [exportState, toast]);

  const handleImport = useCallback(() => {
    if (importState(importData)) {
      setImportData('');
      toast({
        title: "Import Successful",
        description: "Configuration imported successfully",
      });
    } else {
      toast({
        title: "Import Failed",
        description: "Invalid configuration data",
        variant: "destructive",
      });
    }
  }, [importData, importState, toast]);

  const handleShare = useCallback(() => {
    const link = generateShareableLink();
    setShareLink(link);
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Shareable link copied to clipboard",
    });
  }, [generateShareableLink, toast]);

  return (
    <header className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-6 py-3 bg-[hsl(var(--app-bar))] border-b border-zinc-800/80">
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="JS Visualizer"
            className="w-10 h-10 sm:w-11 sm:h-11 object-contain flex-shrink-0"
          />
          <div className="flex flex-col leading-none">
            <h1 className="text-sm sm:text-base font-bold tracking-[0.14em] leading-tight">
              <span style={{ color: '#E2B135' }}>JS</span>
              <span className="ml-1.5 text-[#1B2541] dark:text-zinc-50">VISUALIZER</span>
            </h1>
            <p className="mt-1 text-[8px] sm:text-[9px] font-medium tracking-[0.18em] text-zinc-500 hidden sm:block uppercase">
              See Code. Understand Memory.
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white sm:hidden"
              data-testid="dropdown-examples-mobile"
              aria-label="Open examples menu"
              title="Open examples menu"
            >
              <Code2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-y-auto bg-zinc-900 border-zinc-700">
            {sortedGroupedEntries.map(([category, examples], categoryIndex) => (
              <div key={category}>
                {categoryIndex > 0 && <DropdownMenuSeparator className="bg-zinc-700" />}
                <DropdownMenuLabel className="text-xs text-zinc-400 uppercase tracking-wider">
                  {customCategoryLabels[category] || category}
                </DropdownMenuLabel>
                {examples.map((example) => (
                  <DropdownMenuItem
                    key={example.id}
                    onClick={() => handleExampleSelect(example.code)}
                    className="flex flex-col items-start gap-0.5 py-2 hover:bg-zinc-800 cursor-pointer"
                  >
                    <span className="font-medium text-zinc-200">{example.title}</span>
                    <span className="text-xs text-zinc-500">{example.description}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hidden sm:flex"
              data-testid="dropdown-examples"
            >
              <Code2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Examples
              <ChevronDown className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto bg-zinc-900 border-zinc-700">
            {sortedGroupedEntries.map(([category, examples], categoryIndex) => (
              <div key={category}>
                {categoryIndex > 0 && <DropdownMenuSeparator className="bg-zinc-700" />}
                <DropdownMenuLabel className="text-xs text-zinc-400 uppercase tracking-wider">
                  {customCategoryLabels[category] || category}
                </DropdownMenuLabel>
                {examples.map((example) => (
                  <DropdownMenuItem
                    key={example.id}
                    onClick={() => handleExampleSelect(example.code)}
                    className="flex flex-col items-start gap-0.5 py-2 hover:bg-zinc-800 cursor-pointer"
                    data-testid={`example-item-${example.id}`}
                  >
                    <span className="font-medium text-zinc-200">{example.title}</span>
                    <span className="text-xs text-zinc-500">{example.description}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            size="sm"
            onClick={onRun}
            disabled={isCompleted}
            className={isRunning 
              ? "bg-amber-600 hover:bg-amber-700 text-white border-none px-2 sm:px-3" 
              : "bg-emerald-600 hover:bg-emerald-700 text-white border-none px-2 sm:px-3"
            }
            data-testid="button-run"
          >
            {isRunning ? (
              <Pause className="w-4 h-4 sm:mr-1.5" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 sm:mr-1.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{isRunning ? 'PAUSE' : 'RUN'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onStep}
            disabled={isRunning || isCompleted}
            className="bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 px-2 sm:px-3"
            data-testid="button-step"
          >
            <StepForward className="w-4 h-4 sm:mr-1.5" aria-hidden="true" />
            <span className="hidden sm:inline">STEP</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-2 sm:px-3"
            data-testid="button-reset"
          >
            <RotateCcw className="w-4 h-4 sm:mr-1.5" aria-hidden="true" />
            <span className="hidden sm:inline">RESET</span>
          </Button>
        </div>

        {/* Premium: View Panels Toggle */}
        <div className="hidden lg:flex items-center gap-1.5 ml-2 pl-2 border-l border-zinc-700">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-2"
              >
                <Eye className="w-4 h-4 mr-1" aria-hidden="true" />
                View
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
              <DropdownMenuLabel className="text-xs text-zinc-400">View Panels</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={showPerformancePanel}
                onCheckedChange={togglePerformancePanel}
                className="hover:bg-zinc-800 cursor-pointer"
              >
                <Activity className="w-4 h-4 mr-2" />
                Performance Metrics
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={comparisonMode}
                onCheckedChange={setComparisonMode}
                className="hover:bg-zinc-800 cursor-pointer"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Comparison Mode
              </DropdownMenuCheckboxItem>
              {/* Memory Visualization toggle hidden for now — re-enable by uncommenting
              <DropdownMenuCheckboxItem
                checked={showMemoryPanel}
                onCheckedChange={toggleMemoryPanel}
                className="hover:bg-zinc-800 cursor-pointer"
              >
                <MemoryStick className="w-4 h-4 mr-2" />
                Memory Visualization
              </DropdownMenuCheckboxItem>
              */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Theme toggle — always visible */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-2 ml-1"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
        </Button>

        {/* Share + Settings */}
        <div className="hidden lg:flex items-center gap-1.5 ml-2 pl-2 border-l border-zinc-700">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-2"
            title="Share"
            aria-label="Share JS Visualizer"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
          </Button>

          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-2"
                title="Settings"
                aria-label="Open settings"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-w-[95vw] bg-zinc-900 border-zinc-700 p-0 overflow-hidden max-h-[90vh]">
              <DialogHeader className="px-6 pt-5 pb-3 border-b border-zinc-800 flex-shrink-0">
                <DialogTitle className="text-white">Settings</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Manage examples, export and import your configuration
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="examples" className="flex flex-col flex-1 min-h-0">
                <TabsList className="mx-6 mt-4 mb-0 bg-zinc-800 w-fit flex-shrink-0">
                  <TabsTrigger
                    value="examples"
                    className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
                  >
                    Examples Control
                  </TabsTrigger>
                  <TabsTrigger
                    value="export"
                    className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
                  >
                    Export / Import
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="examples" className="mt-4 px-4 pb-4 flex-1 min-h-0 overflow-auto">
                  <ExamplesControlPanel />
                </TabsContent>

                <TabsContent value="export" className="mt-4 px-6 pb-6 flex-shrink-0">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button onClick={handleExport} className="flex-1 bg-zinc-800 hover:bg-zinc-700">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <Button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.json';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setImportData(ev.target?.result as string);
                              };
                              reader.readAsText(file);
                            }
                          };
                          input.click();
                        }}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Import File
                      </Button>
                    </div>
                    {importData && (
                      <div className="space-y-2">
                        <Label className="text-zinc-300">Import Data</Label>
                        <div className="p-2 bg-zinc-800 rounded text-xs text-zinc-400 max-h-24 overflow-auto">
                          {importData.slice(0, 200)}...
                        </div>
                        <Button onClick={handleImport} className="w-full bg-emerald-600 hover:bg-emerald-700">
                          Apply Import
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Breakpoint indicator */}
        {breakpoints.length > 0 && (
          <Badge variant="outline" className="hidden lg:flex border-red-500/50 text-red-400 px-2">
            <CircleDot className="w-3 h-3 mr-1" />
            {breakpoints.length} BP
          </Badge>
        )}

        <div className="flex items-center gap-2 sm:gap-3 sm:ml-3 sm:pl-3 sm:border-l border-zinc-700">
          <span className="text-xs text-zinc-500 whitespace-nowrap">
            {speed}ms
          </span>
          <Slider
            value={[speed]}
            onValueChange={([value]) => setSpeed(value)}
            min={100}
            max={2000}
            step={100}
            className="w-16 sm:w-20"
            data-testid="slider-speed"
          />
        </div>
      </div>
    </header>
  );
}
