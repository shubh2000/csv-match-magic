
import { useState, useEffect } from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import HeaderRow from './HeaderRow';
import { generateHeaderMapping, createMappingResult } from '@/utils/matchingUtils';

interface MatchingInterfaceProps {
  sourceData: {
    headers: string[];
    data: string[][];
    fileName: string;
  };
  targetData: {
    headers: string[];
    data: string[][];
    fileName: string;
  };
  onReset: () => void;
}

const MatchingInterface = ({
  sourceData,
  targetData,
  onReset
}: MatchingInterfaceProps) => {
  const [thresholdValue, setThresholdValue] = useState<number>(50);
  const [maxSuggestions, setMaxSuggestions] = useState<number>(3);
  const [mapping, setMapping] = useState<Array<{
    sourceHeader: string;
    suggestions: Array<{ header: string; similarity: number }>;
    selectedMatch: string | null;
  }>>([]);
  const [jsonOutput, setJsonOutput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>("mapping");

  // Initialize mapping when component mounts
  useEffect(() => {
    updateMapping(thresholdValue, maxSuggestions);
  }, [sourceData, targetData]);

  // Update mapping when threshold or max suggestions change
  const updateMapping = (threshold: number, max: number) => {
    const newMapping = generateHeaderMapping(
      sourceData.headers,
      targetData.headers,
      threshold,
      max
    );
    setMapping(newMapping);
  };

  const handleThresholdChange = (value: number[]) => {
    const threshold = value[0];
    setThresholdValue(threshold);
    updateMapping(threshold, maxSuggestions);
  };

  const handleMaxSuggestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 1;
    const max = Math.max(1, Math.min(10, value));
    setMaxSuggestions(max);
    updateMapping(thresholdValue, max);
  };

  const handleMatchSelected = (index: number, selectedHeader: string | null) => {
    const updatedMapping = [...mapping];
    updatedMapping[index].selectedMatch = selectedHeader;
    setMapping(updatedMapping);
  };

  const generateOutput = () => {
    const result = createMappingResult(mapping);
    setJsonOutput(JSON.stringify(result, null, 2));
    setActiveTab("output");
    toast.success("Mapping generated successfully!");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonOutput);
    toast.success("Copied to clipboard!");
  };

  const downloadJson = () => {
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'header_mapping.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("JSON file downloaded!");
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Header Matching</h2>
            <p className="text-sm text-muted-foreground">
              {sourceData.fileName} → {targetData.fileName}
            </p>
          </div>
          <Button variant="outline" onClick={onReset} className="mt-2 md:mt-0">
            Start Over
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Threshold Control */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">
                Similarity Threshold: {thresholdValue}%
              </label>
            </div>
            <Slider
              value={[thresholdValue]}
              min={0}
              max={100}
              step={5}
              onValueChange={handleThresholdChange}
              className="py-4"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Adjust to control how strict the matching should be
            </p>
          </div>
          
          {/* Max Suggestions Control */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Max Suggestions Per Header
            </label>
            <Input
              type="number"
              value={maxSuggestions}
              onChange={handleMaxSuggestionsChange}
              min={1}
              max={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum number of suggestions to show (1-10)
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="mapping">Header Mapping</TabsTrigger>
            <TabsTrigger value="output">JSON Output</TabsTrigger>
          </TabsList>
          
          {/* Mapping tab */}
          <TabsContent value="mapping" className="border rounded-md mt-4">
            <div className="max-h-[400px] overflow-y-auto">
              <div className="bg-muted p-3 sticky top-0 border-b">
                <div className="flex items-center font-semibold">
                  <div className="md:w-1/4">Source Header</div>
                  <div className="md:w-1/3">Suggestions</div>
                  <div className="md:w-1/3">Target Header</div>
                </div>
              </div>
              
              {mapping.map((item, index) => (
                <HeaderRow
                  key={item.sourceHeader}
                  sourceHeader={item.sourceHeader}
                  suggestions={item.suggestions}
                  targetHeaders={targetData.headers}
                  selectedMatch={item.selectedMatch}
                  onMatchSelected={(match) => handleMatchSelected(index, match)}
                />
              ))}
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={generateOutput}
                className="bg-gradient-header hover:bg-csv-blue-dark text-white"
              >
                Generate Mapping
              </Button>
            </div>
          </TabsContent>

          {/* Output tab */}
          <TabsContent value="output" className="mt-4">
            <div className="border rounded-md bg-gray-50 p-4">
              <pre className="text-sm overflow-x-auto max-h-[400px]">
                {jsonOutput || "Generate mapping first to see output"}
              </pre>
            </div>
            
            {jsonOutput && (
              <div className="mt-4 flex gap-3 justify-center">
                <Button onClick={copyToClipboard} variant="outline">
                  Copy to Clipboard
                </Button>
                <Button onClick={downloadJson}>
                  Download JSON
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default MatchingInterface;
