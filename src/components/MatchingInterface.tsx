
import { useState, useEffect } from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import HeaderRow from './HeaderRow';
import { 
  generateHeaderMapping, 
  createMappingResult, 
  findMatchingUniqueKeys 
} from '@/utils/matchingUtils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { KeySquare, Info } from "lucide-react";

interface MatchingInterfaceProps {
  sourceData: {
    headers: string[];
    data: string[][];
    fileName: string;
    headerRowIndex: number;
  };
  targetData: {
    headers: string[];
    data: string[][];
    fileName: string;
    headerRowIndex: number;
  };
  onReset: () => void;
}

interface UniqueKeyMatch {
  sourceHeader: string;
  targetHeader: string;
  confidence: number;
  matchingValues: number;
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
  const [uniqueKeyMatches, setUniqueKeyMatches] = useState<UniqueKeyMatch[]>([]);
  const [selectedUniqueKeyMatch, setSelectedUniqueKeyMatch] = useState<UniqueKeyMatch | null>(null);

  // Initialize mapping and detect unique keys when component mounts
  useEffect(() => {
    detectUniqueKeys();
    updateMapping(thresholdValue, maxSuggestions);
  }, [sourceData, targetData]);

  // Detect potential unique key matches between the two files
  const detectUniqueKeys = () => {
    const keyMatches = findMatchingUniqueKeys(
      sourceData.headers,
      sourceData.data,
      targetData.headers,
      targetData.data
    );

    setUniqueKeyMatches(keyMatches);
    
    // Auto-select the highest confidence match if available
    if (keyMatches.length > 0) {
      setSelectedUniqueKeyMatch(keyMatches[0]);
      toast.success(`Found potential unique key match: ${keyMatches[0].sourceHeader} → ${keyMatches[0].targetHeader} (${keyMatches[0].confidence}% confident)`);
    }
  };

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

  const selectUniqueKeyMatch = (match: UniqueKeyMatch) => {
    setSelectedUniqueKeyMatch(match);
    toast.info(`Selected unique key match: ${match.sourceHeader} → ${match.targetHeader}`);
    
    // Update the mapping to reflect this unique key match
    const updatedMapping = [...mapping];
    const sourceHeaderIndex = sourceData.headers.indexOf(match.sourceHeader);
    if (sourceHeaderIndex !== -1 && sourceHeaderIndex < updatedMapping.length) {
      updatedMapping[sourceHeaderIndex].selectedMatch = match.targetHeader;
      setMapping(updatedMapping);
    }
  };

  const generateOutput = () => {
    const result = createMappingResult(mapping);
    
    // Add unique key information to the output
    const outputWithMetadata = {
      mapping: result,
      metadata: {
        uniqueKey: selectedUniqueKeyMatch ? {
          source: selectedUniqueKeyMatch.sourceHeader,
          target: selectedUniqueKeyMatch.targetHeader,
          confidence: selectedUniqueKeyMatch.confidence
        } : null,
        sourceHeaderRow: sourceData.headerRowIndex,
        targetHeaderRow: targetData.headerRowIndex
      }
    };
    
    setJsonOutput(JSON.stringify(outputWithMetadata, null, 2));
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

  const isUniqueKey = (header: string): boolean => {
    return selectedUniqueKeyMatch?.sourceHeader === header;
  };

  const getPotentialMatchForHeader = (header: string): string | undefined => {
    if (isUniqueKey(header) && selectedUniqueKeyMatch) {
      return selectedUniqueKeyMatch.targetHeader;
    }
    return undefined;
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

        {/* CSV Structure Information */}
        {(sourceData.headerRowIndex > 0 || targetData.headerRowIndex > 0) && (
          <div className="mb-6 p-4 border rounded-md bg-amber-50">
            <div className="flex items-center gap-2 text-amber-800">
              <Info size={16} />
              <p className="text-sm">
                Multiple tables detected in CSV file(s). Headers found at:
                {sourceData.headerRowIndex > 0 && (
                  <span className="font-medium"> Source: row {sourceData.headerRowIndex + 1}</span>
                )}
                {targetData.headerRowIndex > 0 && (
                  <span className="font-medium"> Target: row {targetData.headerRowIndex + 1}</span>
                )}
              </p>
            </div>
          </div>
        )}

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

        {/* Unique Key Match Section */}
        {uniqueKeyMatches.length > 0 && (
          <div className="mb-6 p-4 border rounded-md bg-blue-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-medium flex items-center">
                  <KeySquare className="h-4 w-4 mr-1" /> Potential Unique Key Matches
                </h3>
                {selectedUniqueKeyMatch && (
                  <p className="text-sm mt-1">
                    Selected: <strong>{selectedUniqueKeyMatch.sourceHeader}</strong> → <strong>{selectedUniqueKeyMatch.targetHeader}</strong> 
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {selectedUniqueKeyMatch.confidence}% confident
                    </span>
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="whitespace-nowrap">
                    <KeySquare className="h-4 w-4 mr-1" /> Choose Key Match
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {uniqueKeyMatches.map((match, index) => (
                    <DropdownMenuItem 
                      key={index} 
                      onClick={() => selectUniqueKeyMatch(match)}
                      className={selectedUniqueKeyMatch?.sourceHeader === match.sourceHeader && 
                                selectedUniqueKeyMatch?.targetHeader === match.targetHeader ? "bg-blue-50" : ""}
                    >
                      {match.sourceHeader} → {match.targetHeader} ({match.confidence}%)
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

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
                  isUniqueKey={isUniqueKey(item.sourceHeader)}
                  potentialUniqueKeyMatch={getPotentialMatchForHeader(item.sourceHeader)}
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
